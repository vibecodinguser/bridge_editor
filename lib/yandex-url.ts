import type { Viewport } from "./messages"

export const parseYandexUrl = (url: string): Viewport | null => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const vp1 = parseFromSearchParams(parsed.searchParams)
  if (vp1) return vp1

  const rawHash = parsed.hash.startsWith("#")
    ? parsed.hash.slice(1)
    : parsed.hash

  if (!rawHash) return null

  let hashContent = rawHash
  if (hashContent.startsWith("!")) {
    const qPos = hashContent.indexOf("?")
    if (qPos !== -1) {
      hashContent = hashContent.slice(qPos + 1)
    } else {
      hashContent = hashContent.replace(/^!\/?/, "")
    }
  }

  const hp = new URLSearchParams(hashContent)
  const vp2 = parseFromSearchParams(hp)
  if (vp2) return vp2

  const slashMatch = hashContent.match(
    /^(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/
  )
  if (slashMatch) {
    return makeViewport(
      parseFloat(slashMatch[2]),
      parseFloat(slashMatch[3]),
      parseFloat(slashMatch[1])
    )
  }

  return null
}

const parseFromSearchParams = (params: URLSearchParams): Viewport | null => {
  const zRaw = params.get("z") ?? params.get("zoom")
  if (!zRaw) return null
  const z = parseFloat(zRaw)

  for (const key of ["ll", "spn"]) {
    const val = params.get(key)
    if (!val) continue
    const parts = val.split(",")
    if (parts.length < 2) continue
    const a = parseFloat(parts[0])
    const b = parseFloat(parts[1])
    const vp = makeViewport(b, a, z)
    if (vp) return vp
  }

  const lat = parseFloat(params.get("lat") ?? "")
  const lon = parseFloat(params.get("lon") ?? "")
  return makeViewport(lat, lon, z)
}

const makeViewport = (lat: number, lon: number, z: number): Viewport | null => {
  if (!isFinite(lat) || !isFinite(lon) || !isFinite(z)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon, z }
}
