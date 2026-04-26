import { describe, expect, it } from "vitest"
import { parseYandexUrl } from "./yandex-url"

describe("parseYandexUrl", () => {
  it("parses n.maps.yandex.ru hashbang URL (real-world format)", () => {
    const url =
      "https://n.maps.yandex.ru/#!/?z=15&ll=57.725740%2C41.951169&l=nk%23sat"
    expect(parseYandexUrl(url)).toEqual({
      lat: 41.951169,
      lon: 57.72574,
      z: 15,
    })
  })

  it("parses plain query ?ll=lon,lat&z=", () => {
    const url = "https://yandex.ru/maps/?ll=37.62,55.75&z=12"
    expect(parseYandexUrl(url)).toEqual({
      lat: 55.75,
      lon: 37.62,
      z: 12,
    })
  })

  it("parses spn=lon,lat with zoom alias", () => {
    const url = "https://example.com/?spn=30.3,59.95&zoom=11"
    expect(parseYandexUrl(url)).toEqual({
      lat: 59.95,
      lon: 30.3,
      z: 11,
    })
  })

  it("parses hash query without hashbang", () => {
    const url = "https://n.maps.yandex.ru/#z=10&ll=20.5,60.25"
    expect(parseYandexUrl(url)).toEqual({
      lat: 60.25,
      lon: 20.5,
      z: 10,
    })
  })

  it("parses OSM-style hash zoom/lat/lon", () => {
    const url = "https://example.com/#12/55.75/37.62"
    expect(parseYandexUrl(url)).toEqual({
      lat: 55.75,
      lon: 37.62,
      z: 12,
    })
  })

  it("parses lat= lon= in query", () => {
    const url = "https://example.com/?lat=55&lon=37&z=9"
    expect(parseYandexUrl(url)).toEqual({
      lat: 55,
      lon: 37,
      z: 9,
    })
  })

  it("returns null for invalid URL string", () => {
    expect(parseYandexUrl("not-a-url")).toBeNull()
  })

  it("returns null when z is missing", () => {
    expect(parseYandexUrl("https://n.maps.yandex.ru/#!/?ll=1,2")).toBeNull()
  })

  it("returns null when coordinates are out of range", () => {
    expect(
      parseYandexUrl("https://x/?z=5&ll=0,200")
    ).toBeNull()
  })
})
