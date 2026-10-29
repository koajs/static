import type { KoaStaticOptions } from '../../src/types'
import { describe, it } from 'node:test'
import request from 'supertest'
import assert from 'node:assert/strict'
import serveCjs from '../../dist/cjs/index.cjs'
import serveEsm from '../../dist/esm/index.js'
import Koa from 'koa'

type Serve = typeof serveCjs
const builds = [
  { format: 'CommonJS', serve: serveCjs },
  { format: 'ESM', serve: serveEsm }
]

builds.forEach(({ format, serve }) => {
  describe(format, function () {
    cwdTest(serve)
    ;[false, true].forEach((defer) => {
      describe(`serve(root), defer: ${defer}`, function () {
        fileTests(serve, defer)
        indexTests(serve, defer)
        formatTests(serve, defer)
        fallthroughTests(serve, defer)
        errorTests(serve, defer)
        responseTests(serve, defer)
      })
    })
  })
})

function cwdTest(serve: Serve) {
  it('serves from cwd', async function () {
    const app = new Koa()
    app.use(serve('.'))
    await request(app.callback()).get('/package.json').expect(200)
  })
}

function createApp(serve: Serve, defer: boolean, options: KoaStaticOptions = {}) {
  const app = new Koa()
  const settings = { ...options, defer }
  app.use(serve('test/fixtures', settings))
  return app
}

function fileTests(serve: Serve, defer: boolean) {
  it('serves the file', async function () {
    const app = createApp(serve, defer)
    await request(app.callback()).get('/hello.txt').expect(200).expect('world')
  })
  it('serves HEAD without a response body', async function () {
    const app = createApp(serve, defer)
    const res = await request(app.callback()).head('/hello.txt').expect(200)
    assert.equal(res.text, undefined)
    assert.equal(res.headers['content-length'], '5')
  })
  it('returns 404 for a missing file', async function () {
    const app = createApp(serve, defer)
    await request(app.callback()).get('/something').expect(404)
  })
  it('does not serve POST requests', async function () {
    const app = createApp(serve, defer)
    await request(app.callback()).post('/hello.txt').expect(404)
  })
  it('propagates malformed path errors', async function () {
    const app = createApp(serve, defer)
    await request(app.callback()).get('/something%%%/').expect(400)
  })
}

function indexTests(serve: Serve, defer: boolean) {
  it('defaults an empty index to index.html', async function () {
    const options = { index: '' }
    const app = createApp(serve, defer, options)
    await request(app.callback()).get('/world/').expect(200).expect('html index')
  })
  it('uses the configured index file', async function () {
    const options = { index: 'index.txt' }
    const app = createApp(serve, defer, options)
    await request(app.callback())
      .get('/')
      .expect(200)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('text index')
  })
  it('defaults to index.html', async function () {
    const app = createApp(serve, defer)
    await request(app.callback())
      .get('/world/')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect('html index')
  })
  it('allows index files to be disabled', async function () {
    const options: KoaStaticOptions = { index: false }
    const app = createApp(serve, defer, options)
    await request(app.callback()).get('/world/').expect(404)
  })
}

function formatTests(serve: Serve, defer: boolean) {
  it('does not format directories when format is false', async function () {
    const options = { format: false }
    const app = createApp(serve, defer, options)
    await request(app.callback()).get('/world').expect(404)
    await request(app.callback()).get('/world/').expect(200)
  })
  it('formats directories when format is true', async function () {
    const options = { format: true }
    const app = createApp(serve, defer, options)
    await request(app.callback()).get('/world').expect(200)
    await request(app.callback()).get('/world/').expect(200)
  })
  it('passes extensions through to the sender', async function () {
    const extensions = ['txt']
    const options = { extensions }
    const app = createApp(serve, defer, options)
    await request(app.callback()).get('/hello').expect(200).expect('world')
  })
}

function fallthroughTests(serve: Serve, defer: boolean) {
  it('falls through to downstream middleware on 404', async function () {
    const options: KoaStaticOptions = { index: false }
    const app = createApp(serve, defer, options)
    app.use((ctx) => {
      ctx.body = 'fallback'
    })
    await request(app.callback()).get('/world/').expect(200).expect('fallback')
  })
  it('does not throw 404 errors to upstream middleware', async function () {
    const app = new Koa()
    let caught: unknown = null
    app.use(async (_ctx, next) => {
      try {
        await next()
      } catch (err) {
        caught = err
      }
    })
    const options = { defer }
    app.use(serve('test/fixtures', options))
    await request(app.callback()).get('/missing').expect(404)
    assert.equal(caught, null)
  })
}

function errorTests(serve: Serve, defer: boolean) {
  it('propagates non-Error values thrown by setHeaders', async function () {
    const app = new Koa()
    const failure = 'header failure'
    let caught: unknown
    app.use(async (_ctx, next) => {
      try {
        await next()
      } catch (err) {
        caught = err
      }
    })
    const options: KoaStaticOptions = {
      defer,
      setHeaders() {
        throw failure
      }
    }
    app.use(serve('test/fixtures', options))
    await request(app.callback()).get('/hello.txt').expect(404)
    assert.equal(caught, failure)
  })
}

function responseTests(serve: Serve, defer: boolean) {
  it('respects middleware ordering', async function () {
    const app = createApp(serve, defer)
    app.use(async (ctx, next) => {
      await next()
      ctx.body = 'downstream'
    })
    const res = await request(app.callback()).get('/hello.txt').expect(200)
    let expected = 'world'
    if (defer) expected = 'downstream'
    assert.equal(res.text, expected)
  })
  if (!defer) return
  it('preserves a downstream 204 response', async function () {
    const app = createApp(serve, defer)
    app.use((ctx) => {
      ctx.status = 204
    })
    await request(app.callback()).get('/something%%%/').expect(204)
  })
  it('preserves an empty downstream body', async function () {
    const app = createApp(serve, defer)
    app.use((ctx) => {
      ctx.body = ''
    })
    await request(app.callback()).get('/something%%%/').expect(200).expect('')
  })
}
