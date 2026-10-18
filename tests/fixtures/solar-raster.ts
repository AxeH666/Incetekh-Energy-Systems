import { writeArrayBuffer } from 'geotiff';
import proj4 from 'proj4';
import { solarFixture } from './solar.mjs';
import { normalizeSolar } from '../../worker/solar';

// Generated pixels and a WGS84 UTM grid, never copied provider imagery.
export function rasterFixture(
  onRoof = true,
  epsg = 32644,
  shiftedTiepoint = false,
  matrixTag = false,
) {
  const raw = solarFixture();
  raw.boundingBox = {
    sw: { latitude: 14.99982, longitude: 78.99982 },
    ne: { latitude: 15.00018, longitude: 79.00018 },
  };
  const result = normalizeSolar(raw);
  if (result.status !== 'available') throw new Error('fixture');
  const [e, n] = proj4(
    'EPSG:4326',
    '+proj=utm +zone=44 +datum=WGS84 +units=m',
    [79, 15],
  );
  const metadata = {
    width: 320,
    height: 320,
    ...(matrixTag
      ? {
          ModelTransformation: [
            0.25,
            0,
            0,
            e - 40,
            0,
            -0.25,
            0,
            n + 40,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
          ],
        }
      : {
          ModelPixelScale: [0.25, 0.25, 0],
          ModelTiepoint: [shiftedTiepoint ? 10 : 0, 0, 0, e - 40, n + 40, 0],
        }),
    GTModelTypeGeoKey: 1,
    GTRasterTypeGeoKey: 1,
    ProjectedCSTypeGeoKey: epsg,
    GeogAngularUnitsGeoKey: 9102,
  };
  const rgb = new Uint8Array(320 * 320 * 3);
  for (let y = 0; y < 320; y++)
    for (let x = 0; x < 320; x++) {
      const i = (y * 320 + x) * 3;
      rgb[i] = x < 160 ? 220 : 20;
      rgb[i + 1] = y < 160 ? 220 : 20;
      rgb[i + 2] = 80;
    }
  const mask = new Uint8Array(320 * 320).fill(onRoof ? 1 : 0);
  return {
    ...result,
    reference: '00000000-0000-4000-8000-000000000001',
    selectedLocation: { latitude: 15, longitude: 79 },
    roofRaster: {
      kind: 'geotiff' as const,
      imageryDate: result.roof.imageryDate,
      rgb: Buffer.from(
        writeArrayBuffer(rgb, {
          ...metadata,
          SamplesPerPixel: 3,
          BitsPerSample: [8, 8, 8],
          PhotometricInterpretation: 2,
        }),
      ).toString('base64'),
      mask: Buffer.from(
        writeArrayBuffer(mask, {
          ...metadata,
          SamplesPerPixel: 1,
          BitsPerSample: [8],
          PhotometricInterpretation: 1,
        }),
      ).toString('base64'),
    },
  };
}
