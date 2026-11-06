'use strict'

const fs = require('fs')
const path = require('path')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      out[key] = next
      i += 1
    } else {
      out[key] = 'true'
    }
  }
  return out
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const PORT = process.env.CDP_PORT || '9222'

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = args.url || 'http://127.0.0.1:5180/'
  const out = args.out || 'screenshots/shot.png'
  const width = Number(args.width || 1600)
  const height = Number(args.height || 900)
  const mobile = args.mobile === 'true'
  const wait = Number(args.wait || 1800)

  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  let page = targets.find((item) => item.type === 'page')
  if (!page) {
    page = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
    ).json()
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', () => reject(new Error('CDP websocket failed')), { once: true })
  })

  let id = 0
  const pending = new Map()
  const logs = []

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString())
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(JSON.stringify(message.error)))
      else resolve(message.result)
      return
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const text = (message.params.args || [])
        .map((arg) => (arg.value !== undefined ? arg.value : arg.description))
        .join(' ')
      logs.push(`[console.${message.params.type}] ${text}`)
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params.exceptionDetails
      logs.push(
        '[exception] ' +
          (detail.exception?.description || detail.text || 'unknown exception'),
      )
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      logs.push(`[network] ${message.params.entry.text} ${message.params.entry.url || ''}`)
    }
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id
      const timer = setTimeout(() => {
        pending.delete(messageId)
        reject(new Error(`CDP timeout: ${method}`))
      }, 30000)
      pending.set(messageId, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
      ws.send(JSON.stringify({ id: messageId, method, params }))
    })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  })

  const loaded = new Promise((resolve) => {
    const handler = (event) => {
      const message = JSON.parse(event.data)
      if (message.method === 'Page.loadEventFired') {
        ws.removeEventListener('message', handler)
        resolve()
      }
    }
    ws.addEventListener('message', handler)
  })

  await send('Page.navigate', { url })
  await Promise.race([loaded, sleep(10000)])
  await sleep(wait)

  if (args.eval || args['eval-file']) {
    try {
      const expression = args['eval-file']
        ? fs.readFileSync(args['eval-file'], 'utf8')
        : args.eval
      const result = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      if (result.exceptionDetails) {
        logs.push(
          '[eval-exception] ' +
            (result.exceptionDetails.exception?.description ||
              result.exceptionDetails.text ||
              'unknown'),
        )
      }
      logs.push('[eval] ' + JSON.stringify(result.result?.value ?? result.result?.description))
      await sleep(Number(args.evalWait || 800))
    } catch (error) {
      logs.push('[eval-error] ' + error.message)
    }
  }

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'))

  const info = await send('Runtime.evaluate', {
    expression:
      'JSON.stringify({title: document.title, ready: document.readyState, gate: Boolean(document.querySelector(".gate-page")), auth: Boolean(document.querySelector(".auth-card")), tasks: document.querySelectorAll(".task-row").length, body: document.body.innerText.slice(0, 220)})',
    returnByValue: true,
  })

  if (logs.length) {
    console.log('--- console ---')
    console.log(logs.slice(-30).join('\n'))
  }
  console.log('INFO ' + (info.result?.value || '{}'))
  console.log('SHOT ' + out)
  ws.close()
}

main().catch((error) => {
  console.error('ERROR: ' + error.message)
  process.exit(1)
})
