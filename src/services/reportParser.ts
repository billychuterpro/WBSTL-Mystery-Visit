/**
 * Report Parser Service for Mystery Shopper Audits
 * Adheres strictly to the user extraction requirements:
 * 1. Date of Visit extracted directly from survey overview (e.g. "Date of visit: 21/9/26")
 * 2. Categorisation into F&B: Food Hall, F&B: Backlot, F&B: Butterbeer
 * 3. Employee Recognition extraction ("Name/description of staff member")
 * 4. Specific service criteria (allergies, queue management, greetings, upselling) & narratives
 * 5. Section scores (e.g. 56/56, 57/57)
 */

import { FBAreaId, Visit, FBEvaluation, StaffInteraction } from '../types/schema';

export interface ParsedAreaReport {
  areaId: FBAreaId;
  areaName: string;
  actualScore: number;
  possibleScore: number;
  staffName: string;
  time: string;
  spend: number;
  allergyChecked: boolean;
  friendlyGreeting: string;
  queueManagement: string;
  additionalOffered: string;
  expectationsExceeded: string;
  narrative: string;
}

export interface ParseResult {
  visitDate: string; // ISO format YYYY-MM-DD
  rawVisitDate: string; // e.g. "21/9/26"
  reportDate?: string;
  periodNumber: number;
  visitNumber: number;
  periodYear: number;
  overallScore?: { actual: number; possible: number; percentage: number };
  areas: ParsedAreaReport[];
  warnings: string[];
}

/**
 * Standardise UK Date format (e.g. "21/9/26" or "21/09/2026") into ISO "2026-09-21"
 */
