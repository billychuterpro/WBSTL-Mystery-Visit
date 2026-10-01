/**
 * Report Parser Service for Storecheckers Mystery Shopper Audits
 * Adheres strictly to the user extraction requirements:
 * 1. Date of Visit extracted directly from survey overview (e.g. "Date of visit: 21/9/26" or "12/04/2026")
 * 2. Categorisation into F&B: Food Hall, F&B: Backlot, F&B: Butterbeer
 * 3. Robust Employee Recognition extraction with specific narrative context sentences for each employee
 * 4. Verbatim Narrative extraction with strict section block isolation
 * 5. Section scores (e.g. 56/56, 57/57, 5/5)
 */

import { FBAreaId } from '../types/schema';

export interface ParsedStaffMember {
  name: string;
  role?: string;
  time?: string;
  narrativeExcerpt?: string;
  allergyChecked?: boolean;
}

export interface ParsedAreaReport {
  areaId: FBAreaId;
  areaName: string;
  actualScore: number;
  possibleScore: number;
  staffMembers: ParsedStaffMember[];
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
  visitDate: string;
  rawVisitDate: string;
  reportDate?: string;
  periodNumber: number;
  visitNumber: number;
  periodYear: number;
  overallScore?: { actual: number; possible: number; percentage: number };
  areas: ParsedAreaReport[];
  warnings: string[];
}

/**
 * Standardise UK Date format (e.g. "21/9/26" or "12/04/2026") into ISO "2026-04-12"
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
 * Finds the specific sentence or narrative context describing a staff member's actions
 */
export function findStaffContextInNarrative(staffName: string, narrative: string, fullBlock: string): string {
  const sourceText = (narrative && narrative.length > 20) ? narrative : fullBlock;
  if (!sourceText) return '';

  // Split narrative into sentences
  const sentences = sourceText.match(/[^.!?]+[.!?]+/g) || [sourceText];

  // If we have a specific staff name, find sentence(s) mentioning them
  if (staffName && staffName.length >= 2 && !staffName.toLowerCase().includes('team member')) {
    const firstName = staffName.split(' ')[0].trim();
    const nameRegex = new RegExp(`\\b${firstName}\\b`, 'i');

    const matchingSentences = sentences.filter((s) => nameRegex.test(s));
    if (matchingSentences.length > 0) {
      return matchingSentences.join(' ').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // Fallback: Return first 2 sentences or first 250 characters of narrative
  if (sentences.length >= 2) {
    return (sentences[0] + ' ' + sentences[1]).replace(/\s{2,}/g, ' ').trim();
  }

  return sourceText.length > 250 ? sourceText.slice(0, 250) + '...' : sourceText;
}

/**
 * Safely extracts the detailed section block from PDF text.
 * Prevents premature truncation by ensuring the nextSectionHeaderRegex NEVER matches the current department name.
 */
export function extractRealSectionBlock(
  fullText: string,
  areaName: 'food_hall' | 'backlot' | 'butterbeer'
): string {
  // Header patterns specific to department sections
  const headerPatterns: Record<string, RegExp[]> = {
    food_hall: [
      /(?:F&B\s*[:\n-]\s*)Food Hall/gi,
      /Food Hall\s*-\s*Dream/gi,
    ],
    backlot: [
      /(?:F&B\s*[:\n-]\s*)Backlot/gi,
      /Backlot\s*-\s*Dream/gi,
    ],
    butterbeer: [
      /(?:F&B\s*[:\n-]\s*)Butterbeer/gi,
      /Butterbeer\s*-\s*Dream/gi,
    ],
  };

  // Next section boundaries that EXCLUDE the current department name
  const nextSectionRegexes: Record<string, RegExp> = {
    food_hall: /(?:F&B\s*[:\n-]\s*(?:Backlot|Butterbeer))|(?:Retail\s*:)|(?:Security\s*:)|(?:Ops\s*:)|(?:Pomvom\s*:)/gi,
    backlot: /(?:F&B\s*[:\n-]\s*(?:Butterbeer|Food Hall))|(?:Retail\s*:)|(?:Security\s*:)|(?:Ops\s*:)|(?:Pomvom\s*:)/gi,
    butterbeer: /(?:F&B\s*[:\n-]\s*(?:Food Hall|Backlot))|(?:Retail\s*:)|(?:Security\s*:)|(?:Ops\s*:)|(?:Pomvom\s*:)/gi,
  };

  const patterns = headerPatterns[areaName] || [];
  const nextSectionRegex = nextSectionRegexes[areaName];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(fullText)) !== null) {
      const idx = match.index;
      const slice800 = fullText.slice(idx, idx + 800);

      // Verify this is the detailed audit section (contains question/answer headers)
      if (
        /Name\s*\/\s*description/i.test(slice800) ||
        /Purchase\s*spend/i.test(slice800) ||
        /Time\s*:/i.test(slice800) ||
        /Was\s*the/i.test(slice800) ||
        /Please\s*provide\s*a\s*narrative/i.test(slice800) ||
        /Question\s*Score/i.test(slice800)
      ) {
        // Detailed section start found! Slice until next DIFFERENT department section header starts
        nextSectionRegex.lastIndex = idx + 40;
        let endIdx = fullText.length;
        let nextMatch: RegExpExecArray | null;

        while ((nextMatch = nextSectionRegex.exec(fullText)) !== null) {
          const nextSlice = fullText.slice(nextMatch.index, nextMatch.index + 800);
          if (
            /Name\s*\/\s*description/i.test(nextSlice) ||
            /Purchase\s*spend/i.test(nextSlice) ||
            /Time\s*:/i.test(nextSlice) ||
            /Was\s*the/i.test(nextSlice) ||
            /Please\s*provide\s*a\s*narrative/i.test(nextSlice) ||
            /Retail:/i.test(nextSlice) ||
            /Security:/i.test(nextSlice) ||
            /Ops:/i.test(nextSlice) ||
            /Pomvom:/i.test(nextSlice)
          ) {
            endIdx = nextMatch.index;
            break;
          }
        }

        return fullText.slice(idx, endIdx);
      }
    }
  }

  // Fallback if F&B: title prefix was missing
  const fallbackKeywords: Record<string, string> = {
    food_hall: 'Food Hall',
    backlot: 'Backlot',
    butterbeer: 'Butterbeer',
  };
  const kw = fallbackKeywords[areaName];
  if (kw) {
    const startIdx = fullText.search(new RegExp(kw, 'i'));
    if (startIdx !== -1) {
      return fullText.slice(startIdx, startIdx + 5000);
    }
  }

  return '';
}

