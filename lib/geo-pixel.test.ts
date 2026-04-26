import { describe, expect, it } from "vitest"
import { geoToPixelOffset, pixelOffsetToGeo } from "./geo-pixel"

describe("geo-pixel Web Mercator", () => {
  const centerLat = 55.75
  const centerLon = 37.62
  const z = 10

  it("round-trips geo → pixel → geo at center", () => {
    const { dx, dy } = geoToPixelOffset(
      centerLat,
      centerLon,
      z,
      centerLat,
      centerLon
    )
    expect(dx).toBeCloseTo(0, 5)
    expect(dy).toBeCloseTo(0, 5)

    const back = pixelOffsetToGeo(centerLat, centerLon, z, { dx: 0, dy: 0 })
    expect(back.lat).toBeCloseTo(centerLat, 8)
    expect(back.lon).toBeCloseTo(centerLon, 8)
  })

  it("round-trips arbitrary offset within tolerance", () => {
    const pointLat = 55.76
    const pointLon = 37.63
    const off = geoToPixelOffset(
      centerLat,
      centerLon,
      z,
      pointLat,
      pointLon
    )
    const back = pixelOffsetToGeo(centerLat, centerLon, z, off)
    expect(back.lat).toBeCloseTo(pointLat, 6)
    expect(back.lon).toBeCloseTo(pointLon, 6)
  })

  it("pixel offset moves lon east when dx positive", () => {
    const p = pixelOffsetToGeo(centerLat, centerLon, z, { dx: 50, dy: 0 })
    expect(p.lon).toBeGreaterThan(centerLon)
    expect(p.lat).toBeCloseTo(centerLat, 5)
  })
})
