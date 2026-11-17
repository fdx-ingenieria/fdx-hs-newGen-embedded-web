// Retakes the manual screenshots (light theme) through the Chrome DevTools protocol.
// 1. Serve the webapp with /api proxied to a device: vite on port 5299 (proxy '/api' -> http://192.168.10.1).
// 2. Start a browser: chromium --headless=new --remote-debugging-port=9334 --user-data-dir=<dir>
// 3. node capture-screenshots.mjs images [section1,section2]   sections: overview dark phone system labels rfid modbus alarms sensors installation logs
// The device needs English labels, sensors and at least one alarm firing. The Installation step pauses measuring for a few seconds.
import { writeFileSync } from 'node:fs'

const out = process.argv[2]
const sections = process.argv[3] ? process.argv[3].split(',') : null
const want = name => !sections || sections.includes(name)
const BASE = 'http://localhost:5299/#'
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1.5, mobile: false }
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }
const sleep = ms => new Promise(r => setTimeout(r, ms))

const tab = await (await fetch('http://127.0.0.1:9334/json/new?about:blank', { method: 'PUT' })).json()
const ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const pend = new Map()
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  if (m.method === 'Page.javascriptDialogOpening') cmd('Page.handleJavaScriptDialog', { accept: true })
  if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
}
const js = async expr => {
  const m = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (m.result?.exceptionDetails) console.error('JS error:', expr.slice(0, 80))
  return m.result?.result?.value
}
await cmd('Page.enable')

const viewport = async v => {
  await cmd('Emulation.setDeviceMetricsOverride', v)
  await cmd('Emulation.setTouchEmulationEnabled', { enabled: v.mobile, maxTouchPoints: v.mobile ? 5 : 0 })
}
const go = async (path, wait = 3500) => { await cmd('Page.navigate', { url: BASE + path }); await sleep(wait) }
const reload = async (wait = 5000) => { await cmd('Page.reload', { ignoreCache: true }); await sleep(wait) }
// Each helper runs in its own scope so repeated evaluations never redeclare anything.
const find = (sel, text) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.trim().startsWith(${JSON.stringify(text)}))`
const click = async (sel, text) => { if ((await js(`(() => { const e = ${find(sel, text)}; if (!e) return 0; e.click(); return 1 })()`)) !== 1) console.error('missing', sel, text) }
const adminGesture = async (sel, text) => { if ((await js(`(() => { const e = ${find(sel, text)}; if (!e) return 0; e.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, ctrlKey: true, shiftKey: true })); return 1 })()`)) !== 1) console.error('missing', sel, text) }
const scrollTo = sel => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 76) })()`)
const sidebar = open => js(`(() => { const b = document.querySelector('[aria-controls=sidebar]'); if (b && (b.getAttribute('aria-expanded') === 'true') !== ${open}) b.click() })()`)
const setTheme = async dark => { await js(`localStorage.setItem('fdx-theme', '${dark ? 'dark' : 'light'}')`); await reload() }
// Waits until every configured sensor is in service with a full window, then lets the live view catch up.
const waitClean = async (timeoutS = 240) => {
  for (let t = 0; t < timeoutS; t += 5) {
    try {
      const d = await (await fetch('http://localhost:5299/api/data/sensors')).json()
      if (d.length && d.every(s => s.quality > 0 && s.n_readings >= 3)) { await sleep(3000); return }
    } catch { /* retry */ }
    await sleep(5000)
  }
  console.error('sensors never got clean, capturing anyway')
}
const shot = async name => {
  const r = await cmd('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64'))
  console.log('saved', name)
}

await viewport(DESKTOP)
await go('/', 800)
await js(`localStorage.setItem('overview-sensor-view', 'list')`)
await setTheme(false)

if (want('overview')) {
  await waitClean()
  await go('/', 6000)
  await sidebar(true); await sleep(400); await click('button', 'Configuration'); await sleep(400)
  await shot('shell-desktop')
  await sidebar(false); await sleep(500)
  await shot('overview-desktop')
  await scrollTo('[role=tablist]'); await sleep(300); await shot('overview-list')
  await js(`document.querySelector('button[title="Map view"]')?.click()`); await sleep(1500)
  await scrollTo('[role=tablist]'); await sleep(300); await shot('overview-map')
  await click('button[role=tab]', 'Alarms'); await sleep(800)
  await scrollTo('[role=tablist]'); await sleep(300); await shot('overview-alarms')
  await js(`localStorage.setItem('overview-sensor-view', 'list')`)
}

if (want('dark')) {
  await waitClean()
  await setTheme(true); await go('/', 5000); await shot('shell-dark'); await setTheme(false)
}

if (want('system')) {
  await go('/configuration/system'); await shot('system-user')
  await adminGesture('div.card', 'System'); await sleep(800); await shot('system-admin')
  await scrollTo('div.card:nth-of-type(3)'); await sleep(300); await shot('system-admin-cards')
}

if (want('labels')) {
  await go('/configuration/labels'); await shot('labels-desktop')
  await adminGesture('p', 'Names shown for each slot'); await sleep(600); await shot('labels-presets')
}

if (want('rfid')) {
  await go('/configuration/readerConfig'); await shot('rfid-config-user')
  await adminGesture('h2', 'RFID reader'); await sleep(800); await shot('rfid-config-admin')
}

if (want('modbus')) {
  await go('/modbus'); await shot('modbus-desktop')
}

if (want('alarms')) {
  await go('/configuration/alarms'); await shot('alarms-desktop')
  await js(`document.querySelector('tbody tr')?.click()`); await sleep(1000); await shot('alarms-edit')
  await go('/configuration/alarms'); await adminGesture('h3', 'Alarms'); await sleep(600); await shot('alarms-presets')
}

if (want('sensors')) {
  // Discovery fills the unconfigured list but shortens the windows ("Not read"), so stop it and wait for a clean window.
  await go('/configuration/sensors', 300); await reload(4000)
  await click('button', 'Discovery'); await sleep(8000)
  await click('button', 'Stop discovery'); await sleep(1500)
  await waitClean()
  await shot('sensors-desktop')
  await js(`[...document.querySelectorAll('tbody')].at(-1)?.querySelector('tr')?.click()`); await sleep(1000); await shot('sensors-edit')
  await click('button', 'Cancel'); await sleep(600)
  await click('button', 'Quick setup'); await sleep(1500); await shot('sensors-quick-setup')
  await click('button', 'Cancel'); await sleep(600)
}

if (want('installation')) {
  // Starts installation mode; Stop ends it.
  await go('/configuration/installation', 12000)
  await js(`document.querySelector('button.border-l-4')?.click()`); await sleep(1500)
  await shot('installation-desktop')
  await click('button', 'Stop'); await sleep(2500)
}

if (want('logs')) {
  await go('/admin/logs', 2500); await shot('logs-desktop')
}

// Phone last: once touch is emulated the tab keeps reporting a coarse pointer.
if (want('phone')) {
  await waitClean()
  await viewport(PHONE)
  await go('/', 300); await reload(6000); await shot('phone-overview')
  await scrollTo('[role=tablist]'); await sleep(400); await shot('phone-sensors')
  await sidebar(true); await sleep(600); await shot('phone-menu'); await sidebar(false); await sleep(400)
  await go('/configuration/alarms', 300); await reload(4000)
  await shot('phone-alarms')
  await js(`document.querySelector('main ul li button')?.click()`); await sleep(1200); await shot('phone-alarm-edit')
  await viewport(DESKTOP)
}

await go('/', 1000)
ws.close()
await fetch(`http://127.0.0.1:9334/json/close/${tab.id}`)