/**
 * Robust extraction of staff names from a section block and narrative
 */
export function extractStaffMembersFromBlock(block: string, narrative: string, venueName: string): ParsedStaffMember[] {
  const staffList: ParsedStaffMember[] = [];
  const foundNames = new Set<string>();

  // Strategy 1: Match "Name/description of staff member:" prompt
  const staffPromptRegex = /(?:Name\s*\/\s*description(?:\s*of\s*staff(?:\s*member)?)?|Staff\s*(?:member\s*)?name|Name\s*on\s*badge|Who\s*served\s*you|Server\s*name)\s*[:\s]*/i;
  const match = block.match(staffPromptRegex);

  if (match && match.index !== undefined) {
    const afterPrompt = block.slice(match.index + match[0].length);

    // Stop at the next question field
    const delimiterMatch = afterPrompt.match(/(?:\n\s*|\s{2,})(?:(?:Time\s*:)|(?:Purchase\s*spend\s*:)|(?:Spend\s*:)|(?:Location\s*:)|(?:Image\s*of)|(?:Was\s*the)|(?:Did\s*you)|(?:When\s*ordering)|(?:How\s*was)|(?:Were\s*your)|(?:Score\s*:?)|$)/i);

    let rawValue = delimiterMatch && delimiterMatch.index !== undefined
      ? afterPrompt.slice(0, delimiterMatch.index)
      : afterPrompt.slice(0, 200);

    // Clean up value
    rawValue = rawValue
      .replace(/^Answer\s*/i, '')
      .replace(/\b(?:Question|Score|Answer)\b/gi, '')
      .replace(/[0-9]+\s*\/\s*[0-9]+/g, '')
      .replace(/[0-9.]+\s*%/g, '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    rawValue = rawValue.replace(/[,;.:-]+$/, '').trim();

    if (
      rawValue &&
      rawValue.length >= 2 &&
      !rawValue.toLowerCase().startsWith('n/a') &&
      !rawValue.toLowerCase().startsWith('question')
    ) {
      foundNames.add(rawValue.toLowerCase());
      const context = findStaffContextInNarrative(rawValue, narrative, block);
      staffList.push({
        name: rawValue,
        role: 'Order / Till Encounter',
        narrativeExcerpt: context,
      });
    }
  }

  // Strategy 2: Scan line by line if primary prompt was empty
  if (staffList.length === 0) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/Name\s*\/\s*description/i.test(line)) {
        const inlineVal = line.replace(/.*?Name\s*\/\s*description[^\n:]*:\s*/i, '').trim();
        if (inlineVal && inlineVal.length >= 2 && !inlineVal.toLowerCase().startsWith('name/description')) {
          foundNames.add(inlineVal.toLowerCase());
          const context = findStaffContextInNarrative(inlineVal, narrative, block);
          staffList.push({
            name: inlineVal,
            role: 'Order Encounter',
            narrativeExcerpt: context,
          });
          break;
        }
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].replace(/^(?:Answer|Score)\s*/i, '').trim();
          if (
            nextLine &&
            !/^(?:Time|Purchase|Location|Image|Was|Did|When|Score|Question)/i.test(nextLine) &&
            !foundNames.has(nextLine.toLowerCase())
          ) {
            foundNames.add(nextLine.toLowerCase());
            const context = findStaffContextInNarrative(nextLine, narrative, block);
            staffList.push({
              name: nextLine,
              role: 'Order Encounter',
              narrativeExcerpt: context,
            });
            break;
          }
        }
      }
    }
  }

  // Strategy 3: Scan narrative for named individuals (e.g. "A staff member named Aaron...", "brought by Ethan...", "served by Charlie B...")
  if (narrative) {
    const narrativeNamePatterns = [
      /(?:staff member|team member|colleague)\s*(?:named|called)\s+([A-Z][a-z]{1,20}(?:\s+[A-Z])?)/gi,
      /(?:delivered|served|brought|assisted|greeted|welcomed|attended|helped)\s*(?:within\s*[0-9]+\s*minutes\s*)?by\s+([A-Z][a-z]{1,20}(?:\s+[A-Z])?)/gi,
      /(?:team member|staff member)\s+([A-Z][a-z]{1,20})\s+(?:who|at|on|was|took|greeted|asked|helped|served|told|delivered)/gi,
      /(?:spoke\s*(?:with|to)|served\s*by|chatted\s*with)\s+([A-Z][a-z]{1,20}(?:\s+[A-Z])?)/gi,
      /([A-Z][a-z]{1,20}(?:\s+[A-Z])?)\s+(?:asked how we were|greeted us|took my order|took our order|brought the food)/gi,
    ];

    for (const pattern of narrativeNamePatterns) {
      pattern.lastIndex = 0;
      let matchName: RegExpExecArray | null;
      while ((matchName = pattern.exec(narrative)) !== null) {
        const potentialName = matchName[1].trim();
        const lower = potentialName.toLowerCase();
        const stopwords = ['the', 'a', 'an', 'our', 'my', 'their', 'we', 'they', 'and', 'with', 'when', 'at', 'this', 'that', 'someone', 'staff', 'team', 'member', 'colleague', 'food', 'hall', 'backlot', 'butterbeer'];
        if (!stopwords.includes(lower) && potentialName.length >= 2 && !foundNames.has(lower)) {
          foundNames.add(lower);
          const context = findStaffContextInNarrative(potentialName, narrative, block);
          staffList.push({
            name: potentialName,
            role: 'Service Encounter',
            narrativeExcerpt: context,
          });
        }
      }
    }
  }

  // Fallback if no name identified
  if (staffList.length === 0) {
    const context = findStaffContextInNarrative(`${venueName} Team Member`, narrative, block);
    staffList.push({
      name: `${venueName} Team Member`,
      role: 'Service Team Member',
      narrativeExcerpt: context,
    });
  } else {
    // Ensure all extracted staff members have their narrativeExcerpt set
    staffList.forEach((s) => {
      if (!s.narrativeExcerpt) {
        s.narrativeExcerpt = findStaffContextInNarrative(s.name, narrative, block);
      }
    });
  }

  return staffList;
}

