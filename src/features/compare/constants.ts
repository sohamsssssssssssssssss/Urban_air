/**
 * Two readings within this many AQI points are described as "similar". SmogSense display assumption: the
 * NAQI bands are 50 points wide for Good/Satisfactory, so a gap of under 10 is within normal hour-to-hour
 * variation and not worth ranking.
 */
export const COMPARE_SIMILAR_AQI_POINTS = 10;
