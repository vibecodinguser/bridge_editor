import type { BridgeMessage } from "../lib/messages"

export default defineBackground(() => {
  // ── Session ───────────────────────────────────────────────────────────────
  //
  // Only tabId is stored persistently (chrome.storage.session survives SW
  // sleep). Frame IDs are discovered on-demand via webNavigation.getAllFrames,
  // which is always up-to-date and doesn't need manual registration.

  const SESSION_KEY = "bridgeTabId"

  const getSplitTabId = async (): Promise<number | null> => {
    try {
      const r = await chrome.storage.session.get(SESSION_KEY)
      const v = r[SESSION_KEY]
      return typeof v === "number" ? v : null
    } catch {
      return null
    }
  }

  const setSplitTabId = async (tabId: number | null): Promise<void> => {
    try {
      if (tabId === null) {
        await chrome.storage.session.remove(SESSION_KEY)
      } else {
        await chrome.storage.session.set({ [SESSION_KEY]: tabId })
      }
    } catch {
      // storage.session not available (older browser) — degrade gracefully
    }
  }

  // ── In-memory frame ID cache (repopulated via webNavigation after SW wake) ──

  let cachedTabId: number | null = null
  let cachedSlaveFrameId: number | null = null

  // ── webNavigation helpers ──────────────────────────────────────────────────

  const findSlaveFrameId = async (tabId: number): Promise<number | null> => {
    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId })
      const f = frames?.find(
        (fr) =>
          fr.url.startsWith("https://nakarte.me/") ||
          fr.url.startsWith("https://www.nakarte.me/")
      )
      if (f) {
        cachedTabId = tabId
        cachedSlaveFrameId = f.frameId
        console.log("[bridge] slave frame found via webNavigation, frameId:", f.frameId)
      }
      return f?.frameId ?? null
    } catch (err) {
      console.warn("[bridge] getAllFrames failed:", err)
      return null
    }
  }

  const getSlaveFrameId = async (tabId: number): Promise<number | null> => {
    if (cachedTabId === tabId && cachedSlaveFrameId !== null) {
      return cachedSlaveFrameId
    }
    return findSlaveFrameId(tabId)
  }

  // ── Split View ────────────────────────────────────────────────────────────

  browser.action.onClicked.addListener((tab) => {
    void openSplitView(tab.id).catch((err) => {
      console.error("[bridge] split-view error:", err)
    })
  })

  const openSplitView = async (currentTabId: number | undefined) => {
    const displays = await chrome.system.display.getInfo()
    const primary =
      displays.find(
        (d: chrome.system.display.DisplayUnitInfo) => d.isPrimary
      ) ?? displays[0]
    const { left, top, width, height } = primary.workArea

    const splitUrl = browser.runtime.getURL("/split.html")

    const win = await browser.windows.create({
      url: splitUrl,
      left,
      top,
      width,
      height,
      state: "normal",
      type: "normal",
    })

    if (currentTabId !== undefined) {
      try {
        await browser.tabs.remove(currentTabId)
      } catch {
        // Tab already gone
      }
    }

    const tabId = win?.tabs?.[0]?.id
    if (tabId === undefined) {
      console.warn("[bridge] could not determine split tab id")
      return
    }

    cachedTabId = null
    cachedSlaveFrameId = null
    await setSplitTabId(tabId)
    console.log("[bridge] split view opened, tabId:", tabId)
  }

  // ── webNavigation: invalidate cache when nakarte frame navigates ──────────

  chrome.webNavigation.onCommitted.addListener((details) => {
    if (
      details.tabId === cachedTabId &&
      details.frameId === cachedSlaveFrameId
    ) {
      cachedSlaveFrameId = null
      console.log("[bridge] slave frame navigated — cache invalidated")
    }
  })

  // ── Message handler ───────────────────────────────────────────────────────

  browser.runtime.onMessage.addListener(
    (rawMsg: unknown, sender: chrome.runtime.MessageSender) => {
      handleMessage(rawMsg as BridgeMessage, sender).catch(console.error)
      return false
    }
  )

  const handleMessage = async (
    msg: BridgeMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<void> => {
    // ── Layer persistence (from nakarte slave, any tab) ────────────────────
    if (msg.type === "nakarteLayersChanged") {
      await browser.storage.local.set({ nakarteLayers: msg.layers })
      return
    }

    // ── frameRegister: just log, we no longer rely on it for routing ───────
    if (msg.type === "frameRegister") {
      console.log(
        `[bridge] frame registered role=${msg.role}`,
        `tab=${sender.tab?.id} frame=${sender.frameId}`
      )
      return
    }

    // ── Route viewport / cursor master → slave ─────────────────────────────
    if (
      msg.type !== "viewport" &&
      msg.type !== "cursorGeo" &&
      msg.type !== "cursorLeave"
    )
      return

    // Verify sender is from n.maps.yandex.ru
    if (!sender.url?.includes("n.maps.yandex.ru")) return

    const splitTabId = await getSplitTabId()
    if (splitTabId === null) {
      console.warn("[bridge] no split tab registered")
      return
    }

    // Sender tab must be the split tab
    if (sender.tab?.id !== splitTabId) return

    // Find slave frame (from cache or via webNavigation)
    let slaveFrameId = await getSlaveFrameId(splitTabId)

    if (slaveFrameId === null) {
      console.warn("[bridge] slave frame not found, dropping:", msg.type)
      return
    }

    try {
      await browser.tabs.sendMessage(splitTabId, msg, {
        frameId: slaveFrameId,
      })
    } catch {
      // Frame might have been refreshed — invalidate cache and retry once
      cachedSlaveFrameId = null
      slaveFrameId = await findSlaveFrameId(splitTabId)
      if (slaveFrameId !== null) {
        browser.tabs
          .sendMessage(splitTabId, msg, { frameId: slaveFrameId })
          .catch(() => {})
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  browser.tabs.onRemoved.addListener((tabId) => {
    void (async () => {
      const splitTabId = await getSplitTabId()
      if (splitTabId === tabId) {
        await setSplitTabId(null)
        cachedTabId = null
        cachedSlaveFrameId = null
        console.log("[bridge] session cleared")
      }
    })()
  })
})
