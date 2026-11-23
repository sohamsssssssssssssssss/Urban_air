import type { Language } from "@/lib/i18n";
import type { AlertThreshold } from "./constants";
import type { PermissionState } from "./notify";

export interface AlertStrings {
  heading: string;
  limit: string;
  install: string;
  city: string;
  threshold: string;
  thresholds: Record<AlertThreshold, string>;
  inApp: string;
  on: string;
  off: string;
  browser: string;
  allow: string;
  permission: Record<PermissionState, string>;
  status: (time: string, aqi: number) => string;
  nextCheck: string;
  checking: string;
  checkFailed: string;
  bannerTitle: (d: { aqi: number; category: string; city: string }) => string;
  bannerBody: (d: { threshold: number; station: string; time: string }) => string;
  dismiss: string;
  notificationTitle: (d: { aqi: number; category: string; city: string }) => string;
}

const en: AlertStrings = {
  heading: "Air alerts",
  limit: "Alerts work only while SmogSense is open in a browser tab or as an installed app. Nothing is checked or sent when it is closed: that would need a server that stores your device, and SmogSense deliberately keeps none.",
  install: "Tip: install SmogSense from your browser menu (Install or Add to Home screen) to keep it open in its own window.",
  city: "City to watch",
  threshold: "Alert me when AQI reaches",
  thresholds: { 101: "Moderate or worse (101+)", 201: "Poor or worse (201+)", 301: "Very Poor or worse (301+)", 401: "Severe (401+)" },
  inApp: "In-app alerts",
  on: "On",
  off: "Off",
  browser: "Browser notifications",
  allow: "Allow browser notifications",
  permission: {
    default: "Not asked yet. Turn them on if you want a pop-up as well as the banner.",
    granted: "Allowed. You will get a notification when the level is reached.",
    denied: "Blocked in your browser settings. The banner still works.",
    unsupported: "This browser does not support notifications. The banner still works.",
  },
  status: (time, aqi) => `Last checked ${time}: AQI ${aqi}. Checks again every 30 minutes while this page is open.`,
  nextCheck: "Checks every 30 minutes while this page is open.",
  checking: "Checking…",
  checkFailed: "Couldn't check the air quality just now. Will try again in 30 minutes.",
  bannerTitle: (d) => `Air alert: AQI ${d.aqi} (${d.category}) in ${d.city}`,
  bannerBody: (d) => `At or above your alert level of ${d.threshold}. ${d.station}, ${d.time}.`,
  dismiss: "Dismiss",
  notificationTitle: (d) => `SmogSense: AQI ${d.aqi} (${d.category}) in ${d.city}`,
};

const hi: AlertStrings = {
  heading: "हवा के अलर्ट",
  limit: "अलर्ट सिर्फ़ तब काम करते हैं जब SmogSense ब्राउज़र टैब में या इंस्टॉल किए ऐप के रूप में खुला हो। बंद होने पर कुछ जाँचा या भेजा नहीं जाता: इसके लिए आपके डिवाइस को सहेजने वाला सर्वर चाहिए, और SmogSense जान-बूझकर ऐसा कोई सर्वर नहीं रखता।",
  install: "सुझाव: SmogSense को ब्राउज़र मेनू से इंस्टॉल करें (Install या Add to Home screen) ताकि वह अपनी अलग विंडो में खुला रहे।",
  city: "जिस शहर पर नज़र रखनी है",
  threshold: "AQI इस स्तर पर पहुँचे तो बताएँ",
  thresholds: { 101: "मध्यम या बदतर (101+)", 201: "खराब या बदतर (201+)", 301: "बहुत खराब या बदतर (301+)", 401: "गंभीर (401+)" },
  inApp: "ऐप के अंदर अलर्ट",
  on: "चालू",
  off: "बंद",
  browser: "ब्राउज़र नोटिफ़िकेशन",
  allow: "ब्राउज़र नोटिफ़िकेशन की अनुमति दें",
  permission: {
    default: "अभी पूछा नहीं गया। बैनर के साथ पॉप-अप भी चाहिए तो चालू करें।",
    granted: "अनुमति मिल गई। स्तर पहुँचने पर नोटिफ़िकेशन मिलेगा।",
    denied: "ब्राउज़र सेटिंग में रोका गया है। बैनर फिर भी काम करता है।",
    unsupported: "यह ब्राउज़र नोटिफ़िकेशन सपोर्ट नहीं करता। बैनर फिर भी काम करता है।",
  },
  status: (time, aqi) => `आख़िरी जाँच ${time}: AQI ${aqi}। यह पेज खुला रहने तक हर 30 मिनट में फिर जाँच होगी।`,
  nextCheck: "यह पेज खुला रहने तक हर 30 मिनट में जाँच होती है।",
  checking: "जाँच हो रही है…",
  checkFailed: "अभी हवा की गुणवत्ता जाँच नहीं हो पाई। 30 मिनट में फिर कोशिश होगी।",
  bannerTitle: (d) => `हवा का अलर्ट: ${d.city} में AQI ${d.aqi} (${d.category})`,
  bannerBody: (d) => `आपके अलर्ट स्तर ${d.threshold} पर या उससे ऊपर। ${d.station}, ${d.time}।`,
  dismiss: "हटाएँ",
  notificationTitle: (d) => `SmogSense: ${d.city} में AQI ${d.aqi} (${d.category})`,
};

export const ALERT_STRINGS: Record<Language, AlertStrings> = { en, hi };
