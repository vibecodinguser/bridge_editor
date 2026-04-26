import type { Viewport } from "./messages"

/**
 * Parses nakarte.me hash parameters into a key→value map.
 * Format: `#key1=val1&key2=val2`
 */
const parseNakarteHash = (hash: string): Map<string, string> => {
  const map = new Map<string, string>()
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw) return map
  for (const part of raw.split("&")) {
    const eq = part.indexOf("=")
    if (eq === -1) {
      map.set(part, "")
    } else {
      map.set(part.slice(0, eq), part.slice(eq + 1))
    }
  }
  return map
}

/**
 * Serialises a nakarte hash parameter map back to a `#…` string.
 */
const serializeNakarteHash = (map: Map<string, string>): string => {
  if (map.size === 0) return ""
  const parts: string[] = []
  for (const [k, v] of map) {
    parts.push(v ? `${k}=${v}` : k)
  }
  return "#" + parts.join("&")
}

/**
 * Merges a new viewport (from Yandex NK) into the current nakarte.me URL,
 * preserving the `l` (layers) param and all other existing params.
 *
 * Nakarte URL format: `https://nakarte.me/#m=<z>/<lat>/<lon>&l=<layers>`
 */
export const mergeNakarteViewport = (
  currentUrl: string,
  viewport: Viewport
): string => {
  let parsed: URL
  try {
    parsed = new URL(currentUrl)
  } catch {
    parsed = new URL("https://nakarte.me/")
  }

  const map = parseNakarteHash(parsed.hash)

  const { lat, lon, z } = viewport
  const zRounded = Math.round(z)
  const latStr = lat.toFixed(6)
  const lonStr = lon.toFixed(6)
  map.set("m", `${zRounded}/${latStr}/${lonStr}`)

  parsed.hash = serializeNakarteHash(map)
  return parsed.toString()
}

/**
 * Extracts the `l` (layers) value from a nakarte.me URL hash, or null.
 */
export const extractNakarteLayers = (url: string): string | null => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const map = parseNakarteHash(parsed.hash)
  return map.get("l") ?? null
}

/**
 * Injects saved layer codes into a nakarte.me start URL (only if `l` is absent).
 */
export const injectNakarteLayers = (url: string, layers: string): string => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  const map = parseNakarteHash(parsed.hash)
  if (!map.has("l")) {
    map.set("l", layers)
    parsed.hash = serializeNakarteHash(map)
  }
  return parsed.toString()
}
