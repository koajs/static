import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import serve from '../../dist/cjs/index.cjs'
import type { KoaStaticOptions } from '../../src/types'

describe('index', function () {
  it('exports a callable middleware factory', function () {
    assert.equal(typeof serve, 'function')
    const middleware = serve('.')
    assert.equal(typeof middleware, 'function')
  })

  it('requires a root directory', function () {
    assert.throws(() => serve(''), /root directory is required/)
  })

  it('does not mutate supplied options', function () {
    const options: KoaStaticOptions = {}
    serve('.', options)
    assert.deepEqual(options, {})
  })

  it('accepts frozen options', function () {
    const options = Object.freeze({})
    const middleware = serve('.', options)
    assert.equal(typeof middleware, 'function')
  })
})
