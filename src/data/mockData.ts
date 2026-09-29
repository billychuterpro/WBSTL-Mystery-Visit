import { FBArea, Visit, FBEvaluation, StaffInteraction } from '../types/schema';

export const FB_AREAS: Record<string, FBArea> = {
  food_hall: {
    id: 'food_hall',
    name: 'F&B: Food Hall',
    shortName: 'Food Hall',
    maxScore: 56,
    description: 'Main dining hall at the beginning of the tour serving rotisserie chicken, roasts, burgers, and hot meals.',
    themeColor: '#D97706', // Amber gold
  },
  backlot: {
    id: 'backlot',
    name: 'F&B: Backlot',
    shortName: 'Backlot',
    maxScore: 57,
    description: 'Midway outdoor pavilion cafe offering burgers, wings, loaded fries, and draft Butterbeer.',
    themeColor: '#2563EB', // Blue
  },
  butterbeer: {
    id: 'butterbeer',
    name: 'F&B: Butterbeer',
    shortName: 'Butterbeer',
    maxScore: 56,
    description: 'Specialist beverage bar serving frothy Butterbeer, Butterbeer latte, and souvenir tankard ice cream.',
    themeColor: '#059669', // Emerald
  },
};

/**
 * ONLY ACTUAL DATA PROVIDED FROM THE OFFICIAL STORECHECKERS PDF REPORT:
 * Survey: Warner Bros Studio Tour London: The Making of Harry Potter 2025
 * Report Date: 28/9/26
 * Date of visit: 21/9/26
 */
export const INITIAL_VISITS: Visit[] = [
  {
    id: 'VISIT-2026-P9-V2',
    visitCode: 'P9-V2',
    periodNumber: 9,
    visitNumber: 2,
    periodYear: 2026,
    reportDate: '2026-09-28',
    visitDate: '2026-09-21',
    surveyTitle: 'Warner Bros Studio Tour London: The Making of Harry Potter 2025',
    overallScoreActual: 1350,
    overallScorePossible: 1382,
    overallPercentage: 98.0,
    notes: 'Actual Storecheckers audit for visit date 21/09/2026 (Report date 28/09/2026). All three catering venues achieved 100% scores.',
    createdAt: '2026-09-28T09:00:00Z',
  },
];

export const INITIAL_EVALUATIONS: FBEvaluation[] = [
  // F&B: Food Hall (Pages 34-36 of provided report)
  {
    id: 'EVAL-P9-V2-FH',
    visitId: 'VISIT-2026-P9-V2',
    areaId: 'food_hall',
    evaluationTime: '12:36',
    actualScore: 56,
    possibleScore: 56,
    scorePercentage: 100.0,
    purchaseSpend: 30.00,
    receiptImageAvailable: true,
    itemsPurchasedDescription: 'Chicken & Ribs to share with roast potatoes, corn on the cob, and garden peas.',
    narrativeReview: `The queue looked quite long for ordering, however it moved very quickly and we were served in an exceptional amount of time considering. The counters were clean and the floors spotless. We were warmly greeted by the team member and I asked about the chicken and ribs to share. I asked how big it was and how its presented. The team member told me that it comes together on one large plate and the serving is more than enough for two people, I was told it comes with roast potatoes, corn and peas We were asked if we had allergies when we ordered and the payment was taken efficiently. I was given the receipt and a device. The team member told me that someone would bring the food to us when it is ready and bid us farewell. The tables were all clean and I didn't see any food on the floor. The food was delivered within 14 minutes by Hannah with a smile. They checked the order as they placed the dishes dow. They told us where the condiment station was and asked if there was anything else we needed. The food looked a little dry but tasted amazing. The meat was tender and the peas has a fantastic flavour. The gravy was thick and full of flavour and overall, I felt that the food was of a very high standard and was most enjoyable. It was all served at the correct temperature too. It is definitely a meal I would have again.`,
    cleanlinessScore: 5,
    smartUniformScore: 5,
    nameBadgeVisible: true,
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    tillEngagement: 'Excellent engagement and interaction',
    additionalItemsOffered: 'Great amount of extra info or help',
    allergyQuestionAsked: true,
    butterbeerOffered: null,
    bodyLanguage: 'Engaging body language and interaction',
    farewellGiven: true,
    expectationsExceeded: 'Amazing',
  },

  // F&B: Backlot (Pages 36-38 of provided report)
  {
    id: 'EVAL-P9-V2-BL',
    visitId: 'VISIT-2026-P9-V2',
    areaId: 'backlot',
    evaluationTime: '15:18',
    actualScore: 57,
    possibleScore: 57,
    scorePercentage: 100.0,
    purchaseSpend: 30.00,
    receiptImageAvailable: true,
    itemsPurchasedDescription: 'Chicken wings and fries served separately, Butterbeer drinks.',
    narrativeReview: `There was a queue for the order point, however it moved quickly and we were served in a good amount of time. I was greeted with a smile and they team member asked how I was enjoying the tour so far. They then asked what they could get me and I asked them if the wings and fries came together or separate. They told me that they come together as a meal. They asked if we had any allergies and I said we didn't. I asked if it was possible to have just wings and just fries separately so that our party can just help themselves as a share meal and they told me that this was something they could do. They asked if we wanted butter beer and I said we did. I was thanked when payment was taken and was given a receipt. I didn't catch the details of team member who called out our number as it was very busy in the area, but I remembered I was thanked when I did pick it up. The counters were spotless and behind the counter looked very busy, but well organised. The food was delivered in good time and was well presented. We found a table easily despite it being so busy. The whole area was very clean and tidy and the condiments area was also very clean. The food was served at the correct temperature and tasted very good. The fries were crispy and the wings very tender.`,
    cleanlinessScore: 5,
    smartUniformScore: 5,
    nameBadgeVisible: true,
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    tillEngagement: 'Excellent engagement and interaction',
    additionalItemsOffered: 'Great amount of extra info or help',
    allergyQuestionAsked: true,
    butterbeerOffered: true,
    bodyLanguage: 'Engaging body language and interaction',
    farewellGiven: true,
    expectationsExceeded: 'Amazing',
  },

  // F&B: Butterbeer (Pages 38-40 of provided report)
  {
    id: 'EVAL-P9-V2-BB',
    visitId: 'VISIT-2026-P9-V2',
    areaId: 'butterbeer',
    evaluationTime: '16:09',
    actualScore: 56,
    possibleScore: 56,
    scorePercentage: 100.0,
    purchaseSpend: 21.67,
    receiptImageAvailable: true,
    itemsPurchasedDescription: 'Butterbeer Latte with butterbeer flavour syrup and cream, souvenir dish ice cream.',
    narrativeReview: `We were served in good time and were warmly greeted by staff who asked how we were enjoying the tour so far. They asked what they could get us and I asked how the butter beer latte is done. They told me that it's a normal latte with butter beer flavour syrup and cream. They said it tastes great if you are a fan of the butter beer and I asked if the ice cream comes in a dish that we can keep and the team member said that it did and described it as a small dish that makes a great keepsake. I ordered and was asked if we had any allergies. The items arrived in excellent time. It was all very tasty and as it was described. We were given a very warm farewell. The area was exceptionally clean and well presented.`,
    cleanlinessScore: 5,
    smartUniformScore: 5,
    nameBadgeVisible: true,
    friendlyGreeting: 'Exceptional',
    queueManagement: 'Full care',
    tillEngagement: 'Excellent engagement and interaction',
    additionalItemsOffered: 'Great amount of extra info or help',
    allergyQuestionAsked: true,
    butterbeerOffered: null,
    bodyLanguage: 'Engaging body language and interaction',
    farewellGiven: true,
    expectationsExceeded: 'Amazing',
  },
];

