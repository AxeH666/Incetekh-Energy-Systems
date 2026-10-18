import { billSlider, estimateSolar } from '../data/solar';
import { languages, type Language } from '../i18n/languages';

export const solarSessionKey = 'incetekh.solar-preview.v1';
export const sessionLifetime = 30 * 60 * 1000;
export interface SolarSession {
  version: 1;
  createdAt: number;
  bill: number;
  residential: boolean;
  language: Language;
  requestedKw?: 3 | 5 | 7 | 10;
}
export function parseSolarSession(
  raw: string | null,
  now = Date.now(),
): SolarSession | null {
  try {
    if (!raw || raw.length > 512) return null;
    const value = JSON.parse(raw);
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      ![
        'bill,createdAt,language,residential,version',
        'bill,createdAt,language,requestedKw,residential,version',
      ].includes(Object.keys(value).sort().join(',')) ||
      ('requestedKw' in value && ![3, 5, 7, 10].includes(value.requestedKw)) ||
      value.version !== 1 ||
      !Number.isSafeInteger(value.createdAt) ||
      value.createdAt > now ||
      now - value.createdAt >= sessionLifetime ||
      !Number.isSafeInteger(value.bill) ||
      value.bill < billSlider.min ||
      value.bill > billSlider.max ||
      (value.bill - billSlider.min) % billSlider.step !== 0 ||
      typeof value.residential !== 'boolean' ||
      !languages.some(({ code }) => code === value.language)
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function readSolarSession(): SolarSession | null {
  try {
    const session = parseSolarSession(sessionStorage.getItem(solarSessionKey));
    if (!session) sessionStorage.removeItem(solarSessionKey);
    return session;
  } catch {
    return null;
  }
}
export function writeSolarSession(session: SolarSession): boolean {
  try {
    if (!parseSolarSession(JSON.stringify(session))) return false;
    sessionStorage.setItem(solarSessionKey, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}
export function billEstimate(session: SolarSession) {
  return estimateSolar({
    mode: 'bill',
    amount: session.bill,
    tariff: billSlider.tariff,
    residential: session.residential,
  })!;
}
export function planForTarget(kw: number) {
  return [3, 5, 7].includes(kw) ? `${kw}kw` : kw >= 10 ? '10plus' : 'advice';
}
