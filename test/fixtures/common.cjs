'use strict'

const { strict: assert } = require('assert')
const http = require('http')
const path = require('path')
const { createRequire } = require('module')
const { pathToFileURL } = require('url')
const consumerPath = path.resolve('tmp/current/package.json')
const consumer = createRequire(consumerPath)
const serve = consumer('koa-static')
const Koa = consumer('koa')
const root = __dirname

async function main() {
  const entry = path.resolve('tmp/current/esm.mjs')
  const url = pathToFileURL(entry)
  const imported = await import(url.href)
  assert.notEqual(imported.default, serve)
  assert.equal(consumer('koa-static/index'), serve)
  const legacy = await import(consumer.resolve('koa-static/index'))
  assert.equal(legacy.default, serve)
  assert.equal(consumer('koa-static/index.js'), serve)
  assert.equal(consumer('koa-static/package.json').name, 'koa-static')
  await checkMiddleware(serve, 'CommonJS')
  await checkMiddleware(imported.default, 'ESM')
}

async function checkMiddleware(serve, format) {
  assert.equal(typeof serve, 'function')
  assert.throws(() => serve(), /root directory is required/)
  await checkServing(serve, false)
  await checkServing(serve, true)
  await checkDownstream(serve, false)
  await checkDownstream(serve, true)
  process.stdout.write(`${format} compatibility passed on ${process.version}\n`)
}

async function checkServing(serve, defer) {
  const app = new Koa()
  const options = { defer }
  app.use(serve(root, options))
  const server = app.listen(0, '127.0.0.1')
  try {
    const file = await request(server, '/hello.txt')
    assert.equal(file.statusCode, 200)
    assert.equal(file.body, 'world')
    const head = await request(server, '/hello.txt', 'HEAD')
    assert.equal(head.statusCode, 200)
    assert.equal(head.body, '')
    const missing = await request(server, '/missing')
    assert.equal(missing.statusCode, 404)
    const post = await request(server, '/hello.txt', 'POST')
    assert.equal(post.statusCode, 404)
  } finally {
    await close(server)
  }
}

async function checkDownstream(serve, defer) {
  const app = new Koa()
  const options = { defer }
  app.use(serve(root, options))
  app.use((ctx) => {
    ctx.body = 'fallback'
  })
  const server = app.listen(0, '127.0.0.1')
  try {
    const response = await request(server, '/missing')
    assert.equal(response.statusCode, 200)
    assert.equal(response.body, 'fallback')
    const file = await request(server, '/hello.txt')
    let expected = 'world'
    if (defer) expected = 'fallback'
    assert.equal(file.statusCode, 200)
    assert.equal(file.body, expected)
  } finally {
    await close(server)
  }
}

async function request(server, pathname, method = 'GET') {
  if (!server.listening) await new Promise((resolve) => server.once('listening', resolve))
  const port = server.address().port
  const options = { hostname: '127.0.0.1', port, path: pathname, method, agent: false }
  const response = new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('error', reject)
      res.on('end', () => {
        const { statusCode } = res
        const response = { statusCode, body }
        resolve(response)
      })
    })
    req.on('error', reject)
    req.end()
  })
  return response
}

function close(server) {
  const closed = new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
  return closed
}

main().catch((err) => {
  process.stderr.write(`${err.stack}\n`)
  process.exitCode = 1
})
