/* global chrome */

const master   = document.getElementById('master')
const slave    = document.getElementById('slave')
const divider  = document.getElementById('divider')
const guard    = document.getElementById('guard')
const container = document.getElementById('container')

// ── Slave URL: inject saved nakarte layer codes ──────────────────────────────

chrome.storage.local.get('nakarteLayers', (result) => {
  const layers = result.nakarteLayers
  let url = 'https://nakarte.me/'
  if (layers && typeof layers === 'string') {
    url += '#l=' + layers
  }
  slave.src = url
})

// ── Draggable divider ────────────────────────────────────────────────────────

let dragging = false
let startX   = 0
let startMasterW = 0

const totalWidth = () => container.getBoundingClientRect().width

divider.addEventListener('mousedown', (e) => {
  dragging = true
  startX = e.clientX
  startMasterW = master.getBoundingClientRect().width
  divider.classList.add('dragging')
  guard.classList.add('active')
  e.preventDefault()
})

document.addEventListener('mousemove', (e) => {
  if (!dragging) return
  const dx       = e.clientX - startX
  const total    = totalWidth()
  const newMasterW = Math.max(120, Math.min(total - 120 - 6, startMasterW + dx))
  master.style.flex = `0 0 ${newMasterW}px`
  slave.style.flex  = `0 0 ${total - newMasterW - 6}px`
})

document.addEventListener('mouseup', () => {
  if (!dragging) return
  dragging = false
  divider.classList.remove('dragging')
  guard.classList.remove('active')
})

// Keyboard resize: left/right arrow keys
divider.addEventListener('keydown', (e) => {
  const step = e.shiftKey ? 50 : 10
  const total = totalWidth()
  const current = master.getBoundingClientRect().width

  if (e.key === 'ArrowLeft') {
    const w = Math.max(120, current - step)
    master.style.flex = `0 0 ${w}px`
    slave.style.flex  = `0 0 ${total - w - 6}px`
    e.preventDefault()
  } else if (e.key === 'ArrowRight') {
    const w = Math.min(total - 126, current + step)
    master.style.flex = `0 0 ${w}px`
    slave.style.flex  = `0 0 ${total - w - 6}px`
    e.preventDefault()
  }
})
