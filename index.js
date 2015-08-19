
/**
 * Module dependencies.
 */

var resolve = require('path').resolve;
var assert = require('assert');
var debug = require('debug')('koa-static');
var send = require('koa-send');

/**
 * Expose `serve()`.
 */

module.exports = serve;

/**
 * Serve static files from `root`.
 *
 * @param {String} root
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

function serve(root, opts) {
  opts = opts || {};

  assert(root, 'root directory is required to serve files');

  // options
  debug('static "%s" %j', root, opts);
  opts.root = resolve(root);
  opts.index = opts.index || 'index.html';

  if (!opts.defer) {
    return function *serve(next){
      if (this.method == 'HEAD' || this.method == 'GET') {
        var path = yield send(this, this.path, opts)
        if (path) {
          yield invokeCallback(this, path);
          return;
        }
      }
      yield* next;
    };
  }

  return function *serve(next){
    yield* next;

    if (this.method != 'HEAD' && this.method != 'GET') return;
    // response is already handled
    if (this.body != null || this.status != 404) return;

    var path = yield send(this, this.path, opts);
    yield invokeCallback(this, path);
  };

  function *invokeCallback(ctx, path) {
    if (path) {
      if (typeof opts.callback==='function') {
        if (opts.callback.constructor.name === 'GeneratorFunction') {
          yield opts.callback(ctx, path);
        }
        else {
          opts.callback(ctx, path);
        }
      }
    }
  }
}
