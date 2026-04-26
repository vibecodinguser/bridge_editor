import type { Viewport } from "./messages"

/**
 * Comprehensive Yandex NK URL parser.
 *
 * n.maps.yandex.ru stores map state in the hash using a hashbang prefix:
 *   https://n.maps.yandex.ru/#!/?z=15&ll=57.725740%2C41.951169&l=nk%23sat
 *
 * The relevant part is after "#!/?" — standard query params with:
 *   z   = zoom level
 *   ll  = longitude,latitude  (comma URL-encoded as %2C)
 *   spn = longitude,latitude  (alternative key used by ymaps3 API)
 *
 * Also handles:
 *   - plain query params (?ll=...&z=... for yandex.ru/maps/)
 *   - OSM-style hash (#zoom/lat/lon)
 *   - hash without hashbang (#ll=...&z=...)
 */
export const parseYandexUrl = (url: string): Viewport | null => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  // ── 1. Plain query string (?ll=...&z=... or ?spn=...&z=...) ─────────────
  const vp1 = parseFromSearchParams(parsed.searchParams)
  if (vp1) return vp1

  // ── 2. Hash fragment ─────────────────────────────────────────────────────
  const rawHash = parsed.hash.startsWith("#")
    ? parsed.hash.slice(1)
    : parsed.hash

  if (!rawHash) return null

  // Normalise hashbang prefix: "!/", "#!/", "#!/?" → strip down to the
  // query string.  Yandex NK uses the pattern  #!/?key=val&key=val
  let hashContent = rawHash
  if (hashContent.startsWith("!")) {
    const qPos = hashContent.indexOf("?")
    if (qPos !== -1) {
      // #!/?z=15&ll=...  →  z=15&ll=...
      hashContent = hashContent.slice(qPos + 1)
    } else {
      // !/z=15&ll=... or similar — strip leading "!/"
      hashContent = hashContent.replace(/^!\/?/, "")
    }
  }

  // Try as query params (z=...&ll=... or z=...&spn=...)
  const hp = new URLSearchParams(hashContent)
  const vp2 = parseFromSearchParams(hp)
  if (vp2) return vp2

  // Try OSM-style: ZOOM/LAT/LON (no hashbang prefix, no key=val)
  const slashMatch = hashContent.match(
    /^(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/
  )
  if (slashMatch) {
    return makeViewport(
      parseFloat(slashMatch[2]), // lat
      parseFloat(slashMatch[3]), // lon
      parseFloat(slashMatch[1])  // zoom
    )
  }

  return null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseFromSearchParams = (
  params: URLSearchParams
): Viewport | null => {
  const zRaw = params.get("z") ?? params.get("zoom")
  if (!zRaw) return null
  const z = parseFloat(zRaw)

  // Try ll=LON,LAT and spn=LON,LAT
  for (const key of ["ll", "spn"]) {
    const val = params.get(key)
    if (!val) continue
    const parts = val.split(",")
    if (parts.length < 2) continue
    const a = parseFloat(parts[0])
    const b = parseFloat(parts[1])
    // Yandex ll/spn: longitude first, latitude second
    const vp = makeViewport(b, a, z) // lat=b, lon=a
    if (vp) return vp
  }

  // Fallback: separate lat= and lon= params
  const lat = parseFloat(params.get("lat") ?? "")
  const lon = parseFloat(params.get("lon") ?? "")
  return makeViewport(lat, lon, z)
}

const makeViewport = (
  lat: number,
  lon: number,
  z: number
): Viewport | null => {
  if (!isFinite(lat) || !isFinite(lon) || !isFinite(z)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon, z }
}
