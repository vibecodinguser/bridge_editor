const TILE_SIZE = 256

const worldSize = (z: number) => TILE_SIZE * Math.pow(2, z)

const lonToWorldX = (lon: number, z: number): number =>
  ((lon + 180) / 360) * worldSize(z)

const latToWorldY = (lat: number, z: number): number => {
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const clamped = Math.max(-0.9999, Math.min(0.9999, sinLat))
  return (
    (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) *
    worldSize(z)
  )
}

const worldXToLon = (x: number, z: number): number =>
  (x / worldSize(z)) * 360 - 180

const worldYToLat = (y: number, z: number): number => {
  const n = Math.PI - (2 * Math.PI * y) / worldSize(z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export interface PixelOffset {
  dx: number
  dy: number
}

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
