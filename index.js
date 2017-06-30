
'use strict'

/**
 * Module dependencies.
 */

const debug = require('debug')('koa-static')
const { resolve } = require('path')
const assert = require('assert')
const send = require('koa-send')

/**
 * Expose `serve()`.
 */

module.exports = serve

/**
 * Serve static files from `root`.
 *
 * @param {String} root
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

function serve (root, opts) {
  opts = opts || {}

  assert(root, 'root directory is required to serve files')

  // options
  debug('static "%s" %j', root, opts)
  opts.root = resolve(root)
  if (opts.index !== false) opts.index = opts.index || 'index.html'

  if (!opts.defer) {
    return async function serve (ctx, next) {
      if (ctx.method === 'HEAD' || ctx.method === 'GET') {
        try {
          await send(ctx, ctx.path, opts)
        } catch (err) {
          await next()
        }
        return
      }

      await next()
    }
  }

  return async function serve (ctx, next) {
    await next()

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return // eslint-disable-line

    try {
      await send(ctx, ctx.path, opts)
    } catch (err) {
      ctx.status = err.status || 500
    }
  }
}