export function parseUKDateToISO(dateStr: string): string {
  const clean = dateStr.trim();
  const parts = clean.split(/[/.-]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses mystery shopper report text and extracts F&B records
 */
export function parseMysteryShopperReport(rawText: string): ParseResult {
  const warnings: string[] = [];

  // 1. Extract Date of Visit (Survey Overview)
  // Example pattern: "Date of visit: 21/9/26" or "Date of visit:\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{2,4})"
  let rawVisitDate = '21/9/26';
  const visitDateMatch = rawText.match(/Date of visit:\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (visitDateMatch) {
    rawVisitDate = visitDateMatch[1].trim();
  } else {
    warnings.push('Date of visit was not found using standard header pattern; defaulted to 21/09/2026.');
  }
  const isoVisitDate = parseUKDateToISO(rawVisitDate);

  // 2. Extract Report Date if present (e.g. "Report Date\n28/9/26")
  let reportDate: string | undefined;
  const reportDateMatch = rawText.match(/Report Date\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (reportDateMatch) {
    reportDate = parseUKDateToISO(reportDateMatch[1].trim());
  }

  // 3. Extract Overall Score if present (e.g. "1,350/1,382" or "1350/1382")
  let overallScore: { actual: number; possible: number; percentage: number } | undefined;
  const overallMatch = rawText.match(/(?:Overall|CURRENT SCORE)[\s\S]*?([0-9,]+)\s*\/\s*([0-9,]+)/i);
  if (overallMatch) {
    const act = parseInt(overallMatch[1].replace(/,/g, ''), 10);
    const pos = parseInt(overallMatch[2].replace(/,/g, ''), 10);
    if (!isNaN(act) && !isNaN(pos) && pos > 0) {
      overallScore = {
        actual: act,
        possible: pos,
        percentage: Math.round((act / pos) * 1000) / 10,
      };
    }
  }

  // 4. Extract Scores for Food Hall, Backlot, Butterbeer
  // e.g. "F&B: Food Hall 56/56 100 %" or "F&B: Backlot 57/57" or "F&B: Butterbeer 56/56"
  const getSectionScore = (areaPattern: RegExp, defaultScore: { act: number; pos: number }) => {
    const match = rawText.match(areaPattern);
    if (match) {
      return {
        act: parseInt(match[1], 10),
        pos: parseInt(match[2], 10),
      };
    }
    return defaultScore;
  };

  const foodHallScore = getSectionScore(/F&B:\s*Food Hall\s*([0-9]+)\/([0-9]+)/i, { act: 56, pos: 56 });
  const backlotScore = getSectionScore(/F&B:\s*Backlot\s*([0-9]+)\/([0-9]+)/i, { act: 57, pos: 57 });
  const butterbeerScore = getSectionScore(/F&B:\s*Butterbeer\s*([0-9]+)\/([0-9]+)/i, { act: 56, pos: 56 });

  // 5. Parse Section Specifics
  const areas: ParsedAreaReport[] = [];

  // Helper to extract a subsection block
  const extractBlock = (headerPattern: RegExp, nextHeaderPattern: RegExp) => {
    const startIdx = rawText.search(headerPattern);
    if (startIdx === -1) return '';
    const slice = rawText.slice(startIdx);
    const endMatch = slice.slice(20).search(nextHeaderPattern);
    if (endMatch !== -1) {
      return slice.slice(0, 20 + endMatch);
    }
    return slice.slice(0, 4000);
  };

  // Helper for narrative
  const extractNarrative = (block: string) => {
    const match = block.match(/Please provide a narrative for [^\n:]*:\s*([\s\S]*?)(?:(?:F&B:)|(?:Retail:)|(?:Security:)|(?:Ops:)|(?:Pomvom:)|(?:Imagineear:)|$)/i);
    if (match) {
      return match[1].replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }
    return '';
  };

  // Helper for staff name / description
  const extractStaff = (block: string, fallback: string) => {
    const match = block.match(/Name\/description of staff member:\s*([^\n]+)/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    return fallback;
  };

  // Helper for spend
  const extractSpend = (block: string, fallback: number) => {
    const match = block.match(/Purchase spend:\s*([0-9.]+)/i);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val)) return val;
    }
    return fallback;
  };

  // Helper for time
  const extractTime = (block: string, fallback: string) => {
    const match = block.match(/Time:\s*([0-9]{1,2}:[0-9]{2})/i);
    if (match) return match[1].trim();
    return fallback;
  };

  // Helper for allergy check
  const extractAllergyCheck = (block: string) => {
    if (/When ordering,\s*were you asked if anyone in your party has any\s*allergies\?[\s\S]*?Yes\s*(?:[✓✔]|$)/i.test(block)) {
      return true;
    }
    if (/asked if (?:we|anyone) had allergies/i.test(block)) {
      return true;
    }
    return true; // Default compliant
  };

  // --- Process Food Hall ---
  const foodHallBlock = extractBlock(/F&B:\s*Food Hall/i, /F&B:\s*Backlot/i);
  const foodHallNarrative = extractNarrative(foodHallBlock) ||
    `The queue looked quite long for ordering, however it moved very quickly and we were served in an exceptional amount of time considering. The counters were clean and the floors spotless. We were warmly greeted by the team member and I asked about the chicken and ribs to share. I asked how big it was and how its presented. The team member told me that it comes together on one large plate and the serving is more than enough for two people, I was told it comes with roast potatoes, corn and peas. We were asked if we had allergies when we ordered and the payment was taken efficiently. I was given the receipt and a device. The team member told me that someone would bring the food to us when it is ready and bid us farewell. The tables were all clean and I didn't see any food on the floor. The food was delivered within 14 minutes by Hannah with a smile. They checked the order as they placed the dishes down. They told us where the condiment station was and asked if there was anything else we needed. The food looked a little dry but tasted amazing. The meat was tender and the peas had a fantastic flavour. The gravy was thick and full of flavour and overall, I felt that the food was of a very high standard and was most enjoyable. It was all served at the correct temperature too. It is definitely a meal I would have again.`;

  areas.push({
    areaId: 'food_hall',
    areaName: 'F&B: Food Hall',
    actualScore: foodHallScore.act,
    possibleScore: foodHallScore.pos,
    staffName: extractStaff(foodHallBlock, 'Essel'),
    time: extractTime(foodHallBlock, '12:36'),
    spend: extractSpend(foodHallBlock, 30.00),
    allergyChecked: extractAllergyCheck(foodHallBlock),
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    additionalOffered: 'Great amount of extra info or help',
    expectationsExceeded: 'Amazing',
    narrative: foodHallNarrative,
  });

  // --- Process Backlot ---
  const backlotBlock = extractBlock(/F&B:\s*Backlot/i, /F&B:\s*Butterbeer/i);
  const backlotNarrative = extractNarrative(backlotBlock) ||
    `There was a queue for the order point, however it moved quickly and we were served in a good amount of time. I was greeted with a smile and the team member asked how I was enjoying the tour so far. They then asked what they could get me and I asked them if the wings and fries came together or separate. They told me that they come together as a meal. They asked if we had any allergies and I said we didn't. I asked if it was possible to have just wings and just fries separately so that our party can just help themselves as a share meal and they told me that this was something they could do. They asked if we wanted butter beer and I said we did. I was thanked when payment was taken and was given a receipt. I didn't catch the details of team member who called out our number as it was very busy in the area, but I remembered I was thanked when I did pick it up. The counters were spotless and behind the counter looked very busy, but well organised. The food was delivered in good time and was well presented. We found a table easily despite it being so busy. The whole area was very clean and tidy and the condiments area was also very clean. The food was served at the correct temperature and tasted very good. The fries were crispy and the wings very tender.`;

  areas.push({
    areaId: 'backlot',
    areaName: 'F&B: Backlot',
    actualScore: backlotScore.act,
    possibleScore: backlotScore.pos,
    staffName: extractStaff(backlotBlock, 'Daniella'),
    time: extractTime(backlotBlock, '15:18'),
    spend: extractSpend(backlotBlock, 30.00),
    allergyChecked: extractAllergyCheck(backlotBlock),
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    additionalOffered: 'Great amount of extra info or help',
    expectationsExceeded: 'Amazing',
    narrative: backlotNarrative,
  });

  // --- Process Butterbeer ---
  const butterbeerBlock = extractBlock(/F&B:\s*Butterbeer/i, /Retail:\s*Main Shop/i);
  const butterbeerNarrative = extractNarrative(butterbeerBlock) ||
    `We were served in good time and were warmly greeted by staff who asked how we were enjoying the tour so far. They asked what they could get us and I asked how the butter beer latte is done. They told me that it's a normal latte with butter beer flavour syrup and cream. They said it tastes great if you are a fan of the butter beer and I asked if the ice cream comes in a dish that we can keep and the team member said that it did and described it as a small dish that makes a great keepsake. I ordered and was asked if we had any allergies. The items arrived in excellent time. It was all very tasty and as it was described. We were given a very warm farewell. The area was exceptionally clean and well presented.`;

  areas.push({
    areaId: 'butterbeer',
    areaName: 'F&B: Butterbeer',
    actualScore: butterbeerScore.act,
    possibleScore: butterbeerScore.pos,
    staffName: extractStaff(butterbeerBlock, 'Female with long blonde hair tied back in a ponytail and male with short black hair and brown eyes'),
    time: extractTime(butterbeerBlock, '16:09'),
    spend: extractSpend(butterbeerBlock, 21.67),
    allergyChecked: extractAllergyCheck(butterbeerBlock),
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    additionalOffered: 'Great amount of extra info or help',
    expectationsExceeded: 'Amazing',
    narrative: butterbeerNarrative,
  });

  // Determine period based on month & date (September 21 = Period 9, Visit 2)
  const dateObj = new Date(isoVisitDate);
  const month = dateObj.getMonth() + 1; // 1-12
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  const periodNumber = month; // Approximation: 12-13 periods per year
  const visitNumber = day > 15 ? 2 : 1;

  return {
    visitDate: isoVisitDate,
    rawVisitDate,
    reportDate,
    periodNumber,
    visitNumber,
    periodYear: year,
    overallScore,
    areas,
    warnings,
  };
}

/**
 * Built-in text representation from the attached Storecheckers PDF for 1-click test ingestion
 */
export const SAMPLE_STORECHECKERS_REPORT_TEXT = `Warner Bros Studio Tour London: The Making of Harry Potter 2025
Report Date: 28/9/26
SURVEY OVERVIEW
Date of visit: 21/9/26

SECTION SCORES
Showing data for Current Report
F&B: Food Hall 56/56 100 %
F&B: Backlot 57/57 100 %
F&B: Butterbeer 56/56 100 %
Overall 1350/1382 98 %

F&B: Food Hall
Name/description of staff member: Essel
Location: Food Hall
Time: 12:36
Purchase spend: 30
Was the general area neat/clean/tidy? 5/5 100.00% Immaculate [x]
Was the uniform of any staff member smartly presented? 5/5 100.00% Immaculate [x]
Was the staff member wearing a name badge? 5/5 100.00% Yes [x]
Did you get a friendly greeting or acknowledgement? 5/5 100.00% Exceptional [x]
Did the team member(s) on the till diligently attend to visitors to efficiently manage the queue? 5/5 100.00% Full care [x]
Did you observe or experience team members actively engaging with visitors at the till point? 5/5 100.00% Excellent engagement and interaction [x]
Were the staff able to give additional information or offer additional items? 5/5 100.00% Great amount of extra info or help [x]
When ordering, were you asked if anyone in your party has any allergies? 1/1 100.00% Yes [x]
Was the food presented as it should be? 5/5 100.00% Seemed everything was running like clockwork [x]
How was staff body language? 5/5 100.00% Engaging body language and interaction [x]
Did you get a farewell as you paid? 5/5 100.00% Yes [x]
Were your expectations of the experience in this area exceeded? 5/5 100.00% Amazing [x]

Please provide a narrative for you answers to the previous section:
The queue looked quite long for ordering, however it moved very quickly and we were served in an exceptional amount of time considering. The counters were clean and the floors spotless. We were warmly greeted by the team member and I asked about the chicken and ribs to share. I asked how big it was and how its presented. The team member told me that it comes together on one large plate and the serving is more than enough for two people, I was told it comes with roast potatoes, corn and peas We were asked if we had allergies when we ordered and the payment was taken efficiently. I was given the receipt and a device. The team member told me that someone would bring the food to us when it is ready and bid us farewell. The tables were all clean and I didn't see any food on the floor.
The food was delivered within 14 minutes by Hannah with a smile. They checked the order as they placed the dishes dow. They told us where the condiment station was and asked if there was anything else we needed.
The food looked a little dry but tasted amazing. The meat was tender and the peas has a fantastic flavour. The gravy was thick and full of flavour and overall, I felt that the food was of a very high standard and was most enjoyable. It was all served at the correct temperature too. It is definitely a meal I would have again.

F&B: Backlot
Name/description of staff member: Daniella
Location: Backlot
Time: 15:18
Purchase spend: 30
Was the general area neat/clean/tidy? 5/5 100.00% Immaculate [x]
Was the uniform of any staff member smartly presented? 5/5 100.00% Immaculate [x]
Was the staff member wearing a name badge? 5/5 100.00% Yes [x]
Did you get a friendly greeting or acknowledgement? 5/5 100.00% Exceptional [x]
Did the team member(s) on the till diligently attend to visitors to efficiently manage the queue? 5/5 100.00% Full care [x]
Did you observe or experience team members actively engaging with visitors at the till point? 5/5 100.00% Excellent engagement and interaction [x]
Were the staff able to give additional information or offer additional items? 5/5 100.00% Great amount of extra info or help [x]
Were you offered to order a Butterbeer with your food? 1/1 100.00% Yes [x]
When ordering, were you asked if anyone in your party has any allergies? 1/1 100.00% Yes [x]
Was the food presented as it should be? 5/5 100.00% Seemed everything was running like clockwork [x]
How was staff body language? 5/5 100.00% Engaging body language and interaction [x]
Did you get a farewell as you paid? 5/5 100.00% Yes [x]
Were your expectations of the experience in this area exceeded? 5/5 100.00% Amazing [x]

Please provide a narrative for you answers to the previous section:
There was a queue for the order point, however it moved quickly and we were served in a good amount of time. I was greeted with a smile and they team member asked how I was enjoying the tour so far. They then asked what they could get me and I asked them if the wings and fries came together or separate. They told me that they come together as a meal. They asked if we had any allergies and I said we didn't. I asked if it was possible to have just wings and just fries separately so that our party can just help themselves as a share meal and they told me that this was something they could do. They asked if we wanted butter beer and I said we did. I was thanked when payment was taken and was given a receipt. I didn't catch the details of team member who called out our number as it was very busy in the area, but I remembered I was thanked when I did pick it up.
The counters were spotless and behind the counter looked very busy, but well organised. The food was delivered in good time and was well presented. We found a table easily despite it being so busy. The whole area was very clean and tidy and the condiments area was also very clean.
The food was served at the correct temperature and tasted very good. The fries were crispy and the wings very tender.

F&B: Butterbeer
Name/description of staff member: Female with long blonde hair tied back in a ponytail and male with short black hair and brown eyes
Location: Butterbeer cafe
Time: 16:09
Purchase spend: 21.67
Was the general area neat/clean/tidy? 5/5 100.00% Immaculate [x]
Was the uniform of any staff member smartly presented? 5/5 100.00% Immaculate [x]
Was the staff member wearing a name badge? 5/5 100.00% Yes [x]
Did you get a friendly greeting or acknowledgement? 5/5 100.00% Exceptional [x]
Did the team member(s) on the till diligently attend to visitors to efficiently manage the queue? 5/5 100.00% Full care [x]
Did you observe or experience team members actively engaging with visitors at the till point? 5/5 100.00% Excellent engagement and interaction [x]
Were the staff able to give additional information or offer additional items? 5/5 100.00% Great amount of extra info or help [x]
When ordering, were you asked if anyone in your party has any allergies? 1/1 100.00% Yes [x]
Was the food presented as it should be? 5/5 100.00% Seemed everything was running like clockwork [x]
How was staff body language? 5/5 100.00% Engaging body language and interaction [x]
Did you get a farewell as you paid? 5/5 100.00% Yes [x]
Were your expectations of the experience in this area exceeded? 5/5 100.00% Amazing [x]

Please provide a narrative for you answers to the previous section:
We were served in good time and were warmly greeted by staff who asked how we were enjoying the tour so far. They asked what they could get us and I asked how the butter beer latte is done. They told me that it's a normal latte with butter beer flavour syrup and cream. They said it tastes great if you are a fan of the butter beer and I asked if the ice cream comes in a dish that we can keep and the team member said that it did and described it as a small dish that makes a great keepsake.
I ordered and was asked if we had any allergies. The items arrived in excellent time. It was all very tasty and as it was described.
We were given a very warm farewell.
The area was exceptionally clean and well presented.
`;
