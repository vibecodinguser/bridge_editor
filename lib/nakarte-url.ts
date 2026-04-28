import type { Viewport } from "./messages"

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

const serializeNakarteHash = (map: Map<string, string>): string => {
  if (map.size === 0) return ""
  const parts: string[] = []
  for (const [k, v] of map) {
    parts.push(v ? `${k}=${v}` : k)
  }
  return "#" + parts.join("&")
}

export const mergeNakarteViewport = (currentUrl: string, viewport: Viewport): string => {
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
