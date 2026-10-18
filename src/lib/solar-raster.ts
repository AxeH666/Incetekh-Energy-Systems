import { fromArrayBuffer } from 'geotiff';
import proj4 from 'proj4';
import type { SolarRaster } from '../../worker/solar-imagery';
import type { SolarRoof } from '../../worker/solar';
import type { LoadedRoofImage } from './solar-map';
import type { MapPoint } from './solar-geometry';
import { footprintsOnMask } from './solar-roof-mask';

const maxPixels = 1_500_000;
async function decode(value: string, bands: number, signal: AbortSignal) {
  if (typeof value !== 'string' || value.length > 5_333_336)
    throw new Error('image');
  signal.throwIfAborted();
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const tiff = await fromArrayBuffer(bytes.buffer);
  const image = await tiff.getImage();
  const width = image.getWidth(),
    height = image.getHeight();
  const tileWidth = image.getTileWidth(),
    tileHeight = image.getTileHeight();
  const tags = image.fileDirectory;
  const keys = image.getGeoKeys();
  const epsg = keys?.ProjectedCSTypeGeoKey;
  // Google Solar supplies north-up WGS84 UTM GeoTIFFs. Unknown/rotated CRS fail
  // closed instead of interpreting metre coordinates as longitude/latitude.
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 2 ||
    height < 2 ||
    width * height > maxPixels ||
    tileWidth < 1 ||
    tileHeight < 1 ||
    !Number.isInteger(tileWidth) ||
    !Number.isInteger(tileHeight) ||
    tileWidth * tileHeight > maxPixels ||
    image.getSamplesPerPixel() !== bands ||
    !Number.isInteger(epsg) ||
    epsg < 32601 ||
    epsg > 32660 ||
    keys?.GTRasterTypeGeoKey !== 1
  )
    throw new Error('image');
  const bits = tags.getValue('BitsPerSample') as number[];
  if (tags.getValue('PhotometricInterpretation') !== (bands === 3 ? 2 : 1))
    throw new Error('image');
  if (bits.length !== bands || bits.some((v) => v !== 8))
    throw new Error('image');
  let origin: number[], scale: number[];
  if (tags.hasTag('ModelTransformation')) {
    const matrix = tags.getValue('ModelTransformation') as number[];
    if (
      tags.hasTag('ModelTiepoint') ||
      tags.hasTag('ModelPixelScale') ||
      !matrix ||
      matrix.length !== 16 ||
      matrix.some((v) => !Number.isFinite(v)) ||
      [1, 2, 4, 6, 8, 9, 11, 12, 13, 14].some((i) => matrix[i] !== 0) ||
      ![0, 1].includes(matrix[10]) ||
      matrix[15] !== 1
    )
      throw new Error('image');
    // getResolution() loses the Y sign for matrix-tagged Google rasters.
    origin = [matrix[3], matrix[7], 0];
    scale = [matrix[0], matrix[5], 0];
  } else {
    const ties = tags.getValue('ModelTiepoint') as number[];
    if (
      !ties ||
      ties.length !== 6 ||
      ties.some((v) => !Number.isFinite(v)) ||
      ties[0] !== 0 ||
      ties[1] !== 0 ||
      ties[2] !== 0
    )
      throw new Error('image');
    origin = image.getOrigin();
    scale = image.getResolution();
  }
  if (
    ![...origin, ...scale].every(Number.isFinite) ||
    scale[0] <= 0 ||
    scale[1] >= 0 ||
    scale[0] > 1 ||
    -scale[1] > 1
  )
    throw new Error('image');
  const projection = proj4(
    'EPSG:4326',
    `+proj=utm +zone=${epsg - 32600} +datum=WGS84 +units=m +no_defs`,
  );
  const data = await image.readRasters({ interleave: true, signal });
  signal.throwIfAborted();
  if (!(data instanceof Uint8Array) || data.length !== width * height * bands)
    throw new Error('image');
  const pixel = (point: MapPoint) => {
    const [e, n] = projection.forward([point.lng, point.lat]);
    return [(e - origin[0]) / scale[0], (n - origin[1]) / scale[1]];
  };
  const point = (x: number, y: number): MapPoint => {
    const [lng, lat] = projection.inverse([
      origin[0] + x * scale[0],
      origin[1] + y * scale[1],
    ]);
    return { lat, lng };
  };
  return {
    width,
    height,
    data,
    pixel,
    point,
    grid: JSON.stringify([epsg, width, height, origin, scale]),
  };
}