export const INITIAL_STAFF_INTERACTIONS: StaffInteraction[] = [
  // Essel (Food Hall)
  {
    id: 'INT-P9-V2-1',
    evaluationId: 'EVAL-P9-V2-FH',
    visitId: 'VISIT-2026-P9-V2',
    areaId: 'food_hall',
    staffName: 'Essel',
    interactionTime: '12:36',
    allergyChecked: true,
    friendlyGreetingRating: 'Exceptional',
    queueManagementRating: 'Full care',
    upsellOfferRating: 'Great amount of extra info or help',
    specificNarrativeExcerpt: `We were warmly greeted by the team member Essel and I asked about the chicken and ribs to share. The team member told me that it comes together on one large plate and the serving is more than enough for two people, I was told it comes with roast potatoes, corn and peas. We were asked if we had allergies when we ordered and payment was taken efficiently.`,
    keyRecognitions: ['Natasha’s Law Allergen Inquirer', 'Detailed Menu Knowledge', 'Warm Hospitality'],
  },

  // Hannah (Food Hall)
  {
    id: 'INT-P9-V2-2',
    evaluationId: 'EVAL-P9-V2-FH',
    visitId: 'VISIT-2026-P9-V2',
    areaId: 'food_hall',
    staffName: 'Hannah',
    interactionTime: '12:50',
    allergyChecked: true,
    friendlyGreetingRating: 'Exceptional',
    queueManagementRating: 'Full care',
    upsellOfferRating: 'Great amount of extra info or help',
    specificNarrativeExcerpt: `The food was delivered within 14 minutes by Hannah with a smile. They checked the order as they placed the dishes down. They told us where the condiment station was and asked if there was anything else we needed.`,
    keyRecognitions: ['Speed of Service (14 mins)', 'Courteous Table Service', 'Proactive Condiment Guidance'],
  },

  // Daniella (Backlot)
  {
    id: 'INT-P9-V2-3',
    evaluationId: 'EVAL-P9-V2-BL',
    visitId: 'VISIT-2026-P9-V2',
    areaId: 'backlot',
    staffName: 'Daniella',
    interactionTime: '15:18',
    allergyChecked: true,
    friendlyGreetingRating: 'Exceptional',
    queueManagementRating: 'Full care',
    upsellOfferRating: 'Great amount of extra info or help',
    specificNarrativeExcerpt: `I was greeted with a smile and the team member Daniella asked how I was enjoying the tour so far. They asked if we had any allergies and accommodated our request to separate wings and fries for sharing. They asked if we wanted Butterbeer and thanked us when payment was taken.`,
    keyRecognitions: ['Natasha’s Law Allergen Checked', 'Successful Butterbeer Upsell', 'Flexible Meal Customisation'],
  },

  // Butterbeer Staff
  {
    id: 'INT-P9-V2-4',
    evaluationId: 'EVAL-P9-V2-BB',
    visitId: 'VISIT-2026-P9-V2',
    areaId: 'butterbeer',
    staffName: 'Female (blonde ponytail) & Male (dark hair)',
    interactionTime: '16:09',
    allergyChecked: true,
    friendlyGreetingRating: 'Exceptional',
    queueManagementRating: 'Full care',
    upsellOfferRating: 'Great amount of extra info or help',
    specificNarrativeExcerpt: `Warmly greeted by staff who asked how we were enjoying the tour. Enthusiastically explained how the butter beer latte is prepared and highlighted the keepsake souvenir bowl for the ice cream. Asked if we had any allergies.`,
    keyRecognitions: ['Natasha’s Law Allergen Inquirer', 'Merchandise Keepsake Advocacy', 'Infectious Enthusiasm'],
  },
];
