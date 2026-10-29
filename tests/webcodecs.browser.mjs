// Requires a running Vite server and headless Chrome with --remote-debugging-port.
// APP_URL=http://127.0.0.1:5178 CDP_URL=http://127.0.0.1:9230 node tests/webcodecs.browser.mjs
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const app = process.env.APP_URL ?? 'http://127.0.0.1:5178'
const tabs = await (await fetch(`${process.env.CDP_URL ?? 'http://127.0.0.1:9230'}/json`)).json()
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
const errors = []
let instrumentation
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
  if (!message.id) return
  const request = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) request.reject(message.error)
  else request.resolve(message.result)
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const key = ++id
  pending.set(key, { resolve, reject })
  ws.send(JSON.stringify({ id: key, method, params }))
})
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const settle = () => evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
async function check(expression, label) {
  assert.ok(await evaluate(expression), label)
  console.log(`PASS: ${label}`)
}
async function click(selector, text) {
  await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`)
  await settle()
}
async function enter() {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'char', text: '\r', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await settle()
}
async function navigate(route) {
  await send('Page.navigate', { url: `${app}/#/${route}` })
  for (let i = 0; i < 80; i++) {
    if (await evaluate(`!!document.querySelector(${JSON.stringify(route === 'webcodecs' ? '.webcodecs-page' : '.top-nav')}) && location.hash === '#/${route}'`)) break
    await pause(100)
  }
  await settle()
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.bringToFront')
  // Track only the known demo timers; avoids conflating Vite's HMR with app work.
  instrumentation = await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.demoTimers = new Set();
    for (const name of ['setInterval', 'setTimeout']) {
      const original = window[name].bind(window);
      window[name] = (callback, delay, ...args) => {
        let key;
        key = original(() => { if (name === 'setTimeout') demoTimers.delete(key); callback(...args); }, delay);
        if ([1400, 1300, 350, 60, 100].includes(delay)) demoTimers.add(key);
        return key;
      };
    }
    for (const name of ['clearInterval', 'clearTimeout']) {
      const original = window[name].bind(window);
      window[name] = key => { demoTimers.delete(key); original(key); };
    }
  ` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  // Ensure instrumentation installs even when the existing tab has this route open.
  await send('Page.navigate', { url: 'about:blank' })
  await pause(100)
  await navigate('webcodecs')
  await check('document.querySelectorAll(".webcodecs-page > section").length === 4', 'four major sections')
  await check('document.querySelectorAll(".webcodecs-api-index .webcodecs-api-card").length === 34', 'all 34 browser APIs')
  await check('document.querySelectorAll(".webcodecs-capability").length === 9', 'nine capabilities')
  await check('document.querySelectorAll("[id$=heading]").length === new Set(Array.from(document.querySelectorAll("[id$=heading]"), e => e.id)).size', 'unique heading destinations')
  const targets = ['capabilities', 'api-index', 'mediabunny-guide', 'api-pipelines', 'architecture']
  for (let i = 0; i < targets.length; i++) {
    await evaluate(`document.querySelectorAll('.webcodecs-section-nav button')[${i}].focus()`)
    await enter()
    await check(`document.activeElement.id === '${targets[i]}-heading' && document.activeElement.getBoundingClientRect().top >= document.querySelector('.top-nav').getBoundingClientRect().bottom`, `keyboard navigation/focus: ${targets[i]}`)
  }
  for (const [index, count] of [34, 6, 5, 5, 4, 7, 5, 2].entries()) {
    await evaluate(`document.querySelectorAll('.webcodecs-api-filters button')[${index}].focus()`)
    await enter()
    await check(`document.querySelectorAll('.webcodecs-api-index .webcodecs-api-card').length === ${count}`, `API category ${index}`)
  }
  await click('.webcodecs-api-filters button', 'All APIs (34)')
  await evaluate('document.getElementById("webcodecs-api-search").focus()')
  await send('Input.insertText', { text: 'no-such-api' })
  await settle()
  await check('!!document.querySelector(".webcodecs-api-empty")', 'search empty state')
  await click('.webcodecs-api-empty button', 'Clear search and filters')
  await evaluate('document.querySelector(".webcodecs-api-card summary").focus()')
  await enter()
  await check('document.querySelector(".webcodecs-api-card").open', 'keyboard disclosure')

  await click('.webcodecs-cache-demo button', 'Read range')
  await check('document.querySelector(".webcodecs-cache-demo [role=status]").textContent.includes("Cache miss")', 'cache read waits for missing bytes')
  await click('.webcodecs-cache-demo button', 'Dispose input')
  await click('.webcodecs-cache-demo button', 'New input, reuse cache')
  await click('.webcodecs-cache-demo button', 'Read range')
  await click('.webcodecs-cache-demo button', 'Complete miss')
  await click('.webcodecs-cache-demo button', 'Read range')
  await check('document.querySelector(".webcodecs-cache-demo [role=status]").textContent.includes("Cache hit")', 'new source reuses completed cache')
  for (const strategy of ['scheduled', 'worklet']) {
    await evaluate(`(() => { const select = document.querySelector('.webcodecs-audio-settings select'); select.value = '${strategy}'; select.dispatchEvent(new Event('change', {bubbles:true})); })()`)
    await settle()
    for (let step = 0; step < 13; step++) await click('.webcodecs-audio-demo button', 'Next')
    await check('document.querySelector(".webcodecs-audio-demo [role=status]").textContent.includes("Event 14 /")', `complete audio path: ${strategy}`)
    await click('.webcodecs-audio-demo button', 'Previous')
    await check('document.querySelector(".webcodecs-audio-demo [role=status]").textContent.includes("Event 13 /")', 'backward snapshot')
    await click('.webcodecs-audio-demo button', 'Reset')
  }
  for (const label of ['Browser', 'Mediabunny', 'Application']) {
    await evaluate(`Array.from(document.querySelectorAll('[aria-label="Highlight architecture ownership"] button')).find(b => b.textContent === '${label}').focus()`)
    await enter()
    await check(`Array.from(document.querySelectorAll('[aria-label="Highlight architecture ownership"] button')).find(b => b.textContent === '${label}').getAttribute('aria-pressed') === 'true'`, `keyboard ownership toggle: ${label}`)
  }
  const nodeCount = await evaluate('document.querySelectorAll(".webcodecs-architecture-owner button").length')
  assert.equal(nodeCount, 14)
  for (let index = 0; index < nodeCount; index++) {
    const label = await evaluate(`document.querySelectorAll('.webcodecs-architecture-owner button')[${index}].textContent`)
    await evaluate(`document.querySelectorAll('.webcodecs-architecture-owner button')[${index}].focus()`)
    await enter()
    assert.ok((await evaluate('document.getElementById("preview-node-detail").textContent')).includes(label))
    await evaluate('document.querySelector("#preview-node-detail button").click()')
    await settle()
    await check('document.activeElement.tagName === "H3" || document.activeElement.id === "api-index-heading"', `node related-link focus: ${label}`)
  }

  const demos = [
    ['.webcodecs-video-demo', 'Play', 'Reset', 'Next'],
    ['.webcodecs-audio-demo', 'Play', 'Reset', 'Next'],
    ['.webcodecs-buffer-model', 'Run simulation', 'Reset model', 'Advance 0.1 s'],
    ['.webcodecs-sync-demo:not(.webcodecs-clip-demo)', 'Play sync', 'Reset sync', 'Step 20 ms'],
    ['.webcodecs-clip-demo', 'Play clips', 'Reset clips', 'Step 50 ms'],
  ]
  for (const [selector, play, reset, step] of demos) {
    await evaluate(`document.querySelector('${selector}').scrollIntoView()`)
    await settle()
    await click(`${selector} button`, reset)
    const initial = await evaluate(`document.querySelector('${selector} [role=status]').textContent`)
    await click(`${selector} button`, step)
    assert.notEqual(await evaluate(`document.querySelector('${selector} [role=status]').textContent`), initial, 'manual step changes snapshot')
    await click(`${selector} button`, reset)
    assert.equal(await evaluate(`document.querySelector('${selector} [role=status]').textContent`), initial, 'repeatable reset')
    for (let repeat = 0; repeat < 2; repeat++) {
      await click(`${selector} button`, play)
      await check('demoTimers.size === 1', `one active clock: ${selector}`)
      await evaluate('window.scrollTo(0, 0)')
      await pause(150)
      await check('demoTimers.size === 0', `offscreen clock cleanup: ${selector}`)
      await evaluate(`document.querySelector('${selector}').scrollIntoView()`)
      await settle()
    }
    await click(`${selector} button`, play)
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await pause(100)
    await check(`demoTimers.size === 0 && Array.from(document.querySelectorAll('${selector} button')).find(b => b.textContent.trim() === '${play}').disabled`, `reduced motion stops autoplay: ${selector}`)
    await click(`${selector} button`, step)
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    await pause(100)
    await click(`${selector} button`, play)
    await navigate('codecs')
    await check('demoTimers.size === 0', `navigation removes clock: ${selector}`)
    await navigate('webcodecs')
    assert.equal(await evaluate(`document.querySelector('${selector} [role=status]').textContent`), initial, 'remount restores snapshot')
  }
  // Expand every reference/example and inspect the entire page, including horizontally
  // scrollable snippets/tables whose contents intentionally exceed their own viewport.
  await evaluate('document.querySelectorAll(".webcodecs-page details").forEach(e => e.open = true)')
  for (const width of [1440, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
    await settle()
    const overflow = await evaluate(`Array.from(document.querySelectorAll('.webcodecs-page *')).filter(e => e.checkVisibility() && !e.closest('pre, table') && (e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 || e.getBoundingClientRect().left < -1)).map(e => e.tagName + '.' + e.className)`)
    assert.deepEqual(overflow, [], `page elements fit ${width}px`)
    await check('document.documentElement.scrollWidth <= document.documentElement.clientWidth', `document fits ${width}px including scrollbar`)
    for (const target of ['capabilities', 'api-index', 'video-pipeline', 'audio-pipeline', 'buffer-model', 'av-sync', 'clip-transition', 'architecture']) {
      await evaluate(`document.getElementById('${target}-heading').scrollIntoView()`)
      await evaluate("window.scrollBy(0, -document.querySelector('.top-nav').getBoundingClientRect().height - 20)")
      await settle()
      await writeFile(`/tmp/webcodecs-review-${target}-${width}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
    }
  }
  assert.deepEqual(errors, [], 'no uncaught browser exceptions')
  console.log('Full-page browser acceptance checks passed; screenshots: /tmp/webcodecs-review-*.png')
} finally {
  if (instrumentation) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: instrumentation.identifier })
  ws.close()
}
