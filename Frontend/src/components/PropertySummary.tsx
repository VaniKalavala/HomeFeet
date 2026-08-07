import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, FileText, Image, Link2, MapPin, Mic, MicOff, Sparkles as SparklesIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import { isAdminUser as checkIsAdminUser } from '../lib/admin';

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type GoogleLike = any;

const extractNumber = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1] || match?.[2];
    if (value) return value.replace(/,/g, '');
  }
  return '';
};

const extractAmount = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;
    const unit = String(match[2] || '').toLowerCase();
    if (/cr|crore/.test(unit)) return String(value * 10000000);
    if (/l|lac|lakh/.test(unit)) return String(value * 100000);
    return String(value);
  }
  return '';
};

const formatFeet = (value = '') => value.replace(/,/g, '').replace(/\.0+$/, '');

const stripNumberFormatting = (value = '') => value.replace(/,/g, '');

const valueAfterEquals = (value = '') => {
  const match = value.match(/=\s*([\d,.]+)/);
  return match?.[1] ? stripNumberFormatting(match[1]) : '';
};

const numericValue = (value = '') => {
  const parsed = Number(String(value || '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isLargeAcreLand = (details: { areaUnit?: string; totalArea?: string }) =>
  /acre/i.test(details.areaUnit || '') && numericValue(details.totalArea) > 2;

const extractAreaFromSummary = (summary: string) => {
  const acresGuntas = summary.match(/\b([\d,.]+)\s*acres?\s*([\d,.]+)\s*guntas?\b/i);
  if (acresGuntas?.[1]) {
    const acres = Number(acresGuntas[1].replace(/,/g, ''));
    const guntas = Number(acresGuntas[2].replace(/,/g, ''));
    if (Number.isFinite(acres) && Number.isFinite(guntas)) {
      return String(Math.round((acres + guntas / 40) * 100) / 100).replace(/\.0+$/, '');
    }
  }

  const labelledArea = summary.match(/\b(?:plot\s*size|plot\s*area|land\s*area|total\s*(?:area|extent)|square\s*feet|sq\.?\s*ft|sqft|square\s*yards?|sq\.?\s*yards?|sq\s*yards?|syds?|area)\s*[:\-]?\s*([^\n.]+)/i)?.[1] || '';
  const labelledTotal = valueAfterEquals(labelledArea);
  if (labelledTotal) return labelledTotal;

  // The captured "number" must start with an actual digit - [\d,.]+ alone
  // would happily accept a lone "." as a match (e.g. "...Meditation Area.
  // Indoor Games..." lets the generic "area" label match with nothing but
  // the sentence-ending period as its "number").
  return extractNumber(summary, [
    /(?:total\s*)?land\s*[:\-]?\s*(\d[\d,.]*)\s*-?\s*(?:acres?|sq\.?\s*ft|square\s*feet|sqft|sq\.?\s*yards?|square\s*yards?|syds?)/i,
    /(?:plot\s*size|plot\s*area|land\s*area)\s*[:\-]?\s*(\d[\d,.]*)\s*-?\s*(?:acres?|sq\.?\s*ft|square\s*feet|sqft|sq\.?\s*yards?|square\s*yards?|syds?)/i,
    /(?:total\s*)?area\s*[:\-]?\s*(\d[\d,.]*)\s*-?\s*(?:acres?|sq\.?\s*ft|square\s*feet|sqft|sq\.?\s*yards?|square\s*yards?|syds?)?/i,
    /(?:total\s*)?(\d[\d,.]*)\s*-?\s*(?:sq\.?\s*ft|square\s*feet|sqft|sq\.?\s*yards?|square\s*yards?|syds?|acres?)/i
  ]);
};

const extractChoice = (text: string, choices: string[]) =>
  choices.find((choice) => new RegExp(`\\b${choice.replace('-', '[- ]?')}\\b`, 'i').test(text)) || '';

const formatBhkLabel = (raw: string) => {
  const num = Number(raw);
  if (!Number.isFinite(num)) return '';
  if (num >= 5) return '4+ BHK';
  if (Number.isInteger(num) || Math.abs((num % 1) - 0.5) < 1e-9) return `${num} BHK`;
  return `${Math.round(num)} BHK`;
};

const extractBedrooms = (text: string) => {
  // Brochure tables often list every unit typology (3 BHK, 3.5 BHK, 4 BHK...),
  // sometimes with the size figure glued right onto "BHK" with no space
  // ("BHK3,088"), so match every occurrence rather than stopping at the first.
  const bhkMatches = Array.from(text.matchAll(/\b(\d(?:\.\d)?)\s*\+?\s*bhk(?![a-z])/gi));
  const matches = bhkMatches.length ? bhkMatches : Array.from(text.matchAll(/\b(\d(?:\.\d)?)\s*\+?\s*bed\s*rooms?\b/gi));
  if (!matches.length) return '';

  const labels = Array.from(new Set(matches.map((match) => formatBhkLabel(match[1])).filter(Boolean)));
  if (/\b4\s*\+\s*bhk\b/i.test(text) && !labels.includes('4+ BHK')) labels.push('4+ BHK');
  labels.sort((a, b) => parseFloat(a) - parseFloat(b));
  return labels.join(', ');
};

const extractBathrooms = (text: string) =>
  extractNumber(text, [
    /\b(\d+)\s*(?:bathrooms?|baths?|toilets?)\b/i
  ]);

const extractFloorDetails = (text: string) => {
  const ofPattern = text.match(/\bfloor\s*[:\-]?\s*(\d+)\s*(?:of|\/|out of)\s*(\d+)\b/i)
    || text.match(/\b(\d+)(?:st|nd|rd|th)?\s*floor\s*(?:of|out of)\s*(\d+)\b/i);
  if (ofPattern) return { floorNumber: ofPattern[1], totalFloors: ofPattern[2] };
  // "G+46" and spelled-out "Ground + 46 Upper Floors" both mean the same
  // thing - a tower with a ground floor plus 46 floors above it.
  const gPlus = text.match(/\bg\s*\+\s*(\d+)\b/i) || text.match(/\bground\s*\+\s*(\d+)\s*(?:upper\s*)?floors?\b/i);
  const floorOnly = text.match(/\b(\d+)(?:st|nd|rd|th)?\s*floor\b/i);
  const totalOnly = text.match(/\btotal\s*(?:of\s*)?(\d+)\s*floors?\b/i);
  return {
    floorNumber: floorOnly?.[1] || '',
    totalFloors: totalOnly?.[1] || (gPlus ? String(Number(gPlus[1]) + 1) : '')
  };
};

const extractFurnishingStatus = (text: string) =>
  /\bsemi[- ]?furnished\b/i.test(text) ? 'Semi-Furnished'
    : /\bfully[- ]?furnished\b/i.test(text) ? 'Fully-Furnished'
    : /\bunfurnished\b/i.test(text) ? 'Unfurnished'
    : '';

const extractPossessionStatus = (text: string) =>
  /\bready\s*to\s*move\b/i.test(text) ? 'Ready to Move'
    : /\bunder\s*construction\b/i.test(text) ? 'Under Construction'
    : '';

// The Possession Date field is a native date input needing an exact
// dd-mm-yyyy value, but a brochure typically only states a target YEAR
// ("Target Possession 2031"), never a specific day. Rather than leave the
// field blank when a year is clearly stated, default to December 31 of
// that year - a defensible "by end of" placeholder the admin can tighten
// up, not a fabricated precise date.
const extractTargetPossessionDate = (text: string) => {
  const year = Number(
    text.match(/\btarget\s*possession\s*[:\-]?\s*(?:in\s*|by\s*|q[1-4]\s*)?(\d{4})\b/i)?.[1]
    || text.match(/\bpossession\s*(?:by|in|date)\s*[:\-]?\s*(?:q[1-4]\s*)?(\d{4})\b/i)?.[1]
    || ''
  );
  return Number.isFinite(year) && year >= 2020 && year <= 2100 ? `${year}-12-31` : '';
};

const extractFlatSize = (text: string) =>
  extractNumber(text, [
    /\bflat\s*size\s*[:\-]?\s*([\d,.]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)?/i,
    /\b([\d,.]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)\s*flat\b/i,
    /\bbuilt[- ]?up\s*area\s*[:\-]?\s*([\d,.]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)?/i,
    /\bcarpet\s*area\s*[:\-]?\s*([\d,.]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)?/i
  ]);

// A unit-breakdown table lists a size range per BHK typology
// ("3,088 - 3,433 SFT", "4,936 - 4,976 SFT"...). Take the overall min/max
// across every range mentioned, matching the form's Min/Max Flat Size fields.
const extractFlatSizeRange = (text: string) => {
  // No \b before the first number: brochure tables often glue it straight
  // onto the BHK label with no separator ("BHK3,088"), and \w on both
  // sides of that boundary means \b would never match there.
  const matches = Array.from(text.matchAll(/(\d[\d,]{2,})\s*(?:–|—|-|to)\s*(\d[\d,]{2,})\s*(?:sq\.?\s*ft|sqft|square\s*feet|sft)\b/gi));
  const values = matches
    .flatMap((match) => [match[1], match[2]])
    .map((raw) => Number(raw.replace(/,/g, '')))
    .filter((num) => Number.isFinite(num) && num > 0);
  if (!values.length) return { flatSizeMin: '', flatSizeMax: '' };
  return {
    flatSizeMin: String(Math.min(...values)),
    flatSizeMax: String(Math.max(...values))
  };
};

const extractFloorToFloorHeight = (text: string) =>
  extractNumber(text, [
    /\bfloor[- ]?to[- ]?floor\s*height\s*[:\-]?\s*([\d.]+)\s*(?:ft|feet)?/i
  ]);

const FLAT_FACING_OPTIONS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];

// A unit-breakdown table lists which facings are offered per typology
// ("East, West", "East, West, North"...) as a run of 2+ directions joined
// by comma/and/&. A single standalone "East facing" elsewhere (the plot's
// own overall facing) never matches this, so the two fields don't collide.
const extractFlatFacings = (text: string) => {
  const found = new Set<string>();
  const runPattern = /\b((?:north-east|north-west|south-east|south-west|north|south|east|west)(?:\s*(?:,|&|and)\s*(?:north-east|north-west|south-east|south-west|north|south|east|west)){1,3})\b/gi;
  Array.from(text.matchAll(runPattern)).forEach((match) => {
    match[1].split(/\s*(?:,|&|and)\s*/).forEach((word) => {
      const normalized = normalizeDirection(word);
      if ((FLAT_FACING_OPTIONS as string[]).includes(normalized)) found.add(normalized);
    });
  });
  return FLAT_FACING_OPTIONS.filter((option) => found.has(option));
};

// Turns brochure "Nearby Schools: X (1.03 km), Y (1.14 km)." and
// "Corporate Hubs: Direct access to A, B, and C tech hubs." sections into
// one line per place, matching the app's existing "Near to X" per-line
// convention for the Locality Top Highlights field.
const extractLocalityHighlights = (text: string) => {
  const lines: string[] = [];

  // Lazy match up to a period that ends the sentence (followed by
  // whitespace or end of string) rather than the first "." at all -
  // otherwise this stops at the decimal point in "1.03 km". Brochures
  // phrase this label both ways ("Nearby Schools" and "Schools Nearby").
  const schoolsSection = text.match(/(?:nearby\s*schools?|schools?\s*nearby)\s*[:\-]?\s*([\s\S]+?)\.(?=\s|$)/i)?.[1] || '';
  Array.from(schoolsSection.matchAll(/([A-Z][A-Za-z0-9.'&\s]*?)\s*\(\s*([\d.]+)\s*km\s*\)/g)).forEach((match) => {
    const name = match[1].trim();
    if (name) lines.push(`${match[2]} km to ${name}`);
  });

  // A single named landmark stated as "X (details): ~6 km away" rather than
  // a "Corporate Hubs" list, e.g. "Outer Ring Road (ORR Exit 15): ~6 km away".
  // The regex's earliest-match-wins scanning can pull in a preceding section
  // heading with no punctuation to stop at ("Connectivity HighlightsOuter
  // Ring Road..." normalizes to one run of capitalized words) - strip any
  // such heading words off the front of the captured name.
  const HIGHLIGHT_HEADING_WORDS = /^(?:Location|Connectivity|Highlights|Context|Overview|Nearby|Summary|Details)$/i;
  Array.from(text.matchAll(/\b([A-Z][A-Za-z0-9\s]*?(?:\([^)]*\))?)\s*:\s*~?\s*(\d+(?:\.\d+)?)\s*km\s*away/gi)).forEach((match) => {
    const words = match[1].trim().split(/\s+/);
    while (words.length > 1 && HIGHLIGHT_HEADING_WORDS.test(words[0])) words.shift();
    const name = words.join(' ').trim();
    if (name) lines.push(`${match[2]} km from ${name}`);
  });

  const hubsSection = text.match(/corporate\s*hubs?\s*[:\-]?\s*([\s\S]+?)\.(?=\s|$)/i)?.[1] || '';
  const hubsList = hubsSection.match(/(?:direct\s*access\s*to|close\s*to|near)\s+([^.]+)/i)?.[1] || hubsSection;
  hubsList
    .replace(/\btech\s*hubs?\b/gi, '')
    .split(/\s*,\s*(?:and\s+)?|\s+and\s+/i)
    .map((place) => place.trim())
    .filter(Boolean)
    .forEach((place) => lines.push(`Close to ${place}`));

  return lines.join('\n');
};

const priceToRupees = (rawValue: string, rawUnit: string) => {
  const value = Number(String(rawValue || '').replace(/,/g, ''));
  if (!Number.isFinite(value)) return '';
  const unit = String(rawUnit || '').toLowerCase();
  if (/cr|crore/.test(unit)) return String(Math.round(value * 10000000));
  if (/l|lac|lakh/.test(unit)) return String(Math.round(value * 100000));
  return String(Math.round(value));
};

// A brochure's per-typology breakdown table lists a size range, a price
// range, and a facing list for each BHK row - but different brochures order
// those three columns differently ("...SFT East, West Rs.3.6 Cr..." vs
// "...SFT Rs.3.6 Cr...East, West"). Rather than one rigid sequential regex,
// slice the text between one BHK mention and the next and search that slice
// for size/price/facing independently, so any column order works. Each
// card only has a single size and price field (no min/max pair), so the
// lower end of each range is used as a representative value - never an
// average or invented midpoint. A row is only kept if a size figure was
// actually found close to the BHK mention, so a stray "3 BHK" in ordinary
// prose elsewhere in the text never creates a phantom unit.
const extractFloorPlanUnitsFromSummary = (text: string) => {
  const markers = Array.from(text.matchAll(/(\d(?:\.\d)?)\s*\+?\s*bhk(?![a-z])/gi));
  const MAX_ROW_LENGTH = 200;

  return markers
    .map((marker, index) => {
      const start = (marker.index ?? 0) + marker[0].length;
      const nextStart = index + 1 < markers.length ? markers[index + 1].index ?? text.length : text.length;
      const row = text.slice(start, Math.min(nextStart, start + MAX_ROW_LENGTH));

      // Not every typology gives a size range - some state a single value
      // ("3 BHK 1,450 SFT"). Try the range first, then fall back to one
      // plain number+unit so that row isn't dropped entirely.
      const sizeMatch = row.match(/(\d[\d,]{2,})\s*(?:–|—|-|to)\s*(\d[\d,]{2,})\s*(?:sq\.?\s*ft|sqft|square\s*feet|sft)/i)
        || row.match(/(\d[\d,]{2,})\s*(?:sq\.?\s*ft|sqft|square\s*feet|sft)/i);
      if (!sizeMatch) return null;

      const priceMatch = row.match(/(?:₹|rs\.?|inr)\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?/i);
      const facings = Array.from(row.matchAll(/\b(north-east|north-west|south-east|south-west|north|south|east|west)\b/gi))
        .map((facingMatch) => normalizeDirection(facingMatch[1]))
        .filter((word) => (FLAT_FACING_OPTIONS as string[]).includes(word));

      return {
        bedrooms: formatBhkLabel(marker[1]),
        size: sizeMatch[1].replace(/,/g, ''),
        price: priceMatch ? priceToRupees(priceMatch[1], priceMatch[2]) : '',
        unitFacing: facings[0] || ''
      };
    })
    .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit && unit.bedrooms));
};

// When a summary is pasted from a brochure table, the value right after a
// label like "Project Name" or "Developer" runs straight into the NEXT
// label with no punctuation to stop at ("Sattva Lago Developer Sattva
// Group ..."). Stop collecting words as soon as one looks like the start
// of another label, or stops looking like part of a proper name.
const SUMMARY_LABEL_STOPWORDS = /^(?:Developer|Location|Land|Total|Towers|Elevation|Floor|Project|Status|Target|Possession|RERA|Registration|HMDA|DTCP|GHMC|Permission|Pricing|Configuration|Base|Rate|Starting|Price|Overall|Unit|Breakdowns|Typology|Size|Range|Facings|Offered|Specifications|Construction|Standards|Structure|Flooring|Sanitary|Plumbing|Kitchen|Amenities|Lifestyle|Facilities|Sports|Indoor|Wellness|Family|Kids|Connectivity|Context|Situated|Nearby|Schools|Corporate|Hubs|By|Builder|Company|Bedrooms|Bathrooms|Facing|Furnishing|Zoning|Possession|Description|Contact|Mobile|Email)$/i;

const isSummaryNameWord = (word: string) => /^[A-Z][A-Za-z&'.-]*$/.test(word) && !SUMMARY_LABEL_STOPWORDS.test(word);

const captureNameAfterLabel = (text: string, labelPattern: RegExp, maxWords = 4) => {
  const rest = text.match(labelPattern)?.[1];
  if (!rest) return '';
  const words = rest.trim().split(/\s+/);
  const collected: string[] = [];
  for (const word of words) {
    if (collected.length >= maxWords || !isSummaryNameWord(word)) break;
    collected.push(word);
  }
  return collected.join(' ');
};

const extractProjectName = (text: string) =>
  captureNameAfterLabel(text, /\bproject\s*name\s*[:\-]?\s*([^\n]+)/i)
  || text.match(/\bproject\s*[:\-]\s*([^\n,.]+)/i)?.[1]?.trim()
  || '';

const extractCompanyName = (text: string) =>
  captureNameAfterLabel(text, /\b(?:builder|developer|company)\s*(?:name)?\s*[:\-]?\s*([^\n]+)/i)
  || text.match(/\bby\s+([A-Z][A-Za-z0-9&.'\s]*?(?:builders?|constructions?|infra|developers?|group|llp|pvt\.?\s*ltd\.?))\b/i)?.[1]?.trim()
  || '';

const extractProjectTotalUnits = (text: string) =>
  extractNumber(text, [
    /\btotal\s*(?:no\.?\s*of\s*)?units?\s*[:\-]?\s*([\d,]+)/i,
    /\b([\d,]+)\s*(?:total\s*)?units?\b/i
  ]);

const extractReraId = (text: string) => {
  // Label wording between "RERA" and the actual ID varies too much to
  // enumerate ("Registration No.", "Reg. No.", "Regd No", "TG RERA Reg.
  // No."...) - skip over any short run of letters/punctuation/spaces
  // instead, and let the ID pattern itself (an uppercase-letter prefix
  // immediately followed by digits) mark where the real value starts.
  const match = text.match(/\brera\b[\sA-Za-z.:\-]{0,25}?([A-Z]{1,4}\d{4,}[A-Z0-9\/]*)/i);
  return match?.[1]?.replace(/\s+/g, '') || '';
};

const extractPermissionNo = (text: string) => {
  const match = text.match(/\b(?:hmda|dtcp|ghmc|gp|layout|building)\s*permission\s*(?:no\.?|number|regd\.?)*\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\/\-]{3,})/i);
  return match?.[1]?.trim() || '';
};

const extractSquareFeetPrice = (text: string) =>
  extractAmount(text, [
    /(?:rs\.?|₹|inr)\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?\s*(?:per\s*sq\.?\s*ft|\/\s*sq\.?\s*ft|psf)/i,
    /([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?\s*(?:per\s*sq\.?\s*ft|\/\s*sq\.?\s*ft|psf)/i
  ]);

const extractTotalBudget = (text: string) =>
  extractAmount(text, [
    /\btotal\s*budget\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?/i,
    /\bstarting\s*price\s*[:\-]?\s*~?\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?/i,
    /\bexpected\s*price\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?/i,
    /\btotal\s*price\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?/i,
    // "price"/currency-prefixed fallbacks: never grab a per-sq-ft rate.
    /\bprice\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?(?!\s*\/?\s*(?:per\s*)?sq)/i,
    /(?:rs\.?|₹)\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?\s*(?:only|onwards|negotiable|fixed)?\b(?!\s*\/?\s*(?:per\s*)?sq)/i
  ]);

// Matches every amenity the Property Form actually offers (PostProperty.tsx's
// own AMENITY_OPTIONS list) - a brochure phrase that doesn't map to one of
// these 22 real checkboxes is intentionally left unmatched rather than
// invented as a new amenity.
const AMENITY_KEYWORD_MAP: Array<[RegExp, string]> = [
  [/\bdouble\s*parking\b/i, 'Double Parking'],
  [/\bbike\s*parking\b|\btwo[- ]?wheeler\s*parking\b/i, 'Bike Parking'],
  [/\bsingle\s*parking\b|\bparking\b/i, 'Single Parking'],
  [/\blifts?\b|\belevators?\b/i, 'Lift'],
  [/\bpower\s*back\s*-?up\b|\bgenerator\b/i, 'Power Backup'],
  [/\bsecurity\b|\bcctv\b/i, 'Security'],
  [/\bgyms?\b|\bgymnasium\b|\bfitness\s*(?:center|centre)\b/i, 'Gym'],
  [/\bclub\s*house\b/i, 'Clubhouse'],
  [/\bwater\s*supply\b/i, 'Water Supply'],
  [/\bparks?\b|\bgarden\b/i, 'Park'],
  [/\bswimming\s*pool\b|\bpool\b/i, 'Swimming Pool'],
  [/\bbadminton\b/i, 'Badminton Court'],
  [/\bcricket\b/i, 'Cricket Court'],
  [/\bfood\s*court\b/i, 'Food Court'],
  [/\bwaiting\s*lounge\b/i, 'Waiting Lounge'],
  [/\bamphitheat(?:er|re)\b/i, 'Amphitheater'],
  [/\bsauna\b/i, 'Sauna Bath'],
  [/\bspa\b/i, 'Spa'],
  [/\bskating\s*rink\b/i, 'Skating Rink'],
  [/\bvastu\b/i, 'Vastu Compliant'],
  [/\blandscap(?:ed|ing)\b|\btree\s*park\b/i, 'Landscaping & Tree Park'],
  [/\bmini\s*theat(?:er|re)\b/i, 'Mini Theatre'],
  [/\bfire\s*fighting\b|\bfire\s*safety\b/i, 'Fire Fighting System'],
];

const extractAmenitiesFromSummary = (text: string) =>
  AMENITY_KEYWORD_MAP.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);

const extractSideLengthFromSummary = (summary: string, side: string) => {
  const pattern = new RegExp(`\\b${side}\\s*(?:side|length|width)?(?:\\s*\\(?\\s*(?:ft|feet)\\s*\\)?)?\\s*[.:\\-]?\\s*([\\d,.]+)(?![\\d,.\\/])(?:\\s*(?:ft|feet))?(?!\\s*roads?\\b)`, 'gi');
  const matches = Array.from(summary.matchAll(pattern))
    .map((match) => (match[1]?.replace(/,/g, '').replace(/\.$/, '') || ''))
    .filter(Boolean);
  return matches[matches.length - 1] || '';
};

const normalizeDirection = (value = '') =>
  value
    .toLowerCase()
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.replace(/^easts$/i, 'east').replace(/^wests$/i, 'west'))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');

const extractCornerFacingFromSummary = (summary: string) =>
  normalizeDirection(
    summary.match(/\b(north|south|east|west)\s*(?:-|&|and|\s)\s*(north|south|east|west)\s+corner\s+plots?\b/i)?.[1] ||
    summary.match(/\b(north|south|east|west)\s*(?:-|&|and|\s)\s*(north|south|east|west)\s+corner\b/i)?.[1] ||
    ''
  );

const extractPlotDimensionPair = (summary: string) => {
  const labelledSize = summary.match(/\b(?:sizes?|dimensions?|plot\s*dimensions?)\s*[:\-]?\s*([^\n.]+)/i)?.[1] || '';
  const source = labelledSize || summary;
  const dimensionMatch =
    source.match(/=\s*([\d,.]+)\s*(?:'|ft|feet)?\s*(?:x|×|by|\*)\s*([\d,.]+)/i) ||
    source.match(/([\d,.]+)\s*(?:'|ft|feet)?\s*(?:x|×|by|\*)\s*([\d,.]+)/i);
  return dimensionMatch?.[1] && dimensionMatch?.[2]
    ? { length: stripNumberFormatting(dimensionMatch[1]), width: stripNumberFormatting(dimensionMatch[2]) }
    : { length: '', width: '' };
};

// Brochure/table text pasted from a webpage often loses its whitespace between
// cells ("Project NameSattva Lago", "RERA RegistrationP02400010916HMDA
// Permission No..."). Insert a space at the boundary wherever one clearly
// belongs, without touching alphanumeric codes like RERA IDs (which are a
// letter prefix immediately followed by digits, never the reverse).
const insertMissingWordBoundaries = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([).,;:])([A-Za-z])/g, '$1 $2')
    .replace(/(\d)([A-Z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2');

const normalizeSummaryForParsing = (value: string) =>
  propertySpeechCorrections.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    insertMissingWordBoundaries(value)
  )
    .replace(/\bdevelopement\b/gi, 'development')
    .replace(/\bdevelopmant\b/gi, 'development')
    .replace(/\bdevlopment\b/gi, 'development')
    .replace(/\bp\s*villa\b/gi, 'villa')
    .replace(/\(\s*ac\.?\s*gts?\.?\s*\)/gi, ' acres')
    .replace(/\bfarm\s*plots?\b/gi, 'farm plots')
    .replace(/\bretio\b/gi, 'ratio')
    .replace(/\boutrate\b/gi, 'outright')
    .replace(/\bout\s*rate\b/gi, 'outright')
    .replace(/\baceres?\b/gi, 'acres')
    .replace(/\bacers?\b/gi, 'acres')
    .replace(/\bacrs?\b/gi, 'acres')
    .replace(/\bacr\b/gi, 'acre')
    .replace(/\b(\d+)\s*-\s*acres?\b/gi, '$1 acres')
    .replace(/\b(\d+)\s*acres?\s*(\d+)\s*guntas?\b/gi, '$1 acres $2 guntas')
    .replace(/\b(\d+)acres?(\d+)\s*guntas?\b/gi, '$1 acres $2 guntas')
    .replace(/\boner\b/gi, 'owner')
    .replace(/\bonwer\b/gi, 'owner')
    .replace(/\bmondal\b/gi, 'mandal')
    .replace(/\bdistictk\b/gi, 'district')
    .replace(/\bdistrictk\b/gi, 'district')
    .replace(/\bsarver\b/gi, 'survey')
    .replace(/\bsurvey\s+number\b/gi, 'Survey No.')
    .replace(/\bnala\s+conversation\b/gi, 'NALA conversion')
    .replace(/\broad["']?s\b/gi, 'roads')
    .replace(/\bhi\s*rises?\b/gi, 'high-rise')
    .replace(/\bs\s*yds?\b/gi, 'sq yards')
    .replace(/\bsyds?\b/gi, 'sq yards')
    .replace(/\bsq\s*yds?\b/gi, 'sq yards')
    .replace(/\bsqyds?\b/gi, 'sq yards')
    .replace(/\bsq\.?\s*(?:yds?|yrds?|yards?|ryds?|ryds?["']?s?)\b/gi, 'sq yards')
    .replace(/\bsq\.?\s*ft\.?\b/gi, 'sq ft')
    .replace(/\bsqft\b/gi, 'sq ft')
    .replace(/\bsquare\s*feet\b/gi, 'sq ft')
    .replace(/\bsqryd["']?s?\b/gi, 'sq yards')
    .replace(/\bsq\s*ryd["']?s?\b/gi, 'sq yards')
    .replace(/\bsquare\s*(?:yds?|yrds?)\b/gi, 'square yards')
    .replace(/\((?:\s*ft\.?|\s*feet\s*)\)/gi, ' ft ')
    .replace(/\bfeet\b/gi, 'ft')
    .replace(/\bfeets\b/gi, 'ft')
    .replace(/\beasts\b/gi, 'east')
    .replace(/\bwests\b/gi, 'west')
    .replace(/\bfront(?:\s+age)?\b/gi, 'frontage')
    .replace(/\bpin\s*code\b/gi, 'pincode')
    .replace(/\bplot\s*no\.?\b/gi, 'plot number')
    .replace(/\bplot\s*#\b/gi, 'plot number')
    .replace(/\broad\s+facing\s+side\b/gi, 'road facing')
    .replace(/\bratio\s+(\d{2})\s*[:\-]?\s*(\d{2})\b/gi, 'ratio $1:$2')
    .replace(/\bsu?chi?tra\b/gi, 'Suchitra')
    .replace(/\bsuchithra\b/gi, 'Suchitra')
    .replace(/\balwal\b/gi, 'Alwal')
    .replace(/\bcomercial\b/gi, 'commercial')
    .replace(/\bcommerical\b/gi, 'commercial')
    .replace(/\bborampet\b/gi, 'Bowrampet')
    .replace(/\bmoinaabad\b/gi, 'Moinabad')
    .replace(/\bmoinabad\b/gi, 'Moinabad')
    .replace(/\bconvartion\b/gi, 'conversion')
    .replace(/\bfinal\s+approved\b/gi, 'final approval')
    .replace(/\bnegociable\b/gi, 'negotiable')
    .replace(/\bnegotable\b/gi, 'negotiable')
    .replace(/\branga\s+reddy\b/gi, 'Rangareddy')
    .replace(/\bTG\b/g, 'Telangana')
    .replace(/\bl\s*r\s*s\b/gi, 'LRS')
    .replace(/\bLRS\s*(?:full|fully)\s*paid\b/gi, 'LRS fully paid')
    .replace(/\bowner\s+asking\s+price\b/gi, 'asking price')
    .replace(/\bfully\s+payed\b/gi, 'fully paid')
    .replace(/[ \t]+/g, ' ')
    .trim();

const extractCoordinatesFromMapLink = (link: string) => {
  const match = link.match(/(?:q=|ll=|center=|@)(-?\d+\.?\d*),(-?\d+\.?\d*)/) || link.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const resolveMapLinkCoordinates = async (link: string) => {
  const directCoords = extractCoordinatesFromMapLink(link);
  if (directCoords) return directCoords;

  try {
    const response = await fetch(`${API_BASE}/resolve-map-link?url=${encodeURIComponent(link)}`);
    if (!response.ok) return null;
    const data = await response.json();
    const lat = Number(data?.coordinates?.lat);
    const lng = Number(data?.coordinates?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch (error) {
    console.error('Unable to resolve map link coordinates:', error);
    return null;
  }
};

const propertySpeechCorrections: Array<[RegExp, string]> = [
  [/square\s+arts/gi, 'square yards'],
  [/square\s+guards/gi, 'square yards'],
  [/square\s+yard(s)?/gi, 'square yards'],
  [/front\s+edge/gi, 'frontage'],
  [/front\s+age/gi, 'frontage'],
  [/east\s+washing/gi, 'east facing'],
  [/west\s+washing/gi, 'west facing'],
  [/north\s+party/gi, 'north 40'],
  [/my\s+upur/gi, 'Miyapur'],
  [/mayapur/gi, 'Miyapur'],
  [/meeyapur/gi, 'Miyapur'],
  [/gachi\s*bowli/gi, 'Gachibowli'],
  [/habis\s*guda/gi, 'Habsiguda'],
  [/habsiguda/gi, 'Habsiguda'],
  [/metrol\s+station/gi, 'metro station'],
  [/nadar\s*gul/gi, 'Nadargul'],
  [/kanda\s*wada/gi, 'Kandawada'],
  [/kandawada/gi, 'Kandawada'],
  [/chevella/gi, 'Chevella'],
  [/imam\s*guda/gi, 'Imamguda'],
  [/thukku\s*guda/gi, 'Tukkuguda'],
  [/maheshwaram/gi, 'Maheshwaram'],
  [/khalsa/gi, 'Khalsa'],
  [/ibrahim\s*patnam/gi, 'Ibrahimpatnam'],
  [/ranga\s*reddy/gi, 'Rangareddy'],
  [/turkey\s*amjal/gi, 'Turkayamjal'],
  [/tuku\s*guda/gi, 'Tukkuguda'],
  [/h\s*m\s*d\s*a/gi, 'HMDA'],
  [/d\s*t\s*c\s*p/gi, 'DTCP']
];

const extractMapLinkFromText = (text = '') =>
  text.match(/https?:\/\/(?:maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl\/maps|maps\.google\.com)\/[^\s]+/i)?.[0] || '';

const normalizePropertyText = (text: string) =>
  propertySpeechCorrections.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    text
  ).replace(/\s+/g, ' ').trim();

const normalizeRealEstateSummaryText = (text: string) =>
  normalizePropertyText(text)
    .replace(/\bout\s*right\b/gi, 'outright')
    .replace(/\boutrate\b/gi, 'outright')
    .replace(/\boner\b/gi, 'owner')
    .replace(/\baceres?\b/gi, 'acres')
    .replace(/\bacers?\b/gi, 'acres')
    .replace(/\bacrs?\b/gi, 'acres')
    .replace(/\bacr\b/gi, 'acre')
    .replace(/\b(\d+)\s*-\s*acres?\b/gi, '$1 acres')
    .replace(/\bmondal\b/gi, 'mandal')
    .replace(/\bdistictk\b/gi, 'district')
    .replace(/\bsarver\b/gi, 'survey')
    .replace(/\bdevelop(?:ment)?\s+owner\b/gi, 'development owner')
    .replace(/\bacre\s+price\b/gi, 'per acre price')
    .replace(/\bcr\b/gi, 'Cr')
    .replace(/\bgunta\b/gi, 'guntas')
    .replace(/\bapproach\s+road\b/gi, 'approach road')
    .replace(/\bfeets\b/gi, 'ft')
    .replace(/\bplot\s*no\.?\b/gi, 'plot number')
    .replace(/\bsy\.?\s*no\.?\b/gi, 'Survey No.')
    .replace(/\bsurrounded\s+by\b/gi, 'surrounded by')
    .replace(/\s+([,.])/g, '$1')
    .trim();

const contactNameStopWords = new Set([
  'acre', 'acres', 'advance', 'area', 'bangalore', 'bengaluru', 'builder', 'buyers',
  'city', 'commercial', 'contact', 'crore', 'details', 'development', 'direct',
  'east', 'email', 'facing', 'feet', 'ft', 'genuine', 'hyderabad', 'karnataka',
  'land', 'location', 'mobile', 'name', 'north', 'number', 'only', 'owner',
  'phone', 'plot', 'price', 'property', 'road', 'sale', 'seller', 'south',
  'sq', 'syds', 'telangana', 'villa', 'west', 'yards'
]);

const cleanContactName = (value = '') => {
  const cleaned = value
    .replace(/\b(?:contact\s+details|mobile\s+number|phone\s+number)\b.*$/i, '')
    .replace(/\b(?:mobile|phone|contact|number|email|price|plot|land|road|only|genuine|buyers)\b.*$/i, '')
    .replace(/(?:\+?91[\s.-]?)?[6-9][\d\s.-]{8,20}/g, ' ')
    .replace(/[^A-Za-z.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length || cleaned.length < 3 || cleaned.length > 45 || words.length > 4) return '';
  if (words.some((word) => contactNameStopWords.has(word.toLowerCase()))) return '';
  if (!words.every((word) => /^[A-Z][A-Za-z.]*$/.test(word))) return '';
  return cleaned;
};

const extractLooseContactName = (summary = '', contactPhone = '') => {
  const phonePattern = /(?:\+?91[\s.-]?)?[6-9]\d(?:[\s.-]?\d){8}\b/;
  const explicitLoose =
    summary.match(/\b(?:contact|owner|seller|mediator|agent|person|direct)\s*(?:name)?\s*[:.-]?\s*([A-Z][A-Za-z.\s]{1,45})(?=\s*(?:\n|$|,|\.|mobile|phone|contact|\+?91|[6-9]\d))/i)?.[1] || '';
  const explicitName = cleanContactName(explicitLoose);
  if (explicitName) return explicitName;

  const nameBeforePhone =
    summary.match(/(?:^|[\n,])\s*([A-Z][A-Za-z.\s]{1,45})\s*(?:,|-|:)?\s*(?:\+?91[\s.-]?)?[6-9]\d(?:[\s.-]?\d){8}\b/m)?.[1] || '';
  const phoneName = cleanContactName(nameBeforePhone);
  if (phoneName) return phoneName;

  if (!contactPhone && !phonePattern.test(summary)) return '';
  const lines = String(summary)
    .split(/\r?\n|[|•]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const contactCue = /\b(?:contact|owner|seller|mediator|agent|direct|details|mobile|phone)\b/i;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = cleanContactName(lines[index]);
    if (!candidate) continue;
    const previous = lines[index - 1] || '';
    const next = lines[index + 1] || '';
    if (phonePattern.test(previous) || phonePattern.test(next) || contactCue.test(previous) || contactCue.test(next)) {
      return candidate;
    }
  }
  return '';
};

const extractContactDetailsFromSummary = (summary = '') => {
  const labeledPhone =
    summary.match(/\b(?:contact\s*details|mobile|phone|contact\s*number)\s*[:.-]?\s*((?:\+?91[\s.-]?)?[6-9][\d\s.-]{8,20})/i)?.[1] || '';
  const phoneMatch = labeledPhone || summary.match(/(?:\+?91[\s.-]?)?[6-9]\d(?:[\s.-]?\d){8}\b/)?.[0] || '';
  const contactPhone = phoneMatch.replace(/\D/g, '').slice(-10);
  const contactEmail = summary.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const namePatterns = [
    /\b(?:owner|seller|mediator|contact)\s+(?:name|person)\s*[:.-]?\s*([A-Za-z][A-Za-z.\s]{1,80})/i,
    /\bname\s*[:.-]\s*([A-Za-z][A-Za-z.\s]{1,60})/i,
    /\bcontact\s*[:.-]\s*([A-Za-z][A-Za-z.\s]{1,40})(?=\s*(?:\+?91|[6-9]\d))/i
  ];
  const ownerName = cleanContactName(
    namePatterns
      .map((pattern) => summary.match(pattern)?.[1] || '')
      .find((value) => cleanContactName(value)) || ''
  ) || extractLooseContactName(summary, contactPhone);

  return { contactPhone, contactEmail, ownerName };
};

const extractDeveloperRatio = (summary: string) => {
  const directRatio = summary.match(/\b(?:ratio|developer\s*ratio|development\s*ratio)\s*[:\-]?\s*(\d{1,3})\s*[:\-]\s*(\d{1,3})\b/i);
  if (directRatio) return `${directRatio[1]}:${directRatio[2]}`;

  const trailingRatio = summary.match(/\b(\d{1,3})\s*[:\-]\s*(\d{1,3})\s*(?:ratio|developer\s*ratio|development\s*ratio)\b/i);
  if (trailingRatio) return `${trailingRatio[1]}:${trailingRatio[2]}`;

  const revenueShareRatio =
    summary.match(/\b(?:jv\s*terms?|revenue\s*share|area\s*sharing)\b(?:\s*means?)?\s*[:\-]?\s*(\d{1,3})\s*[:\-]\s*(\d{1,3})\b/i) ||
    summary.match(/\b(\d{1,3})\s*[:\-]\s*(\d{1,3})\s*(?:revenue\s*share|area\s*sharing|jv\s*terms?)\b/i);
  if (revenueShareRatio) return `${revenueShareRatio[1]}:${revenueShareRatio[2]}`;

  const looseJvRatio =
    summary.match(/\bjv\b(?:\s*terms?|\s*means?)?[\s\S]{0,80}?\b(?:land\s*)?owner\b\D{0,20}(\d{1,3})\b[\s\S]{0,50}?\bbuilder\b\D{0,20}(\d{1,3})\b/i) ||
    summary.match(/\bjv\b(?:\s*terms?|\s*means?)?[\s\S]{0,80}?\bbuilder\b\D{0,20}(\d{1,3})\b[\s\S]{0,50}?\b(?:land\s*)?owner\b\D{0,20}(\d{1,3})\b/i) ||
    summary.match(/\bjv\b(?:\s*terms?|\s*means?)?[\s\S]{0,40}?\b(\d{1,3})\s+(\d{1,3})\b/i) ||
    summary.match(/\bjv\b(?:\s*terms?|\s*means?)?[\s\S]{0,60}?\b(\d{1,3})\s*(?::|-|\/|to|owner\s*:?\s*)\s*(\d{1,3})\b/i) ||
    summary.match(/\bjv\b(?:\s*terms?|\s*means?)?[\s\S]{0,80}?\b(\d{1,3})\s*%?\s*(?:land\s*)?owner\b[\s\S]{0,50}?\b(\d{1,3})\s*%?\s*builder\b/i) ||
    summary.match(/\bjv\b(?:\s*terms?|\s*means?)?[\s\S]{0,80}?\b(\d{1,3})\s*%?\s*builder\b[\s\S]{0,50}?\b(\d{1,3})\s*%?\s*(?:land\s*)?owner\b/i);
  if (looseJvRatio) {
    const builderFirst = /\bbuilder\b[\s\S]{0,50}?\b\d{1,3}\s*%?[\s\S]{0,50}?\b(?:land\s*)?owner\b/i.test(looseJvRatio[0]);
    return builderFirst ? `${looseJvRatio[2]}:${looseJvRatio[1]}` : `${looseJvRatio[1]}:${looseJvRatio[2]}`;
  }

  const looseOwnerBuilder = summary.match(/\b(?:ratio\s*)?(\d{1,3})\s*%?\s*(?:land\s*)?owner\b[\s\S]{0,80}?\b(\d{1,3})\s*%?\s*builder\b/i);
  if (looseOwnerBuilder) return `${looseOwnerBuilder[1]}:${looseOwnerBuilder[2]}`;

  const looseBuilderOwner = summary.match(/\b(?:ratio\s*)?(\d{1,3})\s*%?\s*builder\b[\s\S]{0,80}?\b(\d{1,3})\s*%?\s*(?:land\s*)?owner\b/i);
  if (looseBuilderOwner) return `${looseBuilderOwner[2]}:${looseBuilderOwner[1]}`;

  const ownerBeforeBuilder = summary.match(/\b(\d{1,3})\s*%?\s*(?:land\s*)?owner\s*share\b[\s\S]*?\b(\d{1,3})\s*%?\s*builder\s*share\b/i);
  if (ownerBeforeBuilder) return `${ownerBeforeBuilder[1]}:${ownerBeforeBuilder[2]}`;

  const builderBeforeOwner = summary.match(/\b(\d{1,3})\s*%?\s*builder\s*share\b[\s\S]*?\b(\d{1,3})\s*%?\s*(?:land\s*)?owner\s*share\b/i);
  if (builderBeforeOwner) return `${builderBeforeOwner[2]}:${builderBeforeOwner[1]}`;

  const ownerShare = summary.match(/\b(?:land\s*)?owner\s*share\s*[:\-]?\s*(\d{1,3})\s*%?/i)?.[1];
  const builderShare = summary.match(/\bbuilder\s*share\s*[:\-]?\s*(\d{1,3})\s*%?/i)?.[1];
  return ownerShare && builderShare ? `${ownerShare}:${builderShare}` : '';
};

const extractPartlySaleDetails = (summary: string, perAcrePrice = '') => {
  const explicitPartlySale = summary.match(/(?:partly\s*sale|part\s*sale|partial\s*sale)\s*[:\-]?\s*(yes|no)?\s*([\d,.]+)?\s*(acres?|sq\.?\s*ft|square\s*feet|sqft|sq\.?\s*yards?|square\s*yards?)?/i);
  if (explicitPartlySale) {
    const unitText = explicitPartlySale[3] || '';
    return {
      partlySale: explicitPartlySale[1]?.toLowerCase() || (explicitPartlySale[2] ? 'yes' : ''),
      partlySaleValue: explicitPartlySale[2]?.replace(/,/g, '') || '',
      partlySaleUnit: /acre/i.test(unitText) ? 'Acres' : /\b(?:sq\.?\s*ft|square\s*feet|sqft)\b/i.test(unitText) ? 'Square Feet' : 'Square Yard',
      partlySalePrice: ''
    };
  }

  const outrightPart =
    summary.match(/\b([\d,.]+)\s*(?:acres?|acre)\s+(?:outright|out\s*right|outrate)\b/i) ||
    summary.match(/\b(?:outright|out\s*right|outrate)\s+([\d,.]+)\s*(?:acres?|acre)\b/i);
  if (!outrightPart) {
    return { partlySale: '', partlySaleValue: '', partlySaleUnit: 'Square Yard', partlySalePrice: '' };
  }

  const outrightIndex = summary.toLowerCase().indexOf(outrightPart[0].toLowerCase());
  const outrightContext = outrightIndex >= 0 ? summary.slice(outrightIndex, outrightIndex + 180) : outrightPart[0];
  const outrightPrice = extractAmount(outrightContext, [
    /\b(?:outright|out\s*right|outrate)[\s\S]{0,80}?(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?\s*(?:per|\/)\s*acres?\b/i,
    /\b(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?\s*(?:per|\/)\s*acres?\b/i,
    /\b(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?\b/i
  ]);

  return {
    partlySale: 'yes',
    partlySaleValue: outrightPart[1]?.replace(/,/g, '') || '',
    partlySaleUnit: 'Acres',
    partlySalePrice: outrightPrice || perAcrePrice
  };
};

const voiceSuggestions = (raw: string, normalized: string) => {
  if (!raw || raw === normalized) return [];
  const suggestions: string[] = [];
  if (/mayapur|my\s+upur|meeyapur/i.test(raw)) suggestions.push('Miyapur');
  if (/nadar\s*gul/i.test(raw)) suggestions.push('Nadargul');
  if (/gachi\s*bowli/i.test(raw)) suggestions.push('Gachibowli');
  return suggestions;
};

const cleanLocationPart = (value = '') =>
  value
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\b(?:north|south|east|west)\s*\d+(?:\.\d+)?\b/gi, '')
    .replace(/\b(?:for|prime|location|development|north|south|east|west|side|length|width|ft|feet|feets|meter|meters|metre|metres|meeters?|only|highway|facing|frontage|road|roads|size|sq|square|yards?|acres?|area|plot|standalone|villa|high[- ]?rise|plotted|open[- ]?plot|hmda|dtcp|gp|final|approval|approved|layout|outright|price|asking|market|direct|owner|builder|gunta|guntas|goodwill|advance|commercial|terms|lakhs?|lacs?|cr|crore|per|sale|selling|budget|amount|approach|survey|sy|no|number|venture|phase|block|club|house|beside|mandal|district|village|tg|telangana|towers?|surrounded|ratio|pincode|pin|code|dimension|dimensions?|lrs|fully|paid|negotiable|slightly|extra|charges?|corpus|fund|total|zone|r1|r2|r3|nala|conversion|genuine|buyers?|contact|remaining|land)\b/gi, '')
    .replace(/\b\d+(?:\.\d+)?\b/g, '')
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractNamedText = (summary: string, labels: string[]) => {
  for (const label of labels) {
    const pattern = new RegExp(`\\b${label}\\b\\s*(?:name|street|address)?\\s*[:\\-]?\\s*([^,\\n]+)`, 'i');
    const match = summary.match(pattern);
    if (match?.[1]) return cleanLocationPart(match[1]);
  }
  return '';
};

const cleanVillageCandidate = (value = '') => {
  const cleaned = cleanLocationPart(value)
    .replace(/\b(?:with|builder|khajoor|dates?|farm|total|compound|wall|gate|fix)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length > 2 ? words.slice(-2).join(' ') : cleaned;
};

const cleanLocalityCandidate = (part: string, knownStates: string[], knownCities: string[], pincode: string) => {
  let cleaned = cleanLocationPart(part);
  if (pincode) cleaned = cleaned.replace(new RegExp(`\\b${pincode}\\b`, 'g'), ' ');
  [...knownStates, ...knownCities].forEach((name) => {
    cleaned = cleaned.replace(new RegExp(`\\b${name}\\b`, 'ig'), ' ');
  });
  return cleaned.replace(/\s+/g, ' ').trim();
};

const localityPincodeLookup: Record<string, string> = {
  miyapur: '500049',
  madinaguda: '500049',
  chandanagar: '500050',
  chanda_nagar: '500050',
  lingampally: '500019',
  serilingampally: '500019',
  kondapur: '500084',
  kukatpally: '500072',
  kphb: '500072',
  nizampet: '500090',
  manneguda: '501510',
  mangalguda: '501510',
  turkayamjal: '501510',
  injapur: '501510',
  tukkuguda: '501359',
  maheshwaram: '501359',
  nadargul: '501510',
  nadergul: '501510',
  kokapet: '500075',
  gachibowli: '500032',
  financial_district: '500032',
  nanakramguda: '500032',
  narsingi: '500075',
  jubilee_hills: '500033',
  jubileehills: '500033',
  bowrampet: '500043',
  bachupally: '500090',
  patancheru: '502319',
  tellapur: '502032',
  kollur: '502300',
  isnapur: '502307',
  shankarpally: '501203',
  bongulur: '501510',
  lb_nagar: '500074',
  lbnagar: '500074',
  l_b_nagar: '500074',
  kothapet: '500035',
  dilsukhnagar: '500060',
  uppal: '500039',
  habsiguda: '500007',
  habisguda: '500007',
  habsigudanacharam: '500007',
  habsiguda_nacharam: '500007',
  habsiguda_nacharam_main_road: '500007',
  habisguda_nacharam_main_road: '500007',
  nacharam: '500076',
  mallapur: '500076',
  cherlapally: '501301',
  kompally: '500014',
  medchal: '501401',
  shamshabad: '501218',
  shamsabad: '501218',
  rajendranagar: '500030',
  manikonda: '500089',
  shaikpet: '500008',
  suchitra: '500067',
  alwal: '500010',
  sainikpuri: '500094',
  ecil: '500062',
  meerpet: '500097',
  hayathnagar: '501505',
  vanasthalipuram: '500070',
  pocharam: '500088',
  ghatkesar: '501301',
  boduppal: '500092',
  khalsa: '501506',
  ibrahimpatnam: '501506',
  rangareddy: '501506',
  khalsa_village: '501506',
  kandawada: '501503',
  kandwada: '501503',
  chevella: '501503',
  moinabad: '501504',
  moinaabad: '501504',
  venkatapur: '501504',
  imamguda: '501359',
  imam_guda: '501359',
  thukkuguda: '501359',
  maheshwaram_mandal: '501359',
  devanahalli: '562110',
  devanahalli_bengaluru_rural: '562110',
  brigade_orchards: '562110',
  brigade_orchards_sector: '562110',
  bengaluru_rural: '562110',
  thanisandra: '560077',
  thanisandra_main_road: '560077',
  manyata_tech_park: '560077',
  manyata_tech_park_peripheral_belt: '560077',
  bengaluru_urban: '560077'
};

const pincodeForLocality = (locality = '') => {
  const key = locality.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const compactKey = key.replace(/_/g, '');
  return localityPincodeLookup[key]
    || localityPincodeLookup[compactKey]
    || Object.entries(localityPincodeLookup).sort((a, b) => b[0].length - a[0].length).find(([localityKey]) =>
      key.includes(localityKey) || compactKey.includes(localityKey.replace(/_/g, ''))
    )?.[1]
    || '';
};

const pincodeForLocationParts = (...parts: Array<string | undefined>) => {
  const values = parts.map((part) => String(part || '').trim()).filter(Boolean);
  const explicit = values.join(' ').match(/\b\d{6}\b/)?.[0];
  if (explicit) return explicit;
  for (const value of values) {
    const direct = pincodeForLocality(value);
    if (direct) return direct;
  }
  return pincodeForLocality(values.join(' '));
};

const localityNameFromLookup = (value = '') => {
  const key = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const compactKey = key.replace(/_/g, '');
  const match = Object.keys(localityPincodeLookup)
    .sort((a, b) => b.length - a.length)
    .find((localityKey) => {
      const compactLocality = localityKey.replace(/_/g, '');
      return key.includes(localityKey) || compactKey.includes(compactLocality);
    });
  return match ? titleCase(match.replace(/_/g, ' ')) : '';
};

const titleCase = (value = '') =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const cleanProjectName = (value = '') =>
  value
    .replace(/[^\w\s.'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+-\s+/g, ' - ');

const extractPerAcrePrice = (summary: string) => {
  const patterns = [
    /\b(?:per\s*acres?|per\s*acres?\s*price|acre\s*price)\s*[:\-]?\s*(?:is\s*)?(?:rs\.?|inr|₹)?\s*([\d,.]+)(?![\d,.])\s*(cr|crores?|lakhs?|lacs?|l)?\b(?!\s*(?:ft|feet|road)\b)/i,
    /\b(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crore|lakh|lac|l)\s*(?:per\s*)?acres?\s*price\b/i,
    /\b(?:outright\s*price|outrate\s*price|price|outright)?\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crore|lakh|lac|l)?\s*(?:per|\/)\s*acres?\b/i,
    /\b(?:rs\.?|inr|₹)?\s*([\d,]*\.?\d+)\s*(cr|crore|lakh|lac|l)\s*(?:per|\/)\s*acres?\b/i
  ];
  return extractAmount(summary, patterns);
};

const extractPerSqYardPrice = (summary: string) => {
  if (extractPerAcrePrice(summary)) return '';

  const directAmountBeforePerAcre = summary.match(/\b(?:rs\.?|inr|₹)?\s*([\d,]*\.?\d+)\s*(cr|crore|lakh|lac|l)\s*(?:per|\/)\s*acres?\b/i);
  if (directAmountBeforePerAcre?.[1]) {
    const value = Number(directAmountBeforePerAcre[1].replace(/,/g, ''));
    const unit = String(directAmountBeforePerAcre[2] || '').toLowerCase();
    if (Number.isFinite(value)) {
      if (/cr|crore/.test(unit)) return String(value * 10000000);
      if (/l|lac|lakh/.test(unit)) return String(value * 100000);
      return String(value);
    }
  }

  const perAcre = summary.match(/\bper\s*acres?\s*[:\-]?\s*(?:is\s*)?(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crore|lakh|lac|l)?\b/i);
  if (perAcre?.[1]) {
    const amount = extractAmount(summary, [/\bper\s*acres?\s*[:\-]?\s*(?:is\s*)?(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crore|lakh|lac|l)?\b/i]);
    if (amount) return amount;
  }

  const amountBeforePerAcre = summary.match(/\b(?:outright\s*price|price|outright)?\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crore|lakh|lac|l)?\s*(?:per|\/)\s*acres?\b/i);
  if (amountBeforePerAcre?.[1]) {
    const value = Number(amountBeforePerAcre[1].replace(/,/g, ''));
    const unit = String(amountBeforePerAcre[2] || '').toLowerCase();
    if (Number.isFinite(value)) {
      if (/cr|crore/.test(unit)) return String(value * 10000000);
      if (/l|lac|lakh/.test(unit)) return String(value * 100000);
      return String(value);
    }
  }

  const looseAmountBeforePerAcre = summary.match(/\b(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crore|lakh|lac|l)\s*(?:per|\/)\s*acres?\b/i);
  if (looseAmountBeforePerAcre?.[1]) {
    const value = Number(looseAmountBeforePerAcre[1].replace(/,/g, ''));
    const unit = String(looseAmountBeforePerAcre[2] || '').toLowerCase();
    if (Number.isFinite(value)) {
      if (/cr|crore/.test(unit)) return String(value * 10000000);
      if (/l|lac|lakh/.test(unit)) return String(value * 100000);
      return String(value);
    }
  }

  const lakhPerSqYard = summary.match(/\b(?:price\s*[:\-]?\s*)?(?:rs\.?|inr|₹)?\s*([\d,]*\.?\d+)\s*(lakh|lakhs|lac|lacs|l)\s*(?:per|\/)\s*(?:sq\.?\s*yards?|square\s*yards?|sqyds?|yard)\b/i);
  if (lakhPerSqYard?.[1]) {
    const value = Number(lakhPerSqYard[1].replace(/,/g, ''));
    if (Number.isFinite(value)) return String(value * 100000);
  }

  const shorthand = summary.match(/\bprice\s*[:\-]?\s*(?:is\s*)?(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(k|thousand)?\s*(?:per|\/)\s*(?:sq\.?\s*yards?|square\s*yards?|sqyds?|yard)\b/i);
  if (shorthand?.[1]) {
    const value = Number(shorthand[1].replace(/,/g, ''));
    if (Number.isFinite(value)) {
      return String(/k|thousand/i.test(shorthand[2] || '') ? value * 1000 : value);
    }
  }

  const asking =
    summary.match(/\basking\s*price\s*[:\-]?\s*(?:price\s*)?(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*\/?-?\s*(?:per\s*)?(?:sq\.?\s*yards?|square\s*yards?|yard)?/i)?.[1] ||
    summary.match(/\basking\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*\/?-?\s*(?:per\s*)?(?:sq\.?\s*yards?|square\s*yards?|yard)?/i)?.[1] ||
    '';
  const market =
    summary.match(/\bmarket\s*price\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*\/?-?\s*(?:per\s*)?(?:sq\.?\s*yards?|square\s*yards?|yard)?/i)?.[1] ||
    '';
  const direct =
    summary.match(/\b(?:sq(?:uare)?\s*yard\s*price|price)\s*[:\-]?\s*(?:is\s*)?(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(cr|crore|lakh|lac|l)?(?:\s*(?:per|\/)\s*(?:sq\.?\s*yards?|square\s*yards?))?/i);
  return (asking || market || (direct?.[1] || '')).replace(/,/g, '');
};

const extractDirectionalRoadSizes = (summary: string) => {
  const roads: Partial<Record<'North' | 'South' | 'East' | 'West', string>> = {};
  const pairedRoadPattern = /\b(north|south|east|west)\s*(?:&|and)\s*(north|south|east|west)\s*([\d,.]*\d[\d,.]*)\s*\/\s*([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s*roads?\b/gi;
  const pattern = /\b(north|south|east|west)\s*[:\-]?\s*([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s*road\b|\b([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s+(north|south|east|west)\s+road\b/gi;
  let match: RegExpExecArray | null;

  while ((match = pairedRoadPattern.exec(summary)) !== null) {
    const firstSide = normalizeDirection(match[1]) as 'North' | 'South' | 'East' | 'West';
    const secondSide = normalizeDirection(match[2]) as 'North' | 'South' | 'East' | 'West';
    const firstValue = (match[3] || '').replace(/,/g, '');
    const secondValue = (match[4] || '').replace(/,/g, '');
    if (firstSide && firstValue) roads[firstSide] = firstValue;
    if (secondSide && secondValue) roads[secondSide] = secondValue;
  }

  while ((match = pattern.exec(summary)) !== null) {
    const side = normalizeDirection(match[1] || match[4]) as 'North' | 'South' | 'East' | 'West';
    const value = (match[2] || match[3] || '').replace(/,/g, '');
    if (side && value) {
      roads[side] = value;
    }
  }

  return roads;
};

const selectRoadFacingFromDirectionalRoads = (roads: Partial<Record<'North' | 'South' | 'East' | 'West', string>>) => {
  const entries = Object.entries(roads)
    .map(([side, value]) => ({ side, value: Number(String(value).replace(/,/g, '')) }))
    .filter((entry) => Number.isFinite(entry.value) && entry.value > 0);

  if (!entries.length) return '';

  return entries.sort((a, b) => b.value - a.value)[0].side;
};

const extractRoadSizeFromSummary = (
  summary: string,
  facing = '',
  directionalRoadSizes: Partial<Record<'North' | 'South' | 'East' | 'West', string>> = {},
  defaultWhenRoadMentioned = false
) => {
  const facingRoadSize = directionalRoadSizes[facing as 'North' | 'South' | 'East' | 'West'];
  if (facingRoadSize) return facingRoadSize;

  const cornerRoadPair =
    summary.match(/\b([\d,.]*\d[\d,.]*)\s*(?:&|and|\/)\s*([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s*roads?\s+corner\b/i) ||
    summary.match(/\bcorner\b[^.\n,;]*?([\d,.]*\d[\d,.]*)\s*(?:&|and|\/)\s*([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s*roads?\b/i);

  if (cornerRoadPair?.[1] && cornerRoadPair?.[2]) {
    const values = [cornerRoadPair[1], cornerRoadPair[2]]
      .map((value) => Number(value.replace(/,/g, '')))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length) return String(Math.max(...values));
  }

  const approachRoadPair =
    summary.match(/\bapproach\s+roads?\s*[:\-]?\s*([\d,.]*\d[\d,.]*)\s*(?:&|and|\/)\s*([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s*roads?\b/i) ||
    summary.match(/\b([\d,.]*\d[\d,.]*)\s*(?:&|and|\/)\s*([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s*roads?\s+respectively\b/i);

  if (approachRoadPair?.[1] && approachRoadPair?.[2]) {
    const values = [approachRoadPair[1], approachRoadPair[2]]
      .map((value) => Number(value.replace(/,/g, '')))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length) return String(Math.max(...values));
  }

  const roadRange =
    summary.match(/\b(?:main\s*)?road\b[^.\n,;]*?([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s*(?:to|-|–|—)\s*([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?/i) ||
    summary.match(/\b([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?\s*(?:to|-|–|—)\s*([\d,.]*\d[\d,.]*)\s*(?:ft|feet)?[^.\n,;]*?\b(?:main\s*)?road\b/i);

  if (roadRange?.[1] && roadRange?.[2]) {
    const values = [roadRange[1], roadRange[2]]
      .map((value) => Number(value.replace(/,/g, '')))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length) return String(Math.max(...values));
  }

  const genericRoad = summary.match(/\b(?:main\s*)?road\b[^.\n,;]*?([\d,.]*\d[\d,.]*)\s*(?:ft|feet)\b/i)?.[1]
    || summary.match(/\broads?\s*[:\-]?\s*([\d,.]*\d[\d,.]*)\s*(?:'|ft|feet)?\s*(?:wide|wides|width)?\b/i)?.[1]
    || summary.match(/\b([\d,.]*\d[\d,.]*)\s*(?:ft|feet)\s*(?:main\s*)?road\b/i)?.[1];

  if (genericRoad) return genericRoad.replace(/,/g, '');
  return defaultWhenRoadMentioned && /\b(?:road|black\s*top|bt\s*road|blacktop)\b/i.test(summary) ? '30' : '';
};

const stripLocationLinks = (value = '') =>
  value
    .replace(/https?:\/\/(?:maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl\/maps|maps\.google\.com)\/\S+/gi, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/(?:👆\s*)?plot\s+location(?:\s*👆)?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractNearestLandmarkFromSummary = (summary: string, locality = '') => {
  const candidates: Array<{ name: string; distance: number }> = [];
  const distancePattern = /\b([A-Za-z][A-Za-z\s.'-]{1,60}?)(?:\s+)?(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers?)\b/gi;
  let match: RegExpExecArray | null;

  while ((match = distancePattern.exec(summary))) {
    const name = titleCase(cleanLocationPart(match[1] || ''))
      .replace(/\b(?:excellent|location|investment|for|from|to|and|or|direct|owner)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const distance = Number(match[2]);
    if (name && Number.isFinite(distance)) candidates.push({ name, distance });
  }

  const nearest = candidates.sort((a, b) => a.distance - b.distance)[0]?.name || '';
  if (nearest) return nearest;
  return locality ? `${titleCase(cleanLocationPart(locality))} Main Road` : '';
};

const extractLocationFields = (summary: string) => {
  const explicitPincode = summary.match(/\bpincode\s*[:\-]?\s*(\d{6})\b/i)?.[1] || summary.match(/\b\d{6}\b/)?.[0] || '';
  const knownStates = ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra'];
  const knownCities = ['Hyderabad', 'Secunderabad', 'Ibrahimpatnam', 'Chevella', 'Maheshwaram', 'Bengaluru', 'Bangalore', 'Chennai', 'Mumbai', 'Pune'];
  const villageName = titleCase(cleanVillageCandidate(
    summary.match(/\bvillage(?:\s*(?:&|and)\s*mandal)?\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]+?)(?:,|\n|$)/i)?.[1] ||
    summary.match(/@\s*([A-Za-z][A-Za-z\s.'-]+?)\s*\(\s*(?:V|village)\s*\)/i)?.[1] ||
    summary.match(/\b([A-Za-z][A-Za-z\s.'-]+?)\s*\(\s*(?:V|village)\s*\)/i)?.[1] ||
    summary.match(/\b([A-Za-z][A-Za-z\s.'-]+?)\s+village\b/i)?.[1] ||
    ''
  ));
  const mandalName = titleCase(cleanLocationPart(
    summary.match(/\b(?:village\s*(?:&|and)\s*)?mandal\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]+?)(?:,|\n|$)/i)?.[1] ||
    summary.match(/\b([A-Za-z][A-Za-z\s.'-]+?)\s*\(\s*(?:M|mandal)\s*\)/i)?.[1] ||
    summary.match(/\b([A-Za-z][A-Za-z\s.'-]+?)\s+mandal\b/i)?.[1] ||
    ''
  ));
  const districtName = titleCase(cleanLocationPart(
    summary.match(/\b([A-Za-z][A-Za-z\s.'-]+?)\s+district\b/i)?.[1] ||
    summary.match(/\bdistrict\s*[:\-]\s*([A-Za-z][A-Za-z\s.'-]+?)(?:,|\n|$)/i)?.[1] ||
    summary.match(/\b([A-Za-z][A-Za-z\s.'-]+?)\s*\(\s*(?:D|district)\s*\)/i)?.[1] ||
    ''
  ));
  const isKarnatakaSummary = /\b(?:KA|Karnataka|Bengaluru\s+(?:Rural|Urban)|Bangalore\s+(?:Rural|Urban)|Devanahalli|Brigade\s+Orchards|Thanisandra|Manyata\s+Tech\s+Park)\b/i.test(summary);
  const state = extractChoice(summary, knownStates) || (isKarnatakaSummary ? 'Karnataka' : 'Telangana');
  const city = mandalName || extractChoice(summary, knownCities) || (isKarnatakaSummary ? 'Bengaluru' : 'Hyderabad');
  const colonyName = extractNamedText(summary, ['colony']);
  const besideLandmark = summary.match(/\bbeside\s+([^,\n.]+)/i)?.[1]
    ? `Beside ${titleCase(cleanLocationPart(summary.match(/\bbeside\s+([^,\n.]+)/i)?.[1] || ''))}`
    : '';
  const metroStationLandmark = summary.match(/\b([A-Za-z][A-Za-z\s.'-]*?)\s+metro\s+station\b/i)?.[0] || '';
  let landmark = extractNamedText(summary, ['landmark', 'street', 'near'])
    || besideLandmark
    || (metroStationLandmark ? titleCase(cleanLocationPart(metroStationLandmark)) : '');
  const atLocation = titleCase(cleanLocationPart(
    summary.match(/@\s*([A-Za-z][A-Za-z\s.'-]+?)(?:\s|,|\.|\n|$)/i)?.[1] ||
    summary.match(/\bat\s+([A-Za-z][A-Za-z\s.'-]+?)(?:[,.]|\n|$)/i)?.[1] ||
    ''
  ));
  let locality = villageName || atLocation || extractNamedText(summary, ['locality', 'location']);
  const lookupLocality = localityNameFromLookup(summary);
  const roadLocation =
    summary.match(/\b([A-Za-z][A-Za-z\s.'-]+?)\s*(?:-|–|—|to)\s*([A-Za-z][A-Za-z\s.'-]+?)\s+(?:main\s+)?road\b/i)
      ?.slice(1, 3)
      .map((part) => cleanLocationPart(part))
      .filter(Boolean)
      .join(' to ') || '';

  if (!locality) {
    if (roadLocation) {
      locality = `${roadLocation} Main Road`;
    }
  }

  if (lookupLocality && (!locality || lookupLocality.toLowerCase().includes(locality.toLowerCase()))) {
    locality = lookupLocality;
  }

  if (!locality && lookupLocality) {
    locality = lookupLocality;
  }

  if (!locality) {
    const locationPartWithPincode = explicitPincode
      ? summary
          .split(/,|\n/)
          .map((part) => cleanLocalityCandidate(part, knownStates, knownCities, explicitPincode))
          .find((part) => part && part.length > 2)
      : '';

    const parts = summary
      .split(/,|\n/)
      .map((part) => cleanLocalityCandidate(part, knownStates, knownCities, explicitPincode))
      .filter(Boolean)
      .filter((part) => !/^\d+$/.test(part))
      .filter((part) => part.length > 2)
      .filter((part) => !/^(?:by|and|or|with|near|from|to)$/i.test(part))
      .filter((part) => !/^\d+\s*(?:ft|sq yards|yards?|acres?)?$/i.test(part))
      .filter((part) => !/\b(?:ft|side|length|width|price|road|owner|direct|outright|surrounded|goodwill|advance|lakhs?|lacs?|cr|crore|per acre|commercial terms|approach|survey|sy no|high rise|tower|ratio|pincode)\b/i.test(part))
      .filter((part) => !new RegExp(`^(${knownStates.join('|')}|${knownCities.join('|')})$`, 'i').test(part))
      .filter((part) => !/\b(?:north|south|east|west|frontage|road|facing|sq|yards?|acres?|standalone|villa|high[- ]?rise|plotted|open[- ]?plot)\b/i.test(part));
    locality = locationPartWithPincode || parts[parts.length - 1] || '';
  }

  const resolvedPincode = explicitPincode || pincodeForLocationParts(locality, lookupLocality, colonyName, landmark, roadLocation, city, state, summary);
  landmark = landmark || extractNearestLandmarkFromSummary(summary, locality || lookupLocality || colonyName || city);

  return {
    state,
    city,
    locality: locality || colonyName,
    societyName: colonyName,
    landmark: landmark || (roadLocation ? `${roadLocation} Main Road` : ''),
    mandal: mandalName,
    district: districtName,
    pincode: resolvedPincode
  };
};

const parseSummary = (summary: string) => {
  const normalizedSummary = normalizeSummaryForParsing(summary);
  const text = normalizedSummary.toLowerCase();
  const usesAcreArea = /acre/i.test(normalizedSummary);
  const usesSqFtArea = /\b(?:sq\.?\s*ft|square\s*feet|sqft)\b/i.test(normalizedSummary);
  const approvalType = /hmda\s*(?:final\s*)?approval|hmda\s*approved|hmda\s*layout/i.test(normalizedSummary)
    ? 'HMDA Final Approval Layout'
    : /dtcp\s*(?:final\s*)?approval|dtcp\s*approved|dtcp\s*layout/i.test(normalizedSummary)
      ? 'DTCP Approved Layout'
      : /gp\s*layout|gram\s*panchayat/i.test(normalizedSummary)
        ? 'GP Layout'
        : /lrs\s*(?:fully\s*)?paid/i.test(normalizedSummary)
          ? 'LRS Fully Paid'
        : '';
  // Needed early to classify property type by floor count (see below) -
  // extractFloorDetails is cheap (a couple of regex tests) and is called
  // again later for the actual floorNumber/totalFloors fields.
  const earlyTotalFloors = Number(extractFloorDetails(normalizedSummary).totalFloors) || 0;

  const developmentType = approvalType.includes('HMDA')
    ? 'hmda-layout'
    : approvalType.includes('DTCP')
      ? 'dtcp-layout'
      : approvalType.includes('GP')
        ? 'gp-layout'
        : /farm\s*plots?\s+development|farm\s*plots?\b|plotted\s+development/i.test(normalizedSummary)
          ? 'plotted'
          : /farm\s*house(?:s)?\b|farmhouse(?:s)?\b/i.test(normalizedSummary)
            ? 'farm-house'
          : /group\s*house(?:s|ing)?\b/i.test(normalizedSummary)
            ? 'group-house'
          : /gated\s*(?:residential\s*)?communit(?:y|ies)/i.test(normalizedSummary)
            ? 'gated-community'
          : /high[- ]?rise|hi[- ]?rise|sky\s*rise/i.test(normalizedSummary)
            ? 'high-rise'
          : /residential\s*house\b|independent\s*house\b/i.test(normalizedSummary)
            ? 'residential-house'
          : /villa\s+development|development\s+site|villas?\b/i.test(normalizedSummary)
          ? 'villa'
          // A specific total-floor count is a stronger signal than the
          // generic "apartment"/"flat" wording every one of these types
          // also uses, so it's checked first: >8 floors reads as a
          // high-rise tower, 6-8 as a mid-rise gated community.
          : earlyTotalFloors > 8
            ? 'high-rise'
          : earlyTotalFloors > 5
            ? 'gated-community'
          : /\bapartments?\b|\bflats?\b/i.test(normalizedSummary)
            ? 'apartment'
          : /\bstandalone\s*(?:building|house)?\b/i.test(normalizedSummary)
            ? 'standalone'
        : usesAcreArea && /\b(?:land|plot|acres?|outright|purchase|sale|sell|buy)\b/i.test(normalizedSummary)
          ? 'land'
        : /commercial\s+(?:plot|land)|plot\s+for\s+sale|land\s+for\s+sale/i.test(normalizedSummary)
          ? 'open-plot'
          : extractChoice(text, ['apartment', 'standalone', 'high-rise', 'gated-community', 'group-house', 'residential-house', 'villa', 'farm-house', 'plotted', 'open-plot', 'land', 'hmda-layout', 'gp-layout', 'dtcp-layout']) || 'standalone';
  const apartmentLikeTypes = ['apartment', 'standalone', 'high-rise', 'gated-community', 'group-house'];
  const isApartmentLikeSummary = apartmentLikeTypes.includes(developmentType);
  const areaUnit = usesAcreArea ? 'Acres' : usesSqFtArea ? 'Sq Ft' : 'Sq Yards';
  const locationFields = extractLocationFields(normalizedSummary);
  const totalArea = extractAreaFromSummary(normalizedSummary);
  const extractedDimensionPair = extractPlotDimensionPair(normalizedSummary);
  const plotDimensionMatch = normalizedSummary.match(/(?:dimension|plot\s*dimension|dimensions?|sizes?)\s*[:\-]?\s*([\d,.]+)\s*(?:'|ft|feet)?\s*(?:x|×|by|\*)\s*([\d,.]+)/i);
  const frontagePattern = /(?:frontage(?:\s*width)?|frontage\s*plot)(?:\s*\(?\s*(?:ft|feet)\s*\)?)?\s*[:\-]?\s*([\d,.]+)/i;
  const explicitFrontageWidth = extractNumber(normalizedSummary, [frontagePattern]);
  const skipPlotDimensions = isLargeAcreLand({ areaUnit, totalArea });
  // Plot Dimensions (North/South/East/West) are no longer a field in the property
  // form, so only use dimensions the summary explicitly states - never fabricate
  // them geometrically from the total area.
  const dimensionLength = formatFeet(extractedDimensionPair.length || plotDimensionMatch?.[1] || '');
  const dimensionWidth = formatFeet(extractedDimensionPair.width || plotDimensionMatch?.[2] || '');
  const directionalRoadSizes = extractDirectionalRoadSizes(normalizedSummary);
  const roadFacingFromRoads = selectRoadFacingFromDirectionalRoads(directionalRoadSizes);
  const cornerFacing = extractCornerFacingFromSummary(normalizedSummary);
  const explicitRoadFacing = normalizedSummary.match(/(?:road\s*facing(?:\s*direction)?|frontage\s*(?:side|direction)?)\s*[:\-]?\s*(north-east|north-west|south-east|south-west|north|south|east|west)/i)?.[1] || '';
  const spokenFacing =
    normalizedSummary.match(/\bfaces?\s*[:\-]?\s*(north-east|north-west|south-east|south-west|north|south|east|west|easts|wests)\b/i)?.[1] ||
    normalizedSummary.match(/\b(north-east|north-west|south-east|south-west|north|south|east|west)\s+facing\b/i)?.[1] ||
    normalizedSummary.match(/\bfacing\s*[:\-]?\s*(north-east|north-west|south-east|south-west|north|south|east|west)\b/i)?.[1] ||
    '';
  const facing = normalizeDirection(spokenFacing || explicitRoadFacing || cornerFacing || roadFacingFromRoads);
  const dimensionNorthSouth = ['North', 'South'].includes(facing) ? dimensionWidth : dimensionLength;
  const dimensionEastWest = ['East', 'West'].includes(facing) ? dimensionWidth : dimensionLength;
  const northSideLength = extractSideLengthFromSummary(normalizedSummary, 'north') || dimensionNorthSouth;
  const southSideLength = extractSideLengthFromSummary(normalizedSummary, 'south') || dimensionNorthSouth;
  const eastSideLength = extractSideLengthFromSummary(normalizedSummary, 'east') || dimensionEastWest;
  const westSideLength = extractSideLengthFromSummary(normalizedSummary, 'west') || dimensionEastWest;
  const inferredFrontage = facing === 'North'
    ? northSideLength
    : facing === 'South'
      ? southSideLength
      : facing === 'East'
        ? eastSideLength
        : facing === 'West'
          ? westSideLength
          : eastSideLength || westSideLength || dimensionEastWest;
  const finalFacing = facing || (skipPlotDimensions ? 'East' : '');
  const finalRoadFacingDirection = extractChoice(normalizeDirection(explicitRoadFacing) || roadFacingFromRoads || finalFacing, ['North', 'South', 'East', 'West']);
  const finalFrontageWidth = explicitFrontageWidth || inferredFrontage || (skipPlotDimensions ? '120' : '');
  const finalRoadSize = extractRoadSizeFromSummary(normalizedSummary, finalFacing, directionalRoadSizes, skipPlotDimensions) || (skipPlotDimensions ? '30' : '');
  const finalZoningClassification = /\bcommercial\b/i.test(normalizedSummary)
    ? 'Commercial'
    : /\br[123]\s*zone\b|villa\s+block|residential|hmda/i.test(normalizedSummary)
      ? 'Residential'
      : extractChoice(normalizedSummary, ['Residential', 'Commercial', 'Mixed Use', 'Agricultural', 'Industrial'])
        || (skipPlotDimensions ? 'Residential' : '');
  const developerRatio = extractDeveloperRatio(normalizedSummary);
  const hasDevelopmentTerms = Boolean(developerRatio || /\bfarm\s*plots?\s+development\b|\bdevelopment\s+advance\b/i.test(normalizedSummary));
  const plotNumber = normalizedSummary.match(/\bplot\s*numbers?\s*[:#-]?\s*([A-Za-z0-9/&\s-]+?)(?:\s*\(|,|\n|$)/i)?.[1]?.trim() || '';
  const ventureName = cleanProjectName(normalizedSummary.match(/\bventure(?:\s*name)?\s*[:\-]?\s*([^\n.]+)/i)?.[1] || '');
  const blockName = cleanProjectName(normalizedSummary.match(/\(\s*([A-Za-z0-9\s.'-]*block)\s*\)/i)?.[1] || '');
  const marketPrice = (normalizedSummary.match(/\bmarket\s*price\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*\/?/i)?.[1] || '').replace(/,/g, '');
  const askingPrice = (normalizedSummary.match(/\basking\s*price\s*[:\-]?\s*(?:price\s*)?(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*\/?/i)?.[1] || '').replace(/,/g, '');
  const extraCharges = normalizedSummary.match(/\bextra\s*charges\s*[:\-]?\s*([^\n.]+)/i)?.[1]?.trim() || '';
  const contactDetails = extractContactDetailsFromSummary(normalizedSummary);
  const perAcrePrice = extractPerAcrePrice(normalizedSummary);
  const perSqYardPrice = extractPerSqYardPrice(normalizedSummary);
  const partlySaleDetails = extractPartlySaleDetails(normalizedSummary, perAcrePrice);
  const advanceAmount = /\b(?:zero\s+advance|advance\s*[:\-]?\s*zero)\b/i.test(normalizedSummary)
    ? '0'
    : extractAmount(normalizedSummary, [
      /advance\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?/i,
      /(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?\s*(?:refundable\s*)?(?:security\s*)?advance\b/i
    ]);
  const bedrooms = extractBedrooms(normalizedSummary);
  const bathrooms = extractBathrooms(normalizedSummary);
  const floorDetails = extractFloorDetails(normalizedSummary);
  // A brochure rarely states bathrooms per unit typology, only an overall
  // "3 bathrooms" figure at most - default each BHK to the bathroom count
  // that type conventionally has, so the per-BHK breakdown isn't left
  // entirely blank. Half-BHK types round down to the whole-BHK count below
  // them (3.5 BHK behaves like 3 BHK for bathroom purposes).
  const DEFAULT_BHK_BATHROOMS: Record<string, string> = {
    '1 BHK': '1', '2 BHK': '2', '2.5 BHK': '2', '3 BHK': '3', '3.5 BHK': '3', '4 BHK': '4', '4+ BHK': '4'
  };
  const bhkBathrooms: Record<string, string> = {};
  bedrooms.split(',').map((label) => label.trim()).filter(Boolean).forEach((label) => {
    if (DEFAULT_BHK_BATHROOMS[label]) bhkBathrooms[label] = DEFAULT_BHK_BATHROOMS[label];
  });
  // Furnishing is essentially always stated as one of the three options in
  // a real listing; when a brochure never mentions it at all, default to
  // Unfurnished (new-build apartments/villas are unfurnished unless the
  // brochure says otherwise) rather than leaving the field blank.
  const furnishingStatus = extractFurnishingStatus(normalizedSummary) || (bedrooms ? 'Unfurnished' : '');
  const possessionDate = extractTargetPossessionDate(normalizedSummary);
  // Possession status keyword ("ready to move"/"under construction") wins
  // when the brochure states it outright. Otherwise "New Launch"-style
  // wording implies construction hasn't finished, and failing that, a
  // stated target-possession year in the future implies the same.
  const possessionStatus = extractPossessionStatus(normalizedSummary)
    || (/\bnew\s*launch\b|\bpre[- ]?launch\b|\bupcoming\b/i.test(normalizedSummary) ? 'Under Construction' : '')
    || (possessionDate && Number(possessionDate.slice(0, 4)) > new Date().getFullYear() ? 'Under Construction' : '')
    || (possessionDate ? 'Ready to Move' : '');
  const flatSize = extractFlatSize(normalizedSummary);
  const { flatSizeMin, flatSizeMax } = isApartmentLikeSummary ? extractFlatSizeRange(normalizedSummary) : { flatSizeMin: '', flatSizeMax: '' };
  const multiFlatFacings = isApartmentLikeSummary ? extractFlatFacings(normalizedSummary) : [];
  const flatFacing = multiFlatFacings.length
    ? multiFlatFacings.join(', ')
    : isApartmentLikeSummary ? extractChoice(normalizeDirection(finalFacing), ['North', 'South', 'East', 'West']) : '';
  const floorToFloorHeight = extractFloorToFloorHeight(normalizedSummary);
  const projectName = extractProjectName(normalizedSummary) || ventureName;
  const companyName = extractCompanyName(normalizedSummary);
  const squareFeetPrice = extractSquareFeetPrice(normalizedSummary);
  const totalBudget = extractTotalBudget(normalizedSummary);
  const totalBudgetOnwards = Boolean(totalBudget) && /\bstarting\s*price\b|~\s*(?:rs\.?|₹)|\bonwards\b|\bstarting\s*from\b/i.test(normalizedSummary);
  const selectedAmenities = extractAmenitiesFromSummary(normalizedSummary);
  const projectTotalUnits = extractProjectTotalUnits(normalizedSummary);
  const reraId = extractReraId(normalizedSummary);
  const permissionNo = extractPermissionNo(normalizedSummary);
  const floorPlanUnits = isApartmentLikeSummary ? extractFloorPlanUnitsFromSummary(normalizedSummary) : [];
  const localityHighlights = extractLocalityHighlights(normalizedSummary);
  // Project Highlights are built only from facts already parsed elsewhere
  // (unit count, area, floor-to-floor height, amenity count) rather than
  // summarizing free-form brochure prose, so nothing here is invented.
  const projectHighlights = [
    projectTotalUnits && totalArea ? `${projectTotalUnits} Units spread across ${totalArea} ${areaUnit}` : (projectTotalUnits ? `${projectTotalUnits} Units` : ''),
    floorToFloorHeight ? `${floorToFloorHeight} ft floor-to-floor height` : '',
    selectedAmenities.length ? `${selectedAmenities.length}+ premium amenities including ${selectedAmenities.slice(0, 3).join(', ')}` : ''
  ].filter(Boolean).join('\n');

  return {
    listingIntent: hasDevelopmentTerms
      ? 'development'
      : /\b(?:sell|sale|selling|outright|per\s*acres?|card\s*value)\b/i.test(normalizedSummary)
        ? 'sell'
        // A fully-built apartment/villa project brochure (RERA number, unit
        // price breakdown, etc.) is a sale listing even when it never says
        // the word "sell" - "development" is only the right default for
        // land/plot summaries offered to a builder for joint development.
        : (isApartmentLikeSummary || developmentType === 'villa') ? 'sell' : 'development',
    developmentType,
    plotNumber,
    approvalType,
    ventureName,
    blockName,
    totalArea,
    areaUnit,
    northSideLength,
    southSideLength,
    eastSideLength,
    westSideLength,
    frontageWidth: finalFrontageWidth,
    roadSize: finalRoadSize,
    ...locationFields,
    facing: finalFacing,
    roadFacingDirection: finalRoadFacingDirection,
    developerRatio,
    goodwill: extractAmount(normalizedSummary, [
      /goodwill\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?/i,
      /(?:rs\.?|₹)?\s*([\d,.]+)\s*(cr|crores?|lakhs?|lacs?|l)?\s*(?:flat\s*)?goodwill\b/i
    ]),
    advance: advanceAmount,
    ...partlySaleDetails,
    squareYardPrice: perAcrePrice || perSqYardPrice,
    priceUnit: perAcrePrice ? 'Acre' : 'Sq Yard',
    marketPrice,
    askingPrice,
    extraCharges,
    ...contactDetails,
    zoningClassification: finalZoningClassification,
    bedrooms,
    bathrooms,
    bhkBathrooms,
    floorNumber: floorDetails.floorNumber,
    totalFloors: floorDetails.totalFloors,
    furnishingStatus,
    possessionStatus,
    flatSize,
    flatSizeMin,
    flatSizeMax,
    flatFacing,
    floorToFloorHeight,
    projectName,
    companyName,
    squareFeetPrice,
    totalBudget,
    totalBudgetOnwards,
    selectedAmenities,
    projectTotalUnits,
    reraId,
    permissionNo,
    floorPlanUnits,
    localityHighlights,
    projectHighlights,
    possessionDate,
    description: summary.trim()
  };
};

const buildMapSearchLink = (details: ReturnType<typeof parseSummary> | null) => {
  if (!details) return '';
  const query = [
    details.societyName,
    details.locality,
    details.landmark,
    details.city,
    details.state,
    details.pincode,
    'India'
  ].filter(Boolean).join(', ');
  return query.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
};

const buildSimplePropertyDescription = (details: ReturnType<typeof parseSummary>, fallback = '') => {
  const propertyType = details.developmentType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const location = [details.locality, details.city, details.district, details.state].filter(Boolean).join(', ');
  const isApartmentLike = APARTMENT_LIKE_TYPES.includes(details.developmentType);
  const sizeLabel = isApartmentLike && details.flatSize ? `${details.flatSize} Sq Ft` : details.totalArea ? `${details.totalArea} ${details.areaUnit}` : 'Property';
  const configLabel = isApartmentLike && details.bedrooms ? ` ${details.bedrooms}` : '';
  const intro = `${sizeLabel}${configLabel} ${propertyType.toLowerCase()} ${details.listingIntent === 'sell' ? 'for sale' : 'available'}${location ? ` at ${location}` : ''}`;
  const flatDetails = isApartmentLike
    ? [
        details.bathrooms ? `${details.bathrooms} bathrooms` : '',
        details.floorNumber ? `floor ${details.floorNumber}${details.totalFloors ? ` of ${details.totalFloors}` : ''}` : '',
        details.flatFacing ? `${details.flatFacing}-facing` : '',
        details.furnishingStatus || '',
        details.possessionStatus || ''
      ].filter(Boolean).join(', ')
    : '';
  const flatPrice = isApartmentLike
    ? (details.totalBudget
      ? `Total budget is Rs. ${Number(details.totalBudget).toLocaleString('en-IN')}`
      : details.squareFeetPrice
        ? `Priced at Rs. ${Number(details.squareFeetPrice).toLocaleString('en-IN')} per Sq Ft`
        : '')
    : '';
  const amenitiesLine = isApartmentLike && details.selectedAmenities?.length
    ? `Amenities include ${details.selectedAmenities.join(', ')}`
    : '';
  const approval = details.approvalType ? `It is part of an ${details.approvalType}` : '';
  const venture = details.ventureName ? `${approval ? ' in ' : 'It is in '}${details.ventureName}${details.blockName ? `, ${details.blockName}` : ''}` : '';
  const plot = details.plotNumber ? `Plot number ${details.plotNumber}` : '';
  const facing = details.facing ? `${details.facing} facing` : '';
  const road = details.roadSize ? `with ${details.roadSize} ft road access` : '';
  const size = [details.northSideLength, details.southSideLength, details.eastSideLength, details.westSideLength].some(Boolean)
    ? `Plot dimensions are north ${details.northSideLength || '-'} ft, south ${details.southSideLength || '-'} ft, east ${details.eastSideLength || '-'} ft, and west ${details.westSideLength || '-'} ft`
    : '';
  const landmark = details.landmark ? `The plot is ${details.landmark.toLowerCase()}` : '';
  const price = details.askingPrice
    ? `Asking price is Rs. ${Number(details.askingPrice).toLocaleString('en-IN')} per square yard`
    : details.squareYardPrice
      ? `Price is Rs. ${Number(details.squareYardPrice).toLocaleString('en-IN')} per ${details.priceUnit === 'Acre' || isLargeAcreLand(details) ? 'acre' : 'square yard'}`
      : '';
  const market = details.marketPrice ? `Market price is Rs. ${Number(details.marketPrice).toLocaleString('en-IN')} per ${isLargeAcreLand(details) ? 'acre' : 'square yard'}` : '';
  const charges = details.extraCharges ? `Extra charges include ${details.extraCharges}` : '';
  const fallbackNote = stripLocationLinks(fallback)
    .replace(/\b(?:urgent\s+sale|price\s+negotiable(?:\s+on\s+payment\s+mode)?)[).]*/gi, '')
    .replace(/\b\d+\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const terms = /urgent\s+sale/i.test(fallback) ? 'Urgent sale; price is negotiable depending on payment mode' : '';
  const sentences = [
    intro,
    [approval, venture].filter(Boolean).join(''),
    flatDetails,
    [plot, facing, road].filter(Boolean).join(', '),
    size,
    landmark,
    [price, market, charges, flatPrice].filter(Boolean).join('. '),
    amenitiesLine,
    terms
  ].filter(Boolean);
  return sentences.length ? `${sentences.join('. ')}.` : fallbackNote;
};

const extractRawValue = (text: string, pattern: RegExp) => text.match(pattern)?.[1]?.trim().replace(/\s+/g, ' ') || '';

const formatPreviewAmount = (value = '') => {
  const amount = Number(value);
  if (!String(value).trim() || !Number.isFinite(amount)) return '';
  return `Rs. ${amount.toLocaleString('en-IN')}`;
};

// Mirrors the 5-step Property Form exactly (PostProperty.tsx's own
// `formSteps` list: Property Details / Apartment or Villa Details /
// Pricing & Amenities / Media Uploads / Location Details), so admins
// reviewing the parsed summary see it grouped the same way they'll fill
// or check it on the next screen.
const buildStructuredSummaryPreview = (summary: string, resolvedPincode = '', hasPlotDiagram = false) => {
  const cleaned = normalizeRealEstateSummaryText(summary);
  if (!cleaned) return '';

  const parsed = { ...parseSummary(cleaned) };
  if (resolvedPincode && !parsed.pincode) parsed.pincode = resolvedPincode;
  const propertyType = parsed.developmentType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const isVilla = parsed.developmentType.trim().toLowerCase() === 'villa';
  const area = parsed.totalArea ? `${parsed.totalArea} ${parsed.areaUnit}` : extractRawValue(cleaned, /([\d,.]+\s*(?:sq\s*yards?|square\s*yards?|acres?|guntas?))/i);
  const surveyNumber = extractRawValue(cleaned, /(?:Survey No\.|survey numbers?|sy no)\s*[:.-]?\s*([^\n.]+)/i);
  const ownerExtent = extractRawValue(cleaned, /(?:direct\s+owner|owner)\s*[:.-]?\s*([\d,.]+\s*(?:acres?|guntas?)(?:\s*[\d,.]+\s*guntas?)?)/i);
  const perAcrePrice = extractRawValue(cleaned, /(?:per acre price|acre price|per acre)\s*[:.-]?\s*(?:rs\.?|₹)?\s*([\d,.]+\s*(?:Cr|crore|lakh|lac)?)/i);
  const roadText = extractRawValue(cleaned, /([\d,.]+\s*ft\s+approach\s+road)/i) || (parsed.roadSize ? `${parsed.roadSize} ft road size` : '');
  const surroundings = extractRawValue(cleaned, /surrounded by\s+([^.\n,]+)/i);
  const simpleDescription = buildSimplePropertyDescription(parsed, cleaned);

  const section = (title: string, rows: Array<[string, string]>) => {
    const visibleRows = rows.filter(([, value]) => String(value || '').trim());
    if (!visibleRows.length) return '';
    return [
      `${title}:`,
      ...visibleRows.map(([label, value]) => `- ${label}: ${value}`)
    ].join('\n');
  };

  // Property Details
  const propertyDetails = section('Property Details', [
    ['Post Property For', parsed.listingIntent === 'development' ? 'Development' : parsed.listingIntent === 'buy' ? 'Buy' : 'Sell'],
    [parsed.listingIntent === 'development' ? 'Development Type' : 'Property Type', propertyType],
    ['Plot Number', parsed.plotNumber],
    ['Approval', parsed.approvalType],
    ['Venture / Layout', [parsed.ventureName, parsed.blockName].filter(Boolean).join(', ')],
    ['Total Area', area],
    ['Facing', parsed.facing],
    ['Road Size', parsed.roadSize ? `${parsed.roadSize} ft` : roadText],
    ['Frontage Width', parsed.frontageWidth ? `${parsed.frontageWidth} ft` : ''],
    ['Road Facing Direction', parsed.roadFacingDirection || parsed.facing],
    ['Zoning Classification', parsed.zoningClassification],
    ['North Side Length', parsed.northSideLength ? `${parsed.northSideLength} ft` : ''],
    ['South Side Length', parsed.southSideLength ? `${parsed.southSideLength} ft` : ''],
    ['East Side Length', parsed.eastSideLength ? `${parsed.eastSideLength} ft` : ''],
    ['West Side Length', parsed.westSideLength ? `${parsed.westSideLength} ft` : '']
  ]);

  // Apartment Details (or Villa Details - same dynamic label the form itself uses)
  const unitDetails = section(isVilla ? 'Villa Details' : 'Apartment Details', [
    ['Project Name', parsed.projectName],
    ['Builder / Company Name', parsed.companyName],
    ['Project Total Units', parsed.projectTotalUnits],
    ['Floor to Floor Height', parsed.floorToFloorHeight ? `${parsed.floorToFloorHeight} ft` : ''],
    ['Flat Size', parsed.flatSize ? `${parsed.flatSize} Sq Ft` : ''],
    ['Min Flat Size', parsed.flatSizeMin ? `${parsed.flatSizeMin} Sq Ft` : ''],
    ['Max Flat Size', parsed.flatSizeMax ? `${parsed.flatSizeMax} Sq Ft` : ''],
    ['Flat Facing', parsed.flatFacing],
    ['Bedrooms (BHK)', parsed.bedrooms],
    ['Bathrooms', parsed.bathrooms],
    ['Bathrooms per BHK', Object.entries(parsed.bhkBathrooms || {}).map(([bhk, count]) => `${bhk}: ${count}`).join(', ')],
    ['Floor', parsed.floorNumber ? `${parsed.floorNumber}${parsed.totalFloors ? ` of ${parsed.totalFloors}` : ''}` : ''],
    ['Furnishing Status', parsed.furnishingStatus],
    ['Possession Status', parsed.possessionStatus]
  ]);

  // Amenities Details
  const amenitiesDetails = section('Amenities Details', [
    ['Amenities', (parsed.selectedAmenities || []).join(', ')]
  ]);

  // Commercial Terms
  const commercialTerms = section('Commercial Terms', [
    ['Square Feet Price', formatPreviewAmount(parsed.squareFeetPrice)],
    ['Total Budget', formatPreviewAmount(parsed.totalBudget) + (parsed.totalBudgetOnwards ? ' (Onwards)' : '')],
    ['Development Ratio (Owner : Builder)', parsed.developerRatio],
    ['Goodwill', formatPreviewAmount(parsed.goodwill)],
    ['Advance', formatPreviewAmount(parsed.advance)],
    ['Partly Sale Option', parsed.partlySale],
    ['Partly Sale Value', parsed.partlySaleValue ? `${parsed.partlySaleValue} ${parsed.partlySaleUnit}` : ''],
    ['Partly Sale Price', formatPreviewAmount(parsed.partlySalePrice)],
    [parsed.priceUnit === 'Acre' || isLargeAcreLand(parsed) ? 'Per Acre Price' : 'Square Yard Price', formatPreviewAmount(parsed.squareYardPrice)],
    ['Market Price per Sq Yard', formatPreviewAmount(parsed.marketPrice)],
    ['Asking Price per Sq Yard', formatPreviewAmount(parsed.askingPrice)],
    ['Extra Charges', parsed.extraCharges],
    ['Owner Extent', ownerExtent],
    ['Per Acre Price', perAcrePrice],
    ['Site Access', [roadText, surroundings ? `surrounded by ${surroundings}` : ''].filter(Boolean).join(', ')],
    ['Property Description', simpleDescription]
  ]);

  // Media Uploads - RERA/Permission/Highlights live on this step in the real
  // form; nothing else here can come from free text, so only note what's
  // actually attached rather than pretending photos/brochures were provided.
  const mediaUploads = section('Media Uploads', [
    ['Property Dimension Image', hasPlotDiagram ? 'Attached' : ''],
    ...parsed.floorPlanUnits.map((unit, index): [string, string] => [
      `Unit ${index + 1} (${unit.bedrooms})`,
      [unit.size ? `${unit.size} Sq Ft` : '', unit.unitFacing, formatPreviewAmount(unit.price)].filter(Boolean).join(' · ')
    ]),
    ['Possession Date', parsed.possessionDate],
    ['RERA Registration No.', parsed.reraId],
    ['Layout / Building Permission No.', parsed.permissionNo],
    ['Locality Top Highlights', parsed.localityHighlights.replace(/\n/g, ', ')],
    ['Project Highlights', parsed.projectHighlights.replace(/\n/g, ', ')]
  ]);

  // Location Details
  const locationDetails = section('Location Details', [
    ['State', parsed.state],
    ['City', parsed.city],
    ['Locality', parsed.locality],
    ['Colony Name', parsed.societyName],
    ['Landmark / Street', parsed.landmark],
    ['Pincode', parsed.pincode],
    ['Survey Number', surveyNumber]
  ]);

  return [propertyDetails, unitDetails, amenitiesDetails, commercialTerms, mediaUploads, locationDetails]
    .filter(Boolean)
    .join('\n\n') || cleaned;
};

const loadGoogleMapsForPincode = () =>
  new Promise<GoogleLike>((resolve, reject) => {
    const win = window as any;
    if (win.google?.maps?.Geocoder) {
      resolve(win.google);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error('Google Maps API key missing'));
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com/maps/api/js"]');
    const finishWhenReady = () => {
      if (win.google?.maps?.Geocoder) {
        resolve(win.google);
      } else {
        reject(new Error('Google Maps did not load'));
      }
    };

    if (existingScript) {
      existingScript.addEventListener('load', finishWhenReady, { once: true });
      window.setTimeout(finishWhenReady, 800);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=3.55`;
    script.async = true;
    script.defer = true;
    script.onload = finishWhenReady;
    script.onerror = () => reject(new Error('Google Maps could not load'));
    document.head.appendChild(script);
  });

const extractPincodeFromGoogleResult = (result: any) =>
  result?.address_components?.find((component: any) => component.types?.includes('postal_code'))?.long_name || '';

const cleanGoogleLandmarkCandidate = (value = '', details?: Partial<ReturnType<typeof parseSummary>>) => {
  const candidate = String(value || '').trim();
  if (!candidate || /^[A-Z0-9]{3,}\+[A-Z0-9]{2,}/i.test(candidate)) return '';
  if (/^\d{6}$/.test(candidate) || /^india$/i.test(candidate)) return '';
  const generic = [
    details?.locality,
    details?.city,
    details?.state,
    details?.pincode,
    'Telangana',
    'Hyderabad',
    'India'
  ].map((part) => String(part || '').toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const normalized = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized && !generic.includes(normalized) ? candidate : '';
};

const extractLandmarkFromGoogleResult = (result: any, details?: Partial<ReturnType<typeof parseSummary>>) => {
  const components = result?.address_components || [];
  const preferredTypes = [
    'point_of_interest',
    'establishment',
    'premise',
    'route',
    'neighborhood',
    'sublocality_level_2',
    'sublocality_level_1',
    'sublocality'
  ];

  for (const type of preferredTypes) {
    const candidate = components.find((component: any) => component.types?.includes(type))?.long_name;
    const cleaned = cleanGoogleLandmarkCandidate(candidate, details);
    if (cleaned) return cleaned;
  }

  const firstAddressPart = String(result?.formatted_address || '').split(',')[0];
  return cleanGoogleLandmarkCandidate(firstAddressPart, details);
};

const resolveNearestLandmarkWithGoogle = async (
  google: GoogleLike,
  coords: { lat: number; lng: number },
  details?: Partial<ReturnType<typeof parseSummary>>
) => {
  if (!google?.maps?.places?.PlacesService) return '';

  const service = new google.maps.places.PlacesService(document.createElement('div'));
  const location = new google.maps.LatLng(coords.lat, coords.lng);
  const types = ['point_of_interest', 'establishment'];

  for (const type of types) {
    const landmark = await new Promise<string>((resolve) => {
      service.nearbySearch(
        { location, radius: 1500, type },
        (results: any[], status: string) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
            resolve('');
            return;
          }
          const match = results
            .map((place) => cleanGoogleLandmarkCandidate(place.name, details))
            .find(Boolean);
          resolve(match || '');
        }
      );
    });
    if (landmark) return landmark;
  }

  return '';
};

const resolvePincodeWithGoogle = async (details: ReturnType<typeof parseSummary>) => {
  const google = await loadGoogleMapsForPincode();
  const geocoder = new google.maps.Geocoder();
  const buildQuery = (...parts: Array<string | undefined>) =>
    parts
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ');

  const candidates = [
    buildQuery(details.societyName, details.locality, details.landmark, details.city, details.state, 'India'),
    buildQuery(details.locality, details.landmark, details.city, details.state, 'India'),
    buildQuery(details.locality, details.city, details.state, 'India'),
    buildQuery(details.landmark, details.city, details.state, 'India'),
    buildQuery(details.societyName, details.city, details.state, 'India')
  ].filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);

  for (const address of candidates) {
    const pincode = await new Promise<string>((resolve) => {
      geocoder.geocode({ address, componentRestrictions: { country: 'IN' } }, (results: any[], status: string) => {
        if (status !== 'OK' || !results?.length) {
          resolve('');
          return;
        }
        resolve(extractPincodeFromGoogleResult(results[0]));
      });
    });

    if (/^\d{6}$/.test(pincode)) return pincode;
  }

  return '';
};

const resolveLocationDetailsWithGoogle = async (
  details: ReturnType<typeof parseSummary>,
  coords?: { lat: number; lng: number } | null
) => {
  const google = await loadGoogleMapsForPincode();
  const geocoder = new google.maps.Geocoder();
  const resolved = { pincode: '', landmark: '' };
  const buildQuery = (...parts: Array<string | undefined>) =>
    parts
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ');

  if (coords) {
    const reverseResult = await new Promise<any | null>((resolve) => {
      geocoder.geocode({ location: coords }, (results: any[], status: string) => {
        resolve(status === 'OK' && results?.length ? results[0] : null);
      });
    });
    if (reverseResult) {
      resolved.pincode = extractPincodeFromGoogleResult(reverseResult);
      resolved.landmark = await resolveNearestLandmarkWithGoogle(google, coords, details)
        || extractLandmarkFromGoogleResult(reverseResult, details);
    }
  }

  if (resolved.pincode && resolved.landmark) return resolved;

  const candidates = [
    buildQuery(details.societyName, details.locality, details.city, details.state, 'India'),
    buildQuery(details.locality, details.city, details.state, details.pincode, 'India'),
    buildQuery(details.locality, details.city, details.state, 'India')
  ].filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);

  for (const address of candidates) {
    const result = await new Promise<any | null>((resolve) => {
      geocoder.geocode({ address, componentRestrictions: { country: 'IN' } }, (results: any[], status: string) => {
        resolve(status === 'OK' && results?.length ? results[0] : null);
      });
    });
    if (!result) continue;
    resolved.pincode = resolved.pincode || extractPincodeFromGoogleResult(result);
    resolved.landmark = resolved.landmark || extractLandmarkFromGoogleResult(result, details);
    if (resolved.pincode && resolved.landmark) return resolved;
  }

  return resolved;
};

const APARTMENT_LIKE_TYPES = ['apartment', 'standalone', 'high-rise', 'gated-community', 'group-house'];

const getMissingPropertyFormFields = (details: ReturnType<typeof parseSummary>, hasPlotDiagram: boolean) => {
  const missing: string[] = [];
  const isLargeLand = isLargeAcreLand(details);
  const isApartmentLike = APARTMENT_LIKE_TYPES.includes(details.developmentType);
  const hasValue = (value?: string) => Boolean(String(value || '').trim());
  const hasPositiveNumber = (value?: string) => {
    const parsed = Number(String(value || '').replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed > 0;
  };
  const add = (label: string) => {
    if (!missing.includes(label)) missing.push(label);
  };

  if (!hasValue(details.listingIntent)) add('Post Property For');
  if (!hasValue(details.developmentType)) add(details.listingIntent === 'development' ? 'Development Type' : 'Property Type');
  if (!hasPositiveNumber(details.totalArea)) add('Total Area');
  if (!isLargeLand && !isApartmentLike && !hasValue(details.facing)) add('Facing');
  if (!isLargeLand && !isApartmentLike && !hasValue(details.roadFacingDirection)) add('Road Facing Direction');
  if (!isLargeLand && !isApartmentLike && !hasPositiveNumber(details.roadSize)) add('Road Size');
  if (!isLargeLand && !isApartmentLike && !hasPositiveNumber(details.frontageWidth)) add('Frontage Width');
  if (!isLargeLand && !isApartmentLike && !hasValue(details.zoningClassification)) add('Zoning Classification');
  if (!/^\d{6}$/.test(details.pincode || '')) add('Pincode');
  if (!hasValue(details.state)) add('State');
  if (!hasValue(details.city)) add('City');
  if (!hasValue(details.locality)) add('Locality');
  if (!hasValue(details.landmark)) add('Landmark / Street');

  if (details.listingIntent === 'development' && !hasValue(details.developerRatio)) {
    add('Development Ratio (Owner : Builder)');
  }

  if (isApartmentLike && !hasValue(details.bedrooms)) add('Bedrooms (BHK)');

  // Square Feet Price / Total Budget is required for every sell or buy listing
  // regardless of property type - Square Yard Price is no longer a form field.
  if (details.listingIntent !== 'development' && !hasPositiveNumber(details.squareFeetPrice) && !hasPositiveNumber(details.totalBudget)) {
    add(details.listingIntent === 'buy' ? 'Budget per Sq Ft' : 'Square Feet Price');
  }

  // Plot Dimensions (North/South/East/West) are no longer collected by the
  // property form, so they are never required here either.

  return missing;
};

const createLargeLandMapFromSummary = async (details: ReturnType<typeof parseSummary>) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const location = [details.locality, details.city, details.state].filter(Boolean).join(', ');
  const seedText = `${details.totalArea}-${location}-${details.mapLink || ''}`;
  let seed = 0;
  for (let index = 0; index < seedText.length; index += 1) {
    seed = (seed * 31 + seedText.charCodeAt(index)) >>> 0;
  }
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  ctx.fillStyle = '#eef7ef';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  for (let x = 80; x < canvas.width; x += 92) {
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x + 24, canvas.height - 90);
    ctx.stroke();
  }
  for (let y = 96; y < canvas.height; y += 86) {
    ctx.beginPath();
    ctx.moveTo(70, y);
    ctx.lineTo(canvas.width - 70, y + 18);
    ctx.stroke();
  }

  const shapeVariant = Math.floor(random() * 4);
  const points =
    shapeVariant === 0
      ? [
          { x: 250, y: 150 },
          { x: 750, y: 150 },
          { x: 750, y: 650 },
          { x: 250, y: 650 }
        ]
      : shapeVariant === 1
        ? [
            { x: 170, y: 205 },
            { x: 830, y: 205 },
            { x: 830, y: 595 },
            { x: 170, y: 595 }
          ]
        : shapeVariant === 2
          ? [
              { x: 235, y: 150 },
              { x: 765, y: 130 },
              { x: 810, y: 610 },
              { x: 190, y: 630 }
            ]
          : [
              { x: 235 + random() * 70, y: 120 + random() * 48 },
              { x: 700 + random() * 80, y: 105 + random() * 70 },
              { x: 850 + random() * 42, y: 330 + random() * 90 },
              { x: 720 + random() * 80, y: 610 + random() * 50 },
              { x: 310 + random() * 90, y: 650 + random() * 35 },
              { x: 150 + random() * 52, y: 390 + random() * 90 }
            ];

  ctx.fillStyle = '#d9f3dd';
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 7;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#8fbc8f';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 12]);
  for (let index = 0; index < 7; index += 1) {
    const start = points[index % points.length];
    const end = points[(index + 3) % points.length];
    ctx.beginPath();
    ctx.moveTo(start.x + random() * 40 - 20, start.y + random() * 40 - 20);
    ctx.lineTo(end.x + random() * 40 - 20, end.y + random() * 40 - 20);
    ctx.stroke();
  }
  ctx.restore();
  ctx.setLineDash([]);

  const markerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const markerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  ctx.fillStyle = '#0f766e';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 30px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${details.totalArea || '-'} ${details.areaUnit || 'Acres'} Land Parcel`, 76, 62);
  ctx.font = '600 20px Arial';
  ctx.fillStyle = '#334155';
  ctx.fillText(location || 'Shared map location', 76, 96);

  const badge = (text: string, x: number, y: number, fill = '#ffffff') => {
    ctx.font = '700 18px Arial';
    const width = ctx.measureText(text).width + 34;
    ctx.fillStyle = fill;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 42, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(text, x + 17, y + 28);
  };

  badge(details.zoningClassification || 'Land', 74, 126, '#ecfeff');
  if (/nala/i.test(details.description || '')) badge('NALA conversion noted', 74, 178, '#fef9c3');
  if (details.squareYardPrice) badge(`Per acre: Rs. ${Number(details.squareYardPrice).toLocaleString('en-IN')}`, 74, 230, '#fff7ed');
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob ? new File([blob], 'summary-generated-large-land-map.png', { type: 'image/png' }) : null;
};

const createPlotDiagramFromSummary = async (details: ReturnType<typeof parseSummary>) => {
  if (isLargeAcreLand(details)) return createLargeLandMapFromSummary(details);

  const north = Number(details.northSideLength) || 0;
  const south = Number(details.southSideLength) || 0;
  const east = Number(details.eastSideLength) || 0;
  const west = Number(details.westSideLength) || 0;
  const frontage = Number(details.frontageWidth) || 0;
  if (![north, south, east, west, frontage].some(Boolean)) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const horizontalMax = Math.max(north, south, frontage, 1);
  const verticalMax = Math.max(east, west, 1);
  const northWidth = Math.max(220, Math.min(640, ((north || south || horizontalMax) / horizontalMax) * 640));
  const southWidth = Math.max(220, Math.min(640, ((south || north || horizontalMax) / horizontalMax) * 640));
  const eastHeight = Math.max(220, Math.min(440, ((east || west || verticalMax) / verticalMax) * 440));
  const westHeight = Math.max(220, Math.min(440, ((west || east || verticalMax) / verticalMax) * 440));
  const shapeHeight = Math.max(eastHeight, westHeight);
  const centerX = canvas.width / 2;
  const top = 170;
  const topLeft = { x: centerX - northWidth / 2, y: top };
  const topRight = { x: centerX + northWidth / 2, y: top };
  const bottomRight = { x: centerX + southWidth / 2, y: top + eastHeight };
  const bottomLeft = { x: centerX - southWidth / 2, y: top + westHeight };
  const boundsLeft = Math.min(topLeft.x, bottomLeft.x);
  const boundsRight = Math.max(topRight.x, bottomRight.x);
  const boundsBottom = top + shapeHeight;
  const road = details.roadFacingDirection || details.facing || 'West';

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(bottomLeft.x, bottomLeft.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo((topLeft.x + topRight.x) / 2, topLeft.y);
  ctx.lineTo((bottomLeft.x + bottomRight.x) / 2, (bottomLeft.y + bottomRight.y) / 2);
  ctx.moveTo((topLeft.x + bottomLeft.x) / 2, (topLeft.y + bottomLeft.y) / 2);
  ctx.lineTo((topRight.x + bottomRight.x) / 2, (topRight.y + bottomRight.y) / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const label = (text: string, x: number, y: number, rotate = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotate);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  label(`North: ${details.northSideLength || '-'} ft`, (topLeft.x + topRight.x) / 2, top - 28);
  label(`South: ${details.southSideLength || '-'} ft`, (bottomLeft.x + bottomRight.x) / 2, boundsBottom + 48);
  label(`East: ${details.eastSideLength || '-'} ft`, boundsRight + 84, (topRight.y + bottomRight.y) / 2, Math.PI / 2);
  label(`West: ${details.westSideLength || '-'} ft`, boundsLeft - 84, (topLeft.y + bottomLeft.y) / 2, -Math.PI / 2);
  const roadLabel = `Road Facing: ${road} | Road Size: ${details.roadSize || '-'} ft | Frontage: ${details.frontageWidth || '-'} ft`;

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (road === 'North') {
    ctx.moveTo(topLeft.x + 36, top - 58);
    ctx.lineTo(topRight.x - 36, top - 58);
    label(roadLabel, centerX, top - 90);
  } else if (road === 'South') {
    ctx.moveTo(bottomLeft.x + 36, boundsBottom + 78);
    ctx.lineTo(bottomRight.x - 36, boundsBottom + 78);
    label(roadLabel, centerX, boundsBottom + 118);
  } else if (road === 'East') {
    ctx.moveTo(boundsRight + 58, top + 36);
    ctx.lineTo(boundsRight + 58, boundsBottom - 36);
    label(roadLabel, boundsRight + 128, (top + boundsBottom) / 2, Math.PI / 2);
  } else {
    ctx.moveTo(boundsLeft - 58, top + 36);
    ctx.lineTo(boundsLeft - 58, boundsBottom - 36);
    label(roadLabel, boundsLeft - 128, (top + boundsBottom) / 2, -Math.PI / 2);
  }
  ctx.stroke();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob ? new File([blob], 'summary-generated-plot-layout.png', { type: 'image/png' }) : null;
};

const PropertySummary = () => {
  const navigate = useNavigate();
  const isAdminUser = checkIsAdminUser(localStorage.getItem('phone'), localStorage.getItem('accountType'), localStorage.getItem('email'));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const [summary, setSummary] = useState('');
  const [propertyUrl, setPropertyUrl] = useState('');
  const [isGeneratingFromUrl, setIsGeneratingFromUrl] = useState(false);
  const [urlGenerateError, setUrlGenerateError] = useState('');
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [selectedExtractedImages, setSelectedExtractedImages] = useState<Set<string>>(new Set());
  const [isAddingExtractedImages, setIsAddingExtractedImages] = useState(false);
  const [mapLink, setMapLink] = useState('');
  const [mapLinkTouched, setMapLinkTouched] = useState(false);
  const [plotDiagramFile, setPlotDiagramFile] = useState<File | null>(null);
  const [projectImages, setProjectImages] = useState<File[]>([]);
  const MAX_PROJECT_IMAGES = 10;
  const [unitPlanImages, setUnitPlanImages] = useState<File[]>([]);
  const MAX_UNIT_PLAN_IMAGES = 5;
  const [isListening, setIsListening] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [message, setMessage] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [detectedVoiceText, setDetectedVoiceText] = useState('');
  const [correctedVoiceText, setCorrectedVoiceText] = useState('');
  const [suggestedVoiceTerms, setSuggestedVoiceTerms] = useState<string[]>([]);
  const [googleResolvedPincode, setGoogleResolvedPincode] = useState('');
  const parsedSummary = summary.trim() ? parseSummary(summary) : null;
  const parsedSummaryWithPincode = parsedSummary
    ? {
        ...parsedSummary,
        pincode: parsedSummary.pincode || googleResolvedPincode
      }
    : null;
  const structuredSummaryPreview = buildStructuredSummaryPreview(summary, googleResolvedPincode, Boolean(plotDiagramFile));
  const liveMissingFields = parsedSummaryWithPincode ? getMissingPropertyFormFields(parsedSummaryWithPincode, Boolean(plotDiagramFile)) : missingFields;

  useEffect(() => {
    if (!parsedSummary || parsedSummary.pincode) {
      setGoogleResolvedPincode('');
      return;
    }

    const localPincode = pincodeForLocationParts(
      parsedSummary.locality,
      parsedSummary.societyName,
      parsedSummary.landmark,
      parsedSummary.city,
      parsedSummary.state,
      summary
    );
    if (localPincode) {
      setGoogleResolvedPincode(localPincode);
      return;
    }

    const hasLocationSignal = [parsedSummary.societyName, parsedSummary.locality, parsedSummary.landmark, parsedSummary.city, parsedSummary.state]
      .some((value) => String(value || '').trim());
    if (!hasLocationSignal) {
      setGoogleResolvedPincode('');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const pincode = await resolvePincodeWithGoogle(parsedSummary);
        if (!cancelled) setGoogleResolvedPincode(pincode);
      } catch {
        if (!cancelled) setGoogleResolvedPincode('');
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    parsedSummary?.pincode,
    parsedSummary?.societyName,
    parsedSummary?.locality,
    parsedSummary?.landmark,
    parsedSummary?.city,
    parsedSummary?.state,
    summary
  ]);

  useEffect(() => {
    const linkFromSummary = extractMapLinkFromText(summary);
    if (linkFromSummary) {
      setMapLink(linkFromSummary);
      return;
    }

    if (mapLinkTouched) return;
    const generatedLink = buildMapSearchLink(parsedSummary);
    setMapLink(generatedLink);
  }, [summary, parsedSummary?.societyName, parsedSummary?.locality, parsedSummary?.landmark, parsedSummary?.city, parsedSummary?.state, parsedSummary?.pincode, mapLinkTouched]);

  const resolveLocation = async () => {
    const parsedCoords = mapLink.trim() ? await resolveMapLinkCoordinates(mapLink) : null;
    if (!mapLink.trim() && !parsedCoords) return {};

    return {
      coordinates: parsedCoords || undefined,
      mapLink
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setIsResolving(true);

    try {
      const accountType = localStorage.getItem('accountType') || 'owner';
      if (!isAdminUser && !['owner', 'mediator'].includes(accountType)) {
        throw new Error('Only owner and mediator accounts can submit property summaries.');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login before submitting the property summary.');
      }

      const parsed = parseSummary(summary);
      const location = await resolveLocation();
      if (!parsed.pincode || !parsed.landmark) {
        const resolvedDetails = await resolveLocationDetailsWithGoogle(parsed, location.coordinates || null);
        parsed.pincode = parsed.pincode || googleResolvedPincode || pincodeForLocationParts(parsed.locality, parsed.societyName, parsed.landmark, parsed.city, parsed.state, summary) || resolvedDetails.pincode;
        parsed.landmark = parsed.landmark || resolvedDetails.landmark;
      }
      if (!parsed.pincode) {
        parsed.pincode = googleResolvedPincode || pincodeForLocationParts(parsed.locality, parsed.societyName, parsed.landmark, parsed.city, parsed.state, summary) || await resolvePincodeWithGoogle(parsed);
      }
      const missing = getMissingPropertyFormFields(parsed, Boolean(plotDiagramFile));
      if (missing.length && !isAdminUser) {
        setMissingFields(missing);
        setMessage('Please add the missing Property Form details before converting.');
        return;
      }
      setMissingFields([]);
      const generatedPlotDiagram = plotDiagramFile ? null : await createPlotDiagramFromSummary(parsed);
      const finalPlotDiagram = plotDiagramFile || generatedPlotDiagram;
      const propertyDetails = {
        ...parsed,
        ...location,
        description: buildSimplePropertyDescription(parsed, summary)
      };

      if (isAdminUser) {
        sessionStorage.setItem('propertySummaryPrefill', JSON.stringify(propertyDetails));
        navigate('/post-property', {
          state: {
            propertySummaryPrefill: propertyDetails,
            plotDiagramFile: finalPlotDiagram,
            projectImages,
            unitPlanImages
          }
        });
        return;
      }

      const data = new FormData();
      data.append('listingIntent', propertyDetails.listingIntent);
      data.append('developmentType', propertyDetails.developmentType);
      data.append('totalArea', propertyDetails.totalArea);
      data.append('areaUnit', propertyDetails.areaUnit);
      data.append('northSideLength', propertyDetails.northSideLength);
      data.append('southSideLength', propertyDetails.southSideLength);
      data.append('eastSideLength', propertyDetails.eastSideLength);
      data.append('westSideLength', propertyDetails.westSideLength);
      data.append('facing', propertyDetails.facing);
      data.append('roadFacingDirection', propertyDetails.roadFacingDirection);
      data.append('roadSize', propertyDetails.roadSize);
      data.append('frontageWidth', propertyDetails.frontageWidth);
      data.append('pincode', propertyDetails.pincode);
      data.append('zoningClassification', propertyDetails.zoningClassification);
      data.append('developerRatio', propertyDetails.developerRatio);
      data.append('partlySale', propertyDetails.partlySale);
      data.append('partlySaleUnit', propertyDetails.partlySaleUnit);
      data.append('partlySaleValue', propertyDetails.partlySaleValue);
      data.append('partlySalePrice', propertyDetails.partlySalePrice);
      data.append('state', propertyDetails.state);
      data.append('city', propertyDetails.city);
      data.append('locality', propertyDetails.locality);
      data.append('societyName', propertyDetails.societyName);
      data.append('landmark', propertyDetails.landmark);
      data.append('map', propertyDetails.mapLink || '');
      data.append('coordinates', JSON.stringify(propertyDetails.coordinates || {}));
      data.append('goodwill', propertyDetails.goodwill);
      data.append('advance', propertyDetails.advance);
      data.append('squareYardPrice', propertyDetails.squareYardPrice);
      data.append('purchaseTimeline', '');
      data.append('description', propertyDetails.description);
      data.append('bedrooms', propertyDetails.bedrooms || '');
      data.append('bathrooms', propertyDetails.bathrooms || '');
      data.append('floorNumber', propertyDetails.floorNumber || '');
      data.append('totalFloors', propertyDetails.totalFloors || '');
      data.append('furnishingStatus', propertyDetails.furnishingStatus || '');
      data.append('possessionStatus', propertyDetails.possessionStatus || '');
      data.append('flatSize', propertyDetails.flatSize || '');
      data.append('flatSizeMin', propertyDetails.flatSizeMin || '');
      data.append('flatSizeMax', propertyDetails.flatSizeMax || '');
      data.append('flatFacing', propertyDetails.flatFacing || '');
      data.append('floorToFloorHeight', propertyDetails.floorToFloorHeight || '');
      data.append('projectName', propertyDetails.projectName || '');
      data.append('companyName', propertyDetails.companyName || '');
      data.append('squareFeetPrice', propertyDetails.squareFeetPrice || '');
      data.append('totalBudget', propertyDetails.totalBudget || '');
      data.append('totalBudgetOnwards', String(Boolean(propertyDetails.totalBudgetOnwards)));
      data.append('selectedAmenities', JSON.stringify(propertyDetails.selectedAmenities || []));
      data.append('projectTotalUnits', propertyDetails.projectTotalUnits || '');
      data.append('reraId', propertyDetails.reraId || '');
      data.append('permissionNo', propertyDetails.permissionNo || '');
      const floorPlanUnitsList = propertyDetails.floorPlanUnits || [];
      data.append('floorPlanUnits', JSON.stringify(
        floorPlanUnitsList.map((unit) => ({
          bedrooms: unit.bedrooms,
          size: unit.size,
          price: unit.price,
          plotSizeSqYd: '',
          dimension: '',
          unitFacing: unit.unitFacing,
          existingImageUrls: [],
          // The same uploaded floor plan images are attached to every unit
          // typology - the backend consumes 'floorPlan' files sequentially
          // per unit's declared count, so they're uploaded once per unit.
          newFileCount: unitPlanImages.length,
          rooms: []
        }))
      ));
      floorPlanUnitsList.forEach(() => {
        unitPlanImages.forEach((file) => {
          data.append('floorPlan', file);
        });
      });
      data.append('localityHighlights', propertyDetails.localityHighlights || '');
      data.append('projectHighlights', propertyDetails.projectHighlights || '');
      data.append('possessionDate', propertyDetails.possessionDate || '');
      data.append('bhkBathrooms', JSON.stringify(propertyDetails.bhkBathrooms || {}));

      if (finalPlotDiagram) {
        data.append('plotDiagram', finalPlotDiagram);
      }
      projectImages.forEach((file) => {
        data.append('images', file);
      });

      const res = await fetch(`${API_BASE}/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      const responseText = await res.text();
      let json;
      try {
        json = JSON.parse(responseText);
      } catch {
        const shortResponse = responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        throw new Error(shortResponse || 'Server returned an invalid response.');
      }

      if (!res.ok) {
        throw new Error(json.error || json.details || 'Failed to submit property summary');
      }

      alert('Property summary submitted successfully! It will be visible after admin approval.');
      navigate('/user-posted-properties');
    } catch (error: any) {
      setMessage(error.message || 'Unable to submit the property summary.');
    } finally {
      setIsResolving(false);
    }
  };

  const handlePlotDiagram = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPlotDiagramFile(file);
  };

  const handleProjectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setProjectImages((prev) => [...prev, ...files].slice(0, MAX_PROJECT_IMAGES));
    event.target.value = '';
  };

  const removeProjectImage = (index: number) => {
    setProjectImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUnitPlanImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUnitPlanImages((prev) => [...prev, ...files].slice(0, MAX_UNIT_PLAN_IMAGES));
    event.target.value = '';
  };

  const removeUnitPlanImage = (index: number) => {
    setUnitPlanImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateFromUrl = async () => {
    const url = propertyUrl.trim();
    if (!url) {
      setUrlGenerateError('Paste a property listing link first.');
      return;
    }
    setIsGeneratingFromUrl(true);
    setUrlGenerateError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/fetch-property-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate a property summary from that link.');

      setSummary(data.text || '');
      setExtractedImages(Array.isArray(data.images) ? data.images : []);
      setSelectedExtractedImages(new Set());
      setMissingFields([]);
      if (message) setMessage('');
    } catch (error: any) {
      setUrlGenerateError(error.message || 'Could not generate a property summary from that link.');
    } finally {
      setIsGeneratingFromUrl(false);
    }
  };

  const toggleExtractedImageSelection = (url: string) => {
    setSelectedExtractedImages((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };

  const dataUrlToFile = async (dataUrl: string, filename: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  };

  const addSelectedExtractedImagesTo = async (pool: 'project' | 'unit') => {
    const urls = Array.from(selectedExtractedImages);
    if (!urls.length) return;
    setIsAddingExtractedImages(true);
    try {
      const token = localStorage.getItem('token');
      const files: File[] = [];
      for (let i = 0; i < urls.length; i += 1) {
        try {
          const res = await fetch(`${API_BASE}/fetch-property-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ url: urls[i] })
          });
          const data = await res.json();
          if (!res.ok) continue;
          files.push(await dataUrlToFile(data.dataUrl, `property-image-${i + 1}.jpg`));
        } catch {
          // Skip images that fail to download; the rest still get added.
        }
      }
      if (pool === 'project') {
        setProjectImages((prev) => [...prev, ...files].slice(0, MAX_PROJECT_IMAGES));
      } else {
        setUnitPlanImages((prev) => [...prev, ...files].slice(0, MAX_UNIT_PLAN_IMAGES));
      }
      setSelectedExtractedImages(new Set());
    } finally {
      setIsAddingExtractedImages(false);
    }
  };

  const addVoiceTextToSummary = (rawText: string) => {
    const detected = rawText.trim();
    if (!detected) return;

    const normalized = normalizePropertyText(detected);
    setDetectedVoiceText(detected);
    setCorrectedVoiceText(normalized);
    setSuggestedVoiceTerms(voiceSuggestions(detected, normalized));
    setSummary((prev) => [prev.trim(), normalized].filter(Boolean).join('\n'));
    setMessage('Voice details detected and corrected. Please review once before converting to property form.');
  };

  const startBrowserSpeechFallback = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage('Voice input is not supported in this browser. Please type the property details manually.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setMessage('Listening... please speak the property details.');
    };

    recognition.onresult = (event: any) => {
      const text = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || '')
        .join(' ')
        .trim();

      if (text) {
        addVoiceTextToSummary(text);
      }
    };

    recognition.onerror = () => {
      setMessage('Voice input could not read clearly. Please try again or type the details.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'property-details.webm');
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE}/speech`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Voice recognition failed');
    return data.text || '';
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleVoiceInput = async () => {
    if (isListening) {
      stopVoiceRecording();
      return;
    }

    setMessage('');
    setDetectedVoiceText('');
    setCorrectedVoiceText('');
    setSuggestedVoiceTerms([]);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      startBrowserSpeechFallback();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setIsListening(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          setMessage('Detecting property details...');
          const transcript = await transcribeAudio(audioBlob);
          addVoiceTextToSummary(transcript);
        } catch (error: any) {
          setMessage(error.message || 'Voice recognition failed. Please type the details manually.');
        }
      };

      recorder.start();
      setIsListening(true);
      setMessage('Listening... say details like: 1300 square yards east facing north 40 south 40 Miyapur Hyderabad.');
      recordingTimerRef.current = window.setTimeout(stopVoiceRecording, 12000);
    } catch (error: any) {
      setIsListening(false);
      setMessage(error.message || 'Microphone permission is required. Please allow microphone access or type the details.');
    }
  };

  const voiceExtracted = correctedVoiceText ? parseSummary(correctedVoiceText) : null;

  return (
    <main className="bg-white px-3 py-6 sm:px-4 sm:py-10 lg:py-14">
      <section className="mx-auto w-full max-w-7xl bg-cyan-50/70 px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.45fr] lg:items-start">
          <div className="lg:pt-8">
            <p className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500 before:h-px before:w-8 before:bg-slate-400">
              Property Summary
            </p>
            <h1 className="mt-6 max-w-md text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Share quick property <span className="text-[#0AA6A6]">information</span>.
            </h1>
            <p className="mt-5 hidden max-w-lg text-sm leading-7 text-slate-700 sm:block sm:text-base">
              Add the property summary in text or voice. Map pins and dimension images are optional; location and dimension details should be written in the summary.
            </p>
          </div>

      <form onSubmit={handleSubmit} className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-lg sm:p-7">
        <div className="mb-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
          <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Link2 className="h-5 w-5 text-teal-700" />Property Listing URL</span>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Paste a link to the property's listing page and generate a summary, project images, and unit floor plans from it automatically.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={propertyUrl}
              onChange={(event) => { setPropertyUrl(event.target.value); if (urlGenerateError) setUrlGenerateError(''); }}
              placeholder="https://www.examplebuilder.com/project-name"
              className="w-full flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-600"
            />
            <button
              type="button"
              onClick={handleGenerateFromUrl}
              disabled={isGeneratingFromUrl}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <SparklesIcon className="h-4 w-4" />
              {isGeneratingFromUrl ? 'Generating...' : 'Generate Property'}
            </button>
          </div>
          {urlGenerateError && <p className="mt-2 text-xs font-semibold text-red-600">{urlGenerateError}</p>}

          {extractedImages.length > 0 && (
            <div className="mt-4 border-t border-teal-200 pt-3">
              <p className="text-xs font-bold text-slate-800">
                Found {extractedImages.length} image{extractedImages.length === 1 ? '' : 's'} on that page - select the ones to use:
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {extractedImages.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => toggleExtractedImageSelection(url)}
                    className={`relative overflow-hidden rounded-lg border-2 ${selectedExtractedImages.has(url) ? 'border-teal-600' : 'border-transparent'}`}
                  >
                    <img src={url} alt="Extracted from listing" className="h-16 w-full object-cover" />
                    {selectedExtractedImages.has(url) && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">✓</span>
                    )}
                  </button>
                ))}
              </div>
              {selectedExtractedImages.size > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addSelectedExtractedImagesTo('project')}
                    disabled={isAddingExtractedImages}
                    className="rounded-lg border border-teal-600 bg-white px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAddingExtractedImages ? 'Adding...' : `Add ${selectedExtractedImages.size} to Project Images`}
                  </button>
                  <button
                    type="button"
                    onClick={() => addSelectedExtractedImagesTo('unit')}
                    disabled={isAddingExtractedImages}
                    className="rounded-lg border border-teal-600 bg-white px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAddingExtractedImages ? 'Adding...' : `Add ${selectedExtractedImages.size} to Unit / Floor Plan Images`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <label className="block">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText className="h-5 w-5 text-teal-700" />Property Summary</span>
          </div>
          <p className="mb-2 text-xs font-bold leading-5 text-slate-800 sm:text-sm sm:leading-6">
            Cover the same details as the Property Form: Post Property For (Sell / Buy / Development), Property Type, Total Area (with unit), Facing & Road Facing Direction, Road Size & Frontage Width, Zoning Classification, Bedrooms (for apartments/villas), Square Feet Price or Total Budget, Development Ratio (for development listings), and the full location — Locality, City, State, and Pincode.
          </p>
          <p className="mb-2 text-xs font-semibold leading-5 text-slate-600 sm:text-sm sm:leading-6">
            Example: Standalone, 1300 sq yards, north 40, south 40, east 30, west 30, road size 40, frontage 40, east facing, Miyapur, Hyderabad, 500049.
          </p>
          <textarea
            value={summary}
            onChange={(event) => {
              setSummary(event.target.value);
              setMissingFields([]);
              if (message) setMessage('');
            }}
            rows={8}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm leading-6 outline-none placeholder:font-bold placeholder:text-red-600 focus:border-teal-600"
            placeholder="Enter property details here... (Property వివరాలను ఇక్కడ నమోదు చేయండి...)"
            required
          />
        </label>

        <div className="mx-auto mt-5 max-w-6xl space-y-4">
          {structuredSummaryPreview && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-800">Review structured property summary before converting:</p>
              <div className="mt-3 whitespace-pre-line rounded-lg bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-800 shadow-sm">
                {structuredSummaryPreview}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                This preview is prepared with real-estate wording. Edit the summary above if any detail needs correction.
              </p>
            </div>
          )}

          {summary.trim() && liveMissingFields.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-900">Please fill these missing Property Form details before converting:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {liveMissingFields.map((field) => (
                  <span key={field} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-900 shadow-sm">
                    {field}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-amber-800">
                Add the missing details in the summary text, then review the structured summary again.
              </p>
            </div>
          )}
        </div>

        {detectedVoiceText && (
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-black text-blue-800">Detected:</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{detectedVoiceText}</p>
            {correctedVoiceText && correctedVoiceText !== detectedVoiceText && (
              <>
                <p className="mt-3 text-sm font-black text-blue-800">Corrected real-estate text:</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{correctedVoiceText}</p>
              </>
            )}
            {suggestedVoiceTerms.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-black text-blue-800">Did you mean:</span>
                {suggestedVoiceTerms.map((term) => (
                  <span key={term} className="rounded-full bg-white px-3 py-1 font-bold text-blue-700 shadow-sm">
                    {term}
                  </span>
                ))}
              </div>
            )}
            {voiceExtracted && (
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Area', voiceExtracted.totalArea ? `${voiceExtracted.totalArea} ${voiceExtracted.areaUnit}` : ''],
                  ['Facing', voiceExtracted.facing],
                  ['North', voiceExtracted.northSideLength],
                  ['South', voiceExtracted.southSideLength],
                  ['East', voiceExtracted.eastSideLength],
                  ['West', voiceExtracted.westSideLength],
                  ['Frontage', voiceExtracted.frontageWidth],
                  ['Locality', voiceExtracted.locality]
                ].filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} className="rounded-md bg-white px-3 py-2">
                    <p className="font-bold uppercase text-slate-500">{label}</p>
                    <p className="mt-1 font-black text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><MapPin className="h-5 w-5 text-teal-700" />Google Map Link</span>
            <input
              value={mapLink}
              onChange={(event) => {
                setMapLinkTouched(true);
                setMapLink(event.target.value);
              }}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
              placeholder="Optional: https://www.google.com/maps?q=17.4935,78.3915"
            />
            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <p className="font-bold text-slate-800">Map link is optional and only used for the map pin.</p>
              <p>Please write colony, locality, city, state, pincode, and country in the property summary.</p>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><Image className="h-5 w-5 text-teal-700" />Project Images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleProjectImages}
              disabled={projectImages.length >= MAX_PROJECT_IMAGES}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Optional. Upload up to {MAX_PROJECT_IMAGES} photos of the property (exterior, interior, surroundings).
            </p>
            {projectImages.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {projectImages.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Project photo ${index + 1}`}
                      className="h-16 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeProjectImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-slate-950/70 px-1.5 py-0.5 text-xs font-bold text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><Image className="h-5 w-5 text-teal-700" />Unit / Floor Plan Images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUnitPlanImages}
              disabled={unitPlanImages.length >= MAX_UNIT_PLAN_IMAGES}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Optional. Upload up to {MAX_UNIT_PLAN_IMAGES} floor plan images - applied to every unit typology (3 BHK, 4 BHK, etc.) detected in the summary.
            </p>
            {unitPlanImages.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {unitPlanImages.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Unit floor plan ${index + 1}`}
                      className="h-16 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeUnitPlanImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-slate-950/70 px-1.5 py-0.5 text-xs font-bold text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </label>
        </div>

        {message && <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-800">{message}</div>}

        <button
          type="submit"
          disabled={isResolving}
          className="ld-summary-primary-button mt-7 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isResolving ? 'Preparing...' : isAdminUser ? 'Continue to Property Form' : 'Submit for Admin Approval'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
        </div>
      </section>
    </main>
  );
};

export default PropertySummary;
