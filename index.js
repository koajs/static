
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
  if (opts.format !== false) opts.format = true;

  assert(root, 'root directory is required to serve files');

  // options
  debug('static "%s" %j', root, opts);
  opts.root = resolve(root);
  opts.index = opts.index || 'index.html';

  if (!opts.defer) {
    return function *serve(next){
      if (this.method == 'HEAD' || this.method == 'GET') {
        if (yield send(this, formatPath(this.path), opts)) return;
      }
      yield* next;
    };
  }

  return function *serve(next){
    yield* next;

    if (this.method != 'HEAD' && this.method != 'GET') return;
    // response is already handled
    if (this.body != null || this.status != 404) return;

    yield send(this, formatPath(this.path), opts);
  };

  // Format the path to serve static file servers
  // and not require a trailing slash for directories,
  // so that you can do both `/directory` and `/directory/`
  function formatPath(path) {
    if (opts.format) {
      var trailingSlash = '/' == path[path.length - 1];
      return trailingSlash ? path : path + '/';
    } else {
      return path;
    }
  }
}
