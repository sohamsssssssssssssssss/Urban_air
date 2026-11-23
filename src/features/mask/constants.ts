import { AQI_POOR } from "@/lib/constants";

/**
 * Primary source for mask advice: Ministry of Health and Family Welfare (India), National Programme on
 * Climate Change and Human Health, "Advisory on Air Pollution and Health", letter of 18 November 2024.
 * It says: on days of poor to severe air (AQI > 200) consider a close-fitted N95 or N99; masks may help only if
 * exposure is short and the fit is proper; replace them after use; paper masks, handkerchiefs, scarves and
 * cloth are not effective. It lists no "surgical mask" tier, so none is offered here.
 */
export const MASK_SOURCE = {
  org: "Ministry of Health and Family Welfare, India (NPCCHH)",
  title: "Advisory on Air Pollution and Health",
  date: "18 November 2024",
  url: "https://ncdc.mohfw.gov.in/uploads/pdf/Air%20Pollution%20advisory%20and%20letter%20by%20Sec%20Health-2024.pdf",
} as const;

/**
 * NIOSH has not approved any filtering-facepiece respirator for children (NIOSH, "Counterfeit/Misrepresented
 * Filtering Facepiece Respirators", guidance revised January 2026), and a beard or stubble under the seal lets particles
 * leak (NIOSH, "Beards and Respirators", 2024).
 */
export const NIOSH_SOURCE = {
  org: "US CDC / NIOSH",
  title: "Counterfeit/Misrepresented Filtering Facepiece Respirators; Beards and Respirators",
  url: "https://www.cdc.gov/niosh/ppe/counterfeit_respirators/ffr.html",
} as const;

/** AQI at or above which the advisory suggests an N95/N99 (it says "AQI > 200", i.e. the CPCB Poor band starts at 201). */
export const MASK_N95_FROM_AQI = AQI_POOR;
/** Lower edge of the CPCB Moderate band: where vulnerable groups are told to be more careful (CPCB NAQI health statements). */
export const MASK_OPTIONAL_FROM_AQI = 101;
