import type { BridgeMessage } from "../lib/messages"

export default defineBackground(() => {
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
      void 0
    }
  }

  let cachedTabId: number | null = null
  let cachedSlaveFrameId: number | null = null

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
      }
      return f?.frameId ?? null
    } catch {
      return null
    }
  }

  const getSlaveFrameId = async (tabId: number): Promise<number | null> => {
    if (cachedTabId === tabId && cachedSlaveFrameId !== null) {
      return cachedSlaveFrameId
    }
    return findSlaveFrameId(tabId)
  }

  browser.action.onClicked.addListener((tab) => {
    void openSplitView(tab.id).catch(console.error)
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
      void 0
    }
    }

    const tabId = win?.tabs?.[0]?.id
    if (tabId === undefined) return

    cachedTabId = null
    cachedSlaveFrameId = null
    await setSplitTabId(tabId)
  }

  chrome.webNavigation.onCommitted.addListener((details) => {
    if (
      details.tabId === cachedTabId &&
      details.frameId === cachedSlaveFrameId
    ) {
      cachedSlaveFrameId = null
    }
  })

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
    if (msg.type === "nakarteLayersChanged") {
      await browser.storage.local.set({ nakarteLayers: msg.layers })
      return
    }

    if (msg.type === "frameRegister") return

    if (
      msg.type !== "viewport" &&
      msg.type !== "cursorGeo" &&
      msg.type !== "cursorLeave"
    )
      return

    if (!sender.url?.includes("n.maps.yandex.ru")) return

    const splitTabId = await getSplitTabId()
    if (splitTabId === null) return

    if (sender.tab?.id !== splitTabId) return

    let slaveFrameId = await getSlaveFrameId(splitTabId)

    if (slaveFrameId === null) return

    try {
      await browser.tabs.sendMessage(splitTabId, msg, {
        frameId: slaveFrameId,
      })
    } catch {
      cachedSlaveFrameId = null
      slaveFrameId = await findSlaveFrameId(splitTabId)
      if (slaveFrameId !== null) {
        browser.tabs
          .sendMessage(splitTabId, msg, { frameId: slaveFrameId })
          .catch(() => {})
      }
    }
  }

  browser.tabs.onRemoved.addListener((tabId) => {
    void (async () => {
      const splitTabId = await getSplitTabId()
      if (splitTabId === tabId) {
        await setSplitTabId(null)
        cachedTabId = null
        cachedSlaveFrameId = null
      }
    })()
  })
})
