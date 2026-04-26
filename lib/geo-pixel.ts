/**
 * Web Mercator (EPSG:3857) pixel ↔ lat/lon conversions.
 *
 * Standard tile size 256px. These formulas match Leaflet / OpenLayers / nakarte,
 * giving visually correct cursor mirroring when both maps use Web Mercator.
 *
 * Note: Yandex Maps also uses Web Mercator for its standard tile layers,
 * so the pixel math aligns well in practice.
 */

const TILE_SIZE = 256

/** World size in pixels at a given zoom level */
const worldSize = (z: number) => TILE_SIZE * Math.pow(2, z)

/** Converts longitude (degrees) to world-pixel X at zoom z */
const lonToWorldX = (lon: number, z: number): number =>
  ((lon + 180) / 360) * worldSize(z)

/** Converts latitude (degrees) to world-pixel Y at zoom z (Mercator) */
const latToWorldY = (lat: number, z: number): number => {
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const clamped = Math.max(-0.9999, Math.min(0.9999, sinLat))
  return (
    (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) *
    worldSize(z)
  )
}

/** Converts world-pixel X to longitude at zoom z */
const worldXToLon = (x: number, z: number): number =>
  (x / worldSize(z)) * 360 - 180

/** Converts world-pixel Y to latitude at zoom z (inverse Mercator) */
const worldYToLat = (y: number, z: number): number => {
  const n = Math.PI - (2 * Math.PI * y) / worldSize(z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export interface PixelOffset {
  /** Pixels right of map center */
  dx: number
  /** Pixels below map center */
  dy: number
}

/**
 * Converts a pixel offset from the map's center (dx right, dy down)
 * at the given center lat/lon and zoom into a geographic position.
 */
export const pixelOffsetToGeo = (
  centerLat: number,
  centerLon: number,
  z: number,
  { dx, dy }: PixelOffset
): { lat: number; lon: number } => {
  const cx = lonToWorldX(centerLon, z)
  const cy = latToWorldY(centerLat, z)
  return {
    lat: worldYToLat(cy + dy, z),
    lon: worldXToLon(cx + dx, z),
  }
}

/**
 * Converts a geographic position into a pixel offset from the map's center.
 */
export const geoToPixelOffset = (
  centerLat: number,
  centerLon: number,
  z: number,
  pointLat: number,
  pointLon: number
): PixelOffset => {
  const cx = lonToWorldX(centerLon, z)
  const cy = latToWorldY(centerLat, z)
  const px = lonToWorldX(pointLon, z)
  const py = latToWorldY(pointLat, z)
  return { dx: px - cx, dy: py - cy }
}
