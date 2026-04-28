/* global chrome */

const master = document.getElementById("master")
const slave = document.getElementById("slave")
const divider = document.getElementById("divider")
const guard = document.getElementById("guard")
const container = document.getElementById("container")

chrome.storage.local.get("nakarteLayers", (result) => {
  const layers = result.nakarteLayers
  let url = "https://nakarte.me/"
  if (layers && typeof layers === "string") {
    url += "#l=" + layers
  }
  slave.src = url
})

let dragging = false
let startX = 0
let startMasterW = 0

const totalWidth = () => container.getBoundingClientRect().width

const setWidths = (masterW) => {
  const total = totalWidth()
  master.style.flex = `0 0 ${masterW}px`
  slave.style.flex = `0 0 ${total - masterW - 6}px`
}

divider.addEventListener("mousedown", (e) => {
  dragging = true
  startX = e.clientX
  startMasterW = master.getBoundingClientRect().width
  divider.classList.add("dragging")
  guard.classList.add("active")
  e.preventDefault()
})

document.addEventListener("mousemove", (e) => {
  if (!dragging) return
  const dx = e.clientX - startX
  const newMasterW = Math.max(120, Math.min(totalWidth() - 126, startMasterW + dx))
  setWidths(newMasterW)
})

document.addEventListener("mouseup", () => {
  if (!dragging) return
  dragging = false
  divider.classList.remove("dragging")
  guard.classList.remove("active")
})

divider.addEventListener("keydown", (e) => {
  const step = e.shiftKey ? 50 : 10
  const current = master.getBoundingClientRect().width

  if (e.key === "ArrowLeft") {
    setWidths(Math.max(120, current - step))
    e.preventDefault()
  } else if (e.key === "ArrowRight") {
    setWidths(Math.min(totalWidth() - 126, current + step))
    e.preventDefault()
  }
})
