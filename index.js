'use strict';

/**
 * Module dependencies.
 */

const debug = require('debug')('koa-static');
const { resolve } = require('path');
const assert = require('assert');
const send = require('koa-send');

/**
 * Expose `serve()`.
 */

module.exports = serve;

/**
 * Serve static path prefix.
 *
 * @param {String} path
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function _isPrefix(path, prefix) {
  if (prefix) {
    var regPrefix = new RegExp('^' + prefix);
    if (path.match(regPrefix)) {
      path = path.replace(regPrefix, '').replace(/^$/, '/');
    } else {
      path = undefined;
    }
  }
  return path;
}

/**
 * Serve static files from `root`.
 *
 * @param {String} root
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

function serve(root, opts) {
  opts = Object.assign({}, opts);

  assert(root, 'root directory is required to serve files');

  // options
  debug('static "%s" %j', root, opts);
  opts.root = resolve(root);
  if (opts.index !== false) opts.index = opts.index || 'index.html';

  if (!opts.defer) {
    return async function serve(ctx, next) {
      let done = false;

      if (ctx.method === 'HEAD' || ctx.method === 'GET') {
        try {
          console.log('ctx.path: ', ctx.path);
          var path = _isPrefix(ctx.path, opts.prefix);
          if (path) {
            done = await send(ctx, path, opts);
          }
        } catch (err) {
          if (err.status !== 404) {
            throw err;
          }
        }
      }

      if (!done) {
        await next();
      }
    };
  }

  return async function serve(ctx, next) {
    await next();

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return; // eslint-disable-line

    try {
      var path = _isPrefix(ctx.path, opts.prefix);
      if (path) {
        await send(ctx, path, opts);
      }
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
    }
  };
}