export interface MatchedRoofImage extends LoadedRoofImage {
  contains(paths: MapPoint[][]): boolean;
}

export async function loadSolarRaster(
  value: SolarRaster,
  roof: SolarRoof,
  signal: AbortSignal,
): Promise<MatchedRoofImage> {
  if (
    !value ||
    value.kind !== 'geotiff' ||
    value.imageryDate !== roof.imageryDate
  )
    throw new Error('image');
  const rgb = await decode(value.rgb, 3, signal);
  const mask = await decode(value.mask, 1, signal);
  if (rgb.grid !== mask.grid) throw new Error('image');
  const perimeter: MapPoint[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = (i / 16) * rgb.width,
      y = (i / 16) * rgb.height;
    perimeter.push(
      rgb.point(x, 0),
      rgb.point(x, rgb.height),
      rgb.point(0, y),
      rgb.point(rgb.width, y),
    );
  }
  const bounds = {
    south: Math.min(...perimeter.map((p) => p.lat)),
    north: Math.max(...perimeter.map((p) => p.lat)),
    west: Math.min(...perimeter.map((p) => p.lng)),
    east: Math.max(...perimeter.map((p) => p.lng)),
  };
  if (
    !Object.values(bounds).every(Number.isFinite) ||
    bounds.north - bounds.south > 0.01 ||
    bounds.east - bounds.west > 0.01 ||
    bounds.south > roof.bounds.sw.latitude ||
    bounds.north < roof.bounds.ne.latitude ||
    bounds.west > roof.bounds.sw.longitude ||
    bounds.east < roof.bounds.ne.longitude
  )
    throw new Error('image');
  // Reproject pixels, not just the corners. GroundOverlay is linear in Web
  // Mercator; stretching a UTM rectangle over lat/lng bounds causes misalignment.
  const mercator = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const inverseMercator = (y: number) =>
    ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
  const north = mercator(bounds.north),
    south = mercator(bounds.south);
  const width = Math.min(
    1200,
    Math.ceil(
      ((((bounds.east - bounds.west) * Math.PI) / 180) *
        6378137 *
        Math.cos((roof.center.latitude * Math.PI) / 180)) /
        0.25,
    ),
  );
  const height = Math.min(
    1200,
    Math.ceil(
      ((((bounds.north - bounds.south) * Math.PI) / 180) * 6378137) / 0.25,
    ),
  );
  if (width < 2 || height < 2 || width * height > maxPixels)
    throw new Error('image');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('image');
  const output = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    if (y % 32 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    }
    const lat = inverseMercator(north + ((south - north) * (y + 0.5)) / height);
    for (let x = 0; x < width; x++) {
      const lng =
        bounds.west + ((bounds.east - bounds.west) * (x + 0.5)) / width;
      const [px, py] = rgb.pixel({ lat, lng });
      const sx = Math.floor(px),
        sy = Math.floor(py);
      if (sx < 0 || sy < 0 || sx >= rgb.width || sy >= rgb.height) continue;
      const src = (sy * rgb.width + sx) * 3,
        dst = (y * width + x) * 4;
      output.data[dst] = rgb.data[src];
      output.data[dst + 1] = rgb.data[src + 1];
      output.data[dst + 2] = rgb.data[src + 2];
      output.data[dst + 3] = 255;
    }
  }
  context.putImageData(output, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('image'))),
      'image/png',
    ),
  );
  signal.throwIfAborted();
  const url = URL.createObjectURL(blob);
  return {
    url,
    bounds,
    imageryDate: value.imageryDate,
    release: () => URL.revokeObjectURL(url),
    contains(paths) {
      return footprintsOnMask(
        paths.map((path) =>
          path.map((point) => mask.pixel(point) as [number, number]),
        ),
        mask.width,
        mask.height,
        mask.data,
      );
    },
  };
}
