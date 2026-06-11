'use strict'

/**
 * Module dependencies.
 */

const debug = require('debug')('koa-static')
const fs = require('fs')
const path = require('path')
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

function serve (root, opts = {}) {
  assert(root, 'root directory is required to serve files')

  debug('static "%s" %j', root, opts)
  opts.root = path.resolve(root)
  opts.index = opts.index ?? 'index.html'

  if (!opts.defer) {
    return async function serve (ctx, next) {
      let done = false

      if (ctx.method === 'HEAD' || ctx.method === 'GET') {
        try {
          done = await redirectToDirectorySlash(ctx, opts) || await send(ctx, ctx.path, opts)
        } catch (err) {
          if (err.status !== 404) {
            throw err
          }
        }
      }

      if (!done) {
        await next()
      }
    }
  }

  return async function serve (ctx, next) {
    await next()

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return // eslint-disable-line

    try {
      await redirectToDirectorySlash(ctx, opts) || await send(ctx, ctx.path, opts)
    } catch (err) {
      if (err.status !== 404) {
        throw err
      }
    }
  }
}

async function redirectToDirectorySlash (ctx, opts) {
  if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return false
  if (!opts.index || ctx.path[ctx.path.length - 1] === '/') return false
  if (opts.format !== undefined && opts.format !== 'redirect') return false

  const pathname = decode(ctx.path)
  if (pathname === -1 || pathname.indexOf('\0') !== -1) return false

  const dir = resolveFromRoot(opts.root, pathname)
  if (!dir || (!opts.hidden && isHidden(opts.root, dir))) return false

  let stats
  try {
    stats = await fs.promises.stat(dir)
  } catch (err) {
    if (isNotFound(err)) return false
    throw err
  }

  if (!stats.isDirectory()) return false

  try {
    stats = await fs.promises.stat(path.join(dir, opts.index))
  } catch (err) {
    if (isNotFound(err)) return false
    throw err
  }

  if (!stats.isFile()) return false

  ctx.redirect(ctx.path + '/' + getSearch(ctx))
  return true
}

function decode (pathname) {
  try {
    return decodeURIComponent(pathname)
  } catch (err) {
    return -1
  }
}

function isHidden (root, pathname) {
  const parts = path.relative(root, pathname).split(path.sep)

  for (let i = 0; i < parts.length; i++) {
    if (parts[i][0] === '.') return true
  }

  return false
}

function isNotFound (err) {
  return err.code === 'ENOENT' || err.code === 'ENOTDIR' || err.code === 'ENAMETOOLONG'
}

function getSearch (ctx) {
  const search = ctx.search

  if (!search) return ''
  return search[0] === '?' ? search : `?${search}`
}

function resolveFromRoot (root, pathname) {
  const filename = pathname.slice(path.parse(pathname).root.length)
  const resolved = path.resolve(root, filename)
  const relative = path.relative(root, resolved)

  if (relative === '' || (relative.substr(0, 2) !== '..' && !path.isAbsolute(relative))) {
    return resolved
  }

  return null
}
