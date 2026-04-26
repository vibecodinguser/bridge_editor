import type { Viewport } from "../lib/messages"
import { parseYandexUrl } from "../lib/yandex-url"
import { pixelOffsetToGeo } from "../lib/geo-pixel"
import { throttle } from "../lib/throttle"

export default defineContentScript({
  matches: ["https://n.maps.yandex.ru/*"],
  allFrames: true,
  // document_start: patch history.pushState/replaceState before Yandex's own
  // scripts install their router, so we never miss a URL update.
  runAt: "document_start",
  main() {
    console.log("[bridge-yandex] content script loaded, url:", location.href)

    let lastViewport: Viewport | null = null
    let lastHref = ""

    // ── URL change → viewport message ───────────────────────────────────────

    const sendViewport = () => {
      const href = location.href
      const vp = parseYandexUrl(href)

      // Always log so the user can see in DevTools what's happening
      if (href !== lastHref) {
        lastHref = href
        console.log(
          "[bridge-yandex] URL changed:",
          href,
          "→ parsed:",
          vp ? JSON.stringify(vp) : "null (no coords found)"
        )
      }

      if (!vp) return

      // Skip if nothing actually changed
      if (
        lastViewport &&
        lastViewport.lat === vp.lat &&
        lastViewport.lon === vp.lon &&
        lastViewport.z === vp.z
      )
        return

      lastViewport = vp
      chrome.runtime
        .sendMessage({ type: "viewport", payload: vp })
        .catch(() => {})
    }

    // Patch history API at document_start, before Yandex installs its router
    const patchHistory = () => {
      const wrap =
        (original: typeof history.pushState) =>
        (...args: Parameters<typeof history.pushState>) => {
          original(...args)
          sendViewport()
        }
      history.pushState = wrap(history.pushState.bind(history))
      history.replaceState = wrap(history.replaceState.bind(history))
    }
    patchHistory()

    window.addEventListener("popstate", sendViewport)
    window.addEventListener("hashchange", sendViewport)

    // Polling fallback every 300 ms — catches direct hash mutations and any
    // navigation mechanism that bypasses the history API.
    setInterval(sendViewport, 300)

    // Initial read once the page is interactive
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", sendViewport)
    } else {
      sendViewport()
    }

    // Register (informational — background no longer requires this for routing)
    chrome.runtime
      .sendMessage({ type: "frameRegister", role: "master" })
      .catch(() => {})

    // ── Mouse → cursor geo ──────────────────────────────────────────────────

    const sendCursor = throttle((e: MouseEvent) => {
      if (!lastViewport) return

      const dx = e.clientX - window.innerWidth / 2
      const dy = e.clientY - window.innerHeight / 2

      const geo = pixelOffsetToGeo(
        lastViewport.lat,
        lastViewport.lon,
        lastViewport.z,
        { dx, dy }
      )

      chrome.runtime
        .sendMessage({ type: "cursorGeo", payload: geo })
        .catch(() => {})
    }, 20)

    window.addEventListener("mousemove", sendCursor, { passive: true })
    window.addEventListener(
      "mouseleave",
      () => {
        void chrome.runtime
          .sendMessage({ type: "cursorLeave" })
          .catch(() => {})
      },
      { passive: true }
    )
  },
})
