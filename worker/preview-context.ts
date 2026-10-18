import { inSolarRegion } from './solar.js';

// Persist only consented customer inputs. No provider address, layout or energy.
export interface PreviewContext {
  version: 1;
  consent: true;
  calculatorVersion: 'bill-v1';
  bill: number;
  residential: boolean;
  targetKw: number;
  latitude: number;
  longitude: number;
  preferredContact: 'none' | 'phone' | 'email' | 'whatsapp';
  reference: string;
}
export function previewContext(input: unknown): PreviewContext | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return;
  const v = input as Record<string, unknown>;
  if (
    Object.keys(v).sort().join(',') !==
      'bill,calculatorVersion,consent,latitude,longitude,preferredContact,reference,residential,targetKw,version' ||
    v.version !== 1 ||
    v.consent !== true ||
    v.calculatorVersion !== 'bill-v1' ||
    typeof v.bill !== 'number' ||
    !Number.isSafeInteger(v.bill) ||
    v.bill < 200 ||
    v.bill > 50000 ||
    (v.bill - 200) % 100 !== 0 ||
    typeof v.residential !== 'boolean' ||
    // Versioned existing calculator: INR8/unit,120units/kW/month,whole-kW ceiling.
    v.targetKw !== Math.max(1, Math.ceil(v.bill / 8 / 120)) ||
    typeof v.latitude !== 'number' ||
    typeof v.longitude !== 'number' ||
    !inSolarRegion({ latitude: v.latitude, longitude: v.longitude }) ||
    typeof v.preferredContact !== 'string' ||
    !['none', 'phone', 'email', 'whatsapp'].includes(v.preferredContact) ||
    typeof v.reference !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      v.reference,
    )
  )
    return;
  // Stable ordering makes equivalent JSON retries share a receipt hash.
  return {
    version: 1,
    consent: true,
    calculatorVersion: 'bill-v1',
    bill: v.bill,
    residential: v.residential,
    targetKw: v.targetKw as number,
    latitude: v.latitude,
    longitude: v.longitude,
    preferredContact: v.preferredContact as PreviewContext['preferredContact'],
    reference: v.reference,
  };
}
export function contextEmail(raw?: string | null): string[] {
  if (!raw || raw.length > 1024) return [];
  try {
    const context = previewContext(JSON.parse(raw));
    if (!context) return [];
    return [
      '',
      'Consented preliminary customer context (not a quote or saved roof design):',
      `Monthly bill: INR ${context.bill}; ${context.residential ? 'residential' : 'commercial'}`,
      `Bill-based target: ${context.targetKw} kW; calculator ${context.calculatorVersion}`,
      `Customer-selected coordinates: ${context.latitude}, ${context.longitude}`,
      `Preferred contact: ${context.preferredContact}`,
      `Journey reference: ${context.reference}`,
    ];
  } catch {
    return [];
  }
}