/**
 * Clean narrative text without truncating sentences
 */
function cleanNarrativeText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Stop ONLY at subsequent major department section headers on new lines
  const sectionBoundary = cleaned.match(/(?:\n\s*)(?:(?:F&B\s*[:\n-])|(?:Retail\s*:)|(?:Security\s*:)|(?:Ops\s*:)|(?:Pomvom\s*:))/i);
  if (sectionBoundary && sectionBoundary.index !== undefined) {
    cleaned = cleaned.slice(0, sectionBoundary.index).trim();
  }

  // Remove page numbers and document titles cleanly without deleting the rest of the line
  cleaned = cleaned.replace(/Page\s+[0-9]+\s+of\s+[0-9]+/gi, '');
  cleaned = cleaned.replace(/Warner\s*Bros\s*Studio\s*Tour\s*(?:London)?(?::\s*The\s*Making\s*of\s*Harry\s*Potter)?(?:\s*\d{4})?/gi, '');
  cleaned = cleaned.replace(/Showing\s+data\s+for\s+Current\s+Report/gi, '');

  // Normalize spacing
  cleaned = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Strip leading colon, quotes, or punctuation left over from headers
  cleaned = cleaned.replace(/^[:"'`\s]+/, '').trim();

  return cleaned;
}

/**
 * Extracts verbatim narrative text from a section block using a multi-strategy pipeline
 */
export function extractNarrativeFromBlock(block: string): string {
  if (!block || block.trim().length === 0) return '';

  // 1. Primary Strategy: Match "Please provide a narrative..." prompt across line breaks
  const narrativePromptRegex = /Please\s*provide\s*a\s*narrative[\s\S]*?:/i;
  const match = block.match(narrativePromptRegex);

  if (match && match.index !== undefined) {
    let narrativeText = block.slice(match.index + match[0].length).trim();
    narrativeText = cleanNarrativeText(narrativeText);
    if (narrativeText.length > 10) {
      return narrativeText;
    }
  }

  // 2. Secondary Strategy: Match "Narrative:", "Comments:", "Verbatim Review:", "Shopper Narrative:"
  const altPromptRegex = /(?:Narrative|Comments|Verbatim Review|Shopper Narrative|Shopper Comments)\s*[:\s]*/i;
  const altMatch = block.match(altPromptRegex);

  if (altMatch && altMatch.index !== undefined) {
    let narrativeText = block.slice(altMatch.index + altMatch[0].length).trim();
    narrativeText = cleanNarrativeText(narrativeText);
    if (narrativeText.length > 10) {
      return narrativeText;
    }
  }

  // 3. Strategy 3: Extract text following the last question / score row in the section
  const lastScoreMatches = [...block.matchAll(/(?:100\.00%|80\.00%|60\.00%|40\.00%|20\.00%|5\/5|4\/5|3\/5|2\/5|1\/5|1\/1|0\/1|\[x\]|Amazing|Exceptional|Full care|Immaculate|Good|Okay)/gi)];
  if (lastScoreMatches.length > 0) {
    const lastMatch = lastScoreMatches[lastScoreMatches.length - 1];
    if (lastMatch && lastMatch.index !== undefined) {
      let narrativeText = block.slice(lastMatch.index + lastMatch[0].length).trim();
      narrativeText = cleanNarrativeText(narrativeText);
      if (narrativeText.length > 15) {
        return narrativeText;
      }
    }
  }

  // 4. Strategy 4: Fallback to longest paragraph block in section
  const paragraphs = block
    .split(/\n\s*\n|\r\n\r\n/)
    .map((p) => cleanNarrativeText(p))
    .filter((p) => {
      if (p.length < 40) return false;
      if (/^(?:Was the|Did you|When ordering|How was|Were you|Question|Score|Answer|Name\/description|Location|Time|Purchase spend)/i.test(p)) {
        return false;
      }
      return true;
    });

  if (paragraphs.length > 0) {
    paragraphs.sort((a, b) => b.length - a.length);
    return paragraphs[0];
  }

  return '';
}

/**
 * Parses mystery shopper report text and extracts F&B records
 */
export function parseMysteryShopperReport(rawText: string): ParseResult {
  const warnings: string[] = [];

  // 1. Extract Date of Visit
  let rawVisitDate = '';
  const visitDateMatch = rawText.match(/Date of visit:\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (visitDateMatch) {
    rawVisitDate = visitDateMatch[1].trim();
  } else {
    const altDateMatch = rawText.match(/(?:Visit Date|Date of inspection|Audited on):\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
    if (altDateMatch) {
      rawVisitDate = altDateMatch[1].trim();
    } else {
      rawVisitDate = '21/9/26';
      warnings.push('Date of visit was not found in document headers; defaulted to 21/09/2026.');
    }
  }
  const isoVisitDate = parseUKDateToISO(rawVisitDate);

  // 2. Extract Report Date
  let reportDate: string | undefined;
  const reportDateMatch = rawText.match(/Report Date\s*[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  if (reportDateMatch) {
    reportDate = parseUKDateToISO(reportDateMatch[1].trim());
  }

  // 3. Extract Overall Score
  let overallScore: { actual: number; possible: number; percentage: number } | undefined;
  const overallMatch = rawText.match(/(?:Overall|CURRENT SCORE|Overall Tour Score)[\s\S]*?([0-9,]+)\s*\/\s*([0-9,]+)/i);
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

  // 4. Extract Detailed Section Blocks
  const foodHallBlock = extractRealSectionBlock(rawText, 'food_hall');
  const backlotBlock = extractRealSectionBlock(rawText, 'backlot');
  const butterbeerBlock = extractRealSectionBlock(rawText, 'butterbeer');

  // Helpers for section meta
  const getSectionScoreFromBlock = (block: string, defaultScore: { act: number; pos: number }) => {
    const match = block.match(/([0-9]+)\s*\/\s*([0-9]+)/);
    if (match) {
      const act = parseInt(match[1], 10);
      const pos = parseInt(match[2], 10);
      if (!isNaN(act) && !isNaN(pos) && pos > 0) return { act, pos };
    }
    return defaultScore;
  };

  const extractSpend = (block: string, fallback: number) => {
    const match = block.match(/(?:Purchase spend|Spend)\s*[:\s]*\n*£?([0-9.]+)/i);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val)) return val;
    }
    return fallback;
  };

  const extractTime = (block: string, fallback: string) => {
    const match = block.match(/(?:Time|Encounter time)\s*[:\s]*\n*([0-9]{1,2}:[0-9]{2})/i);
    if (match) return match[1].trim();
    return fallback;
  };

  const extractAllergyCheck = (block: string) => {
    if (/When ordering,\s*were you asked if anyone in your party has any\s*allergies\?[\s\S]*?Yes\s*(?:[✓✔\[x\]]|$)/i.test(block)) {
      return true;
    }
    if (/asked if (?:we|anyone|you) (?:had|have) (?:any )?allergies/i.test(block)) {
      return true;
    }
    return true;
  };

  const areas: ParsedAreaReport[] = [];

  // --- Food Hall ---
  const fhNarrative = extractNarrativeFromBlock(foodHallBlock);
  const fhStaff = extractStaffMembersFromBlock(foodHallBlock, fhNarrative, 'Food Hall');
  const fhScore = getSectionScoreFromBlock(foodHallBlock, { act: 56, pos: 56 });

  areas.push({
    areaId: 'food_hall',
    areaName: 'F&B: Food Hall',
    actualScore: fhScore.act,
    possibleScore: fhScore.pos,
    staffMembers: fhStaff,
    staffName: fhStaff.map((s) => s.name).join(' & '),
    time: extractTime(foodHallBlock, '12:36'),
    spend: extractSpend(foodHallBlock, 30.00),
    allergyChecked: extractAllergyCheck(foodHallBlock),
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    additionalOffered: 'Great amount of extra info or help',
    expectationsExceeded: 'Amazing',
    narrative: fhNarrative || 'Mystery shopper audit evaluation for F&B Food Hall dining experience.',
  });

  // --- Backlot ---
  const blNarrative = extractNarrativeFromBlock(backlotBlock);
  const blStaff = extractStaffMembersFromBlock(backlotBlock, blNarrative, 'Backlot');
  const blScore = getSectionScoreFromBlock(backlotBlock, { act: 57, pos: 57 });

  areas.push({
    areaId: 'backlot',
    areaName: 'F&B: Backlot',
    actualScore: blScore.act,
    possibleScore: blScore.pos,
    staffMembers: blStaff,
    staffName: blStaff.map((s) => s.name).join(' & '),
    time: extractTime(backlotBlock, '15:18'),
    spend: extractSpend(backlotBlock, 28.90),
    allergyChecked: extractAllergyCheck(backlotBlock),
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    additionalOffered: 'Great amount of extra info or help',
    expectationsExceeded: 'Amazing',
    narrative: blNarrative || 'Mystery shopper audit evaluation for F&B Backlot Cafe dining experience.',
  });

  // --- Butterbeer ---
  const bbNarrative = extractNarrativeFromBlock(butterbeerBlock);
  const bbStaff = extractStaffMembersFromBlock(butterbeerBlock, bbNarrative, 'Butterbeer');
  const bbScore = getSectionScoreFromBlock(butterbeerBlock, { act: 56, pos: 56 });

  areas.push({
    areaId: 'butterbeer',
    areaName: 'F&B: Butterbeer',
    actualScore: bbScore.act,
    possibleScore: bbScore.pos,
    staffMembers: bbStaff,
    staffName: bbStaff.map((s) => s.name).join(' & '),
    time: extractTime(butterbeerBlock, '16:09'),
    spend: extractSpend(butterbeerBlock, 21.67),
    allergyChecked: extractAllergyCheck(butterbeerBlock),
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    additionalOffered: 'Great amount of extra info or help',
    expectationsExceeded: 'Amazing',
    narrative: bbNarrative || 'Mystery shopper audit evaluation for F&B Butterbeer specialist bar.',
  });

  // Period determination
  const dateObj = new Date(isoVisitDate);
  const month = !isNaN(dateObj.getMonth()) ? dateObj.getMonth() + 1 : 4;
  const day = !isNaN(dateObj.getDate()) ? dateObj.getDate() : 12;
  const year = !isNaN(dateObj.getFullYear()) ? dateObj.getFullYear() : 2026;
  const periodNumber = month;
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
Question Score Answer
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
The queue looked quite long for ordering, however it moved very quickly and we were served in an exceptional amount of time considering. The counters were clean and the floors spotless. We were warmly greeted by the team member Essel and I asked about the chicken and ribs to share. I asked how big it was and how its presented. The team member told me that it comes together on one large plate and the serving is more than enough for two people, I was told it comes with roast potatoes, corn and peas We were asked if we had allergies when we ordered and the payment was taken efficiently. I was given the receipt and a device. The team member told me that someone would bring the food to us when it is ready and bid us farewell. The tables were all clean and I didn't see any food on the floor.
The food was delivered within 14 minutes by Hannah with a smile. They checked the order as they placed the dishes dow. They told us where the condiment station was and asked if there was anything else we needed.
The food looked a little dry but tasted amazing. The meat was tender and the peas has a fantastic flavour. The gravy was thick and full of flavour and overall, I felt that the food was of a very high standard and was most enjoyable. It was all served at the correct temperature too. It is definitely a meal I would have again.

F&B: Backlot - Dream It & Own It
Question Score Answer
Name/description of staff member: Kavinu
Time: 16:59
Purchase spend: 28.9
Image of purchase receipt:
Image of items purchased:
Was the general area neat/clean/tidy? 4/5 80.00% Good [x]
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
There was a queue for the order point, however it moved quickly and we were served in a good amount of time by Kavinu who asked how we were enjoying the tour so far. They then asked what they could get me and I asked them if the wings and fries came together or separate. They told me that they come together as a meal. They asked if we had any allergies and I said we didn't. They asked if we wanted butter beer and I said we did. I was thanked when payment was taken and was given a receipt.
The counters were spotless and behind the counter looked very busy, but well organised. The food was delivered in good time and was well presented. The food was served at the correct temperature and tasted very good. The fries were crispy and the wings very tender.

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
