import { normalizeSolar, type SolarRoof } from '../../worker/solar';
import { offsetPoint } from '../../src/lib/solar-geometry';
import { solarFixture } from './solar.mjs';
export function gridRoof(): SolarRoof {
  const result = normalizeSolar(solarFixture());
  if (!result.data_available) throw new Error('Fixture');
  const roof = result.roof;
  roof.segments = [{ pitchDegrees: 10, azimuthDegrees: 0 }];
  roof.panels = Array.from({ length: 64 }, (_, i) => {
    const point = offsetPoint(
      { lat: 15, lng: 79 },
      (i % 8) * 2,
      Math.floor(i / 8) * Math.cos((10 * Math.PI) / 180),
    );
    return {
      center: { latitude: point.lat, longitude: point.lng },
      segmentIndex: 0,
      orientation: 'LANDSCAPE' as const,
      yearlyEnergyDcKwh: 600,
    };
  });
  return roof;
}
