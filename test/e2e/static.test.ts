import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import request from 'supertest'
import type Koa from 'koa'
import type { KoaStaticOptions } from '../../src/types'

interface Consumer {
  serve: typeof import('../../dist/cjs/index.cjs')
  Koa: typeof Koa
  version: string
  entry: string
}

interface Scenario {
  name: string
  url: string
  method?: 'get' | 'head' | 'post'
  options?: KoaStaticOptions
  downstream?: boolean
}

const root = path.resolve('test/fixtures')
const selectedHeaders = [
  'content-type',
  'content-length',
  'cache-control',
  'content-encoding',
  'location',
  'vary',
  'last-modified'
]
const customIndex = { index: 'index.txt' }
const disabledIndex: KoaStaticOptions = { index: false }
const emptyIndex = { index: '' }
const noFormat = { format: false }
const format = { format: true }
const extensions = ['txt']
const extended = { extensions }
const maxage = { maxage: 60000 }
const maxAge = { maxAge: 60000 }
const immutable = { immutable: true }
const scenarios: Scenario[] = [
  { name: 'file', url: '/hello.txt' },
  { name: 'HEAD', url: '/hello.txt', method: 'head' },
  { name: 'missing', url: '/missing' },
  { name: 'POST', url: '/hello.txt', method: 'post' },
  { name: 'default index', url: '/world/' },
  { name: 'directory without slash', url: '/world' },
  { name: 'custom index', url: '/', options: customIndex },
  { name: 'disabled index', url: '/world/', options: disabledIndex },
  { name: 'empty index', url: '/world/', options: emptyIndex },
  { name: 'format false', url: '/world', options: noFormat },
  { name: 'format false with slash', url: '/world/', options: noFormat },
  { name: 'format true', url: '/world', options: format },
  { name: 'extensions', url: '/hello', options: extended },
  { name: 'maxage', url: '/hello.txt', options: maxage },
  { name: 'maxAge alias', url: '/hello.txt', options: maxAge },
  { name: 'immutable', url: '/hello.txt', options: immutable },
  { name: 'query string', url: '/hello.txt?a=b' },
  { name: 'malformed URL', url: '/bad%%' },
  { name: 'encoded traversal', url: '/%2e%2e/package.json' },
  { name: 'file with downstream response', url: '/hello.txt', downstream: true },
  { name: 'missing with downstream response', url: '/missing', downstream: true },
  {
    name: 'disabled index with downstream',
    url: '/world/',
    options: disabledIndex,
    downstream: true
  }
]
const current = loadConsumer('tmp/current')
const latest = loadConsumer('tmp/latest')

describe(`dist vs published koa-static ${latest.version}`, function () {
  it('loads separate installations', function () {
    assert.notEqual(current.entry, latest.entry)
  })

  scenarios.forEach((scenario) => {
    compare(scenario, false)
    compare(scenario, true)
  })
})

function compare(scenario: Scenario, defer: boolean) {
  it(`${scenario.name}, defer: ${defer}`, async function () {
    const actual = await response(current, scenario, defer)
    const expected = await response(latest, scenario, defer)
    assert.deepEqual(actual, expected)
  })
}

function loadConsumer(directory: string): Consumer {
  const load = createRequire(path.resolve(directory, 'package.json'))
  const serve: Consumer['serve'] = load('koa-static')
  const Koa: Consumer['Koa'] = load('koa')
  const { version } = load('koa-static/package.json')
  const entry = load.resolve('koa-static')
  assert.equal(typeof serve, 'function')
  const consumer = { serve, Koa, version, entry }
  return consumer
}

async function response(consumer: Consumer, scenario: Scenario, defer: boolean) {
  const app = new consumer.Koa()
  app.silent = true
  const options = { ...scenario.options, defer }
  app.use(consumer.serve(root, options))
  if (scenario.downstream)
    app.use((ctx) => {
      ctx.body = 'fallback'
    })
  const method = scenario.method || 'get'
  const res = await request(app.callback())[method](scenario.url)
  const headers = responseHeaders(res.headers)
  const { statusCode } = res
  const body = res.text || ''
  const result = { statusCode, body, headers }
  return result
}

function responseHeaders(headers: Record<string, string | string[] | undefined>) {
  const entries = selectedHeaders.map((name) => {
    const value = headers[name] || null
    const entry = [name, value]
    return entry
  })
  const selected = Object.fromEntries(entries)
  return selected
}
