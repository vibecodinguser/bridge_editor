import type { BridgeMessage, Viewport } from "../lib/messages"
import {
  mergeNakarteViewport,
  extractNakarteLayers,
} from "../lib/nakarte-url"
import { geoToPixelOffset } from "../lib/geo-pixel"

export default defineContentScript({
  matches: ["https://nakarte.me/*", "https://www.nakarte.me/*"],
  allFrames: true,
  runAt: "document_idle",
  main() {
    let currentViewport: Viewport | null = null

    // ── Frame registration ──────────────────────────────────────────────────

    const register = () =>
      chrome.runtime.sendMessage({ type: "frameRegister", role: "slave" }).catch(() => {})

    void register()
    // Re-register once the page finishes loading (covers the SW-restart case)
    if (document.readyState !== "complete") {
      window.addEventListener("load", () => {
        void register()
      })
    }

    // ── Viewport sync ───────────────────────────────────────────────────────

    const applyViewport = (vp: Viewport) => {
      currentViewport = vp
      const oldUrl = location.href
      const newUrl = mergeNakarteViewport(oldUrl, vp)

      if (newUrl === oldUrl) {
        updateOverlay()
        return
      }

      // replaceState changes location.href but does NOT fire hashchange natively.
      // We fire it manually with the correct oldURL/newURL so nakarte's internal
      // listener can read both event properties and window.location.hash.
      history.replaceState(null, "", newUrl)
      window.dispatchEvent(
        new HashChangeEvent("hashchange", {
          oldURL: oldUrl,
          newURL: newUrl,
          bubbles: true,
        })
      )

      console.debug("[bridge-nakarte] viewport applied:", vp)
      updateOverlay()
    }

    // ── Layer persistence ───────────────────────────────────────────────────

    const persistLayers = () => {
      const layers = extractNakarteLayers(location.href)
      if (layers) {
        chrome.runtime.sendMessage({ type: "nakarteLayersChanged", layers }).catch(() => {})
      }
    }

    // Listen for hash changes that nakarte itself makes (layer toggles, etc.)
    // Use a native listener BEFORE we wrap history, so we don't double-fire.
    window.addEventListener("hashchange", persistLayers, { passive: true })

    // Wrap history to also catch programmatic updates inside nakarte's JS.
    // We intentionally do NOT persist layers when WE call replaceState (to
    // avoid a feedback loop), so we guard with a flag.
    let applyingViewport = false

    const originalReplaceState = history.replaceState.bind(history)
    const originalPushState = history.pushState.bind(history)

    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      originalReplaceState(...args)
      if (!applyingViewport) persistLayers()
    }
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      originalPushState(...args)
      if (!applyingViewport) persistLayers()
    }

    // Persist on initial load
    persistLayers()

    // ── Cursor overlay ──────────────────────────────────────────────────────

    const overlay = createOverlay()

    const updateOverlay = () => {
      if (!currentViewport || !overlay.dataset.active) return
      const geoRaw = overlay.dataset.geo
      if (!geoRaw) return
      const geo = JSON.parse(geoRaw) as { lat: number; lon: number }
      if (typeof geo.lat !== "number" || typeof geo.lon !== "number") return

      const { dx, dy } = geoToPixelOffset(
        currentViewport.lat,
        currentViewport.lon,
        currentViewport.z,
        geo.lat,
        geo.lon
      )

      overlay.style.left = `${window.innerWidth / 2 + dx}px`
      overlay.style.top = `${window.innerHeight / 2 + dy}px`
      overlay.style.display = "block"
    }

    // ── Message listener ────────────────────────────────────────────────────

    chrome.runtime.onMessage.addListener((rawMsg: unknown) => {
      const msg = rawMsg as BridgeMessage

      if (msg.type === "viewport") {
        applyingViewport = true
        try {
          applyViewport(msg.payload)
        } finally {
          applyingViewport = false
        }
      }

      if (msg.type === "cursorGeo") {
        overlay.dataset.active = "1"
        overlay.dataset.geo = JSON.stringify(msg.payload)
        updateOverlay()
      }

      if (msg.type === "cursorLeave") {
        overlay.dataset.active = ""
        overlay.style.display = "none"
      }
    })
  },
})

// ── Overlay factory ─────────────────────────────────────────────────────────

const createOverlay = (): HTMLElement => {
  const el = document.createElement("div")
  el.id = "bridge-editor-cursor"
  el.setAttribute("aria-hidden", "true")
  el.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:20px",
    "height:20px",
    "transform:translate(-50%,-50%)",
    "pointer-events:none",
    "z-index:999999",
    "display:none",
  ].join(";")

  const arm = (horizontal: boolean): HTMLElement => {
    const d = document.createElement("div")
    d.style.cssText = horizontal
      ? "position:absolute;top:50%;left:0;width:100%;height:2px;margin-top:-1px;background:rgba(255,60,0,0.85)"
      : "position:absolute;left:50%;top:0;height:100%;width:2px;margin-left:-1px;background:rgba(255,60,0,0.85)"
    return d
  }

  el.appendChild(arm(true))
  el.appendChild(arm(false))
  document.body.appendChild(el)

  return el
}
