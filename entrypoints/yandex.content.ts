import type { Viewport } from "../lib/messages"
import { parseYandexUrl } from "../lib/yandex-url"
import { pixelOffsetToGeo } from "../lib/geo-pixel"
import { throttle } from "../lib/throttle"

export default defineContentScript({
  matches: ["https://n.maps.yandex.ru/*"],
  allFrames: true,
  runAt: "document_start",
  main() {
    let lastViewport: Viewport | null = null
    let lastHref = ""

    const sendViewport = () => {
      const href = location.href
      const vp = parseYandexUrl(href)

      if (href !== lastHref) {
        lastHref = href
      }

      if (!vp) return

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

    setInterval(sendViewport, 300)

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", sendViewport)
    } else {
      sendViewport()
    }

    chrome.runtime
      .sendMessage({ type: "frameRegister", role: "master" })
      .catch(() => {})

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
