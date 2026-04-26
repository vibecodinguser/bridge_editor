import { describe, expect, it } from "vitest"
import {
  extractNakarteLayers,
  injectNakarteLayers,
  mergeNakarteViewport,
} from "./nakarte-url"

describe("mergeNakarteViewport", () => {
  it("sets m= and preserves l=", () => {
    const current =
      "https://nakarte.me/#m=10/55.000000/37.000000&l=O/D/Wp"
    const next = mergeNakarteViewport(current, {
      lat: 41.951169,
      lon: 57.72574,
      z: 15,
    })
    const u = new URL(next)
    expect(u.hash).toContain("l=O/D/Wp")
    expect(u.hash).toContain("m=15/41.951169/57.725740")
  })

  it("adds m= when only layers exist", () => {
    const current = "https://nakarte.me/#l=O"
    const next = mergeNakarteViewport(current, { lat: 1, lon: 2, z: 3 })
    expect(new URL(next).hash).toContain("l=O")
    expect(new URL(next).hash).toContain("m=3/1.000000/2.000000")
  })

  it("rounds zoom to integer in hash", () => {
    const next = mergeNakarteViewport("https://nakarte.me/", {
      lat: 0,
      lon: 0,
      z: 14.7,
    })
    expect(new URL(next).hash).toContain("m=15/")
  })
})

describe("extractNakarteLayers", () => {
  it("returns l= value or null", () => {
    expect(
      extractNakarteLayers("https://nakarte.me/#m=1/0/0&l=O/D")
    ).toBe("O/D")
    expect(extractNakarteLayers("https://nakarte.me/#m=1/0/0")).toBeNull()
  })

  it("returns null for invalid URL", () => {
    expect(extractNakarteLayers("not-a-url")).toBeNull()
  })
})

describe("injectNakarteLayers", () => {
  it("adds l= only when absent", () => {
    const a = injectNakarteLayers("https://nakarte.me/", "O/D")
    expect(new URL(a).hash).toContain("l=O/D")

    const b = injectNakarteLayers(
      "https://nakarte.me/#l=existing",
      "O/D"
    )
    expect(new URL(b).hash).toContain("l=existing")
    expect(new URL(b).hash).not.toContain("O/D")
  })

  it("returns original string on parse error", () => {
    const bad = "%%%"
    expect(injectNakarteLayers(bad, "O")).toBe(bad)
  })
})
