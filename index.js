
'use strict';

/**
 * Module dependencies.
 */

const resolve = require('path').resolve;
const assert = require('assert');
const debug = require('debug')('koa-static');
const send = require('koa-send');

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
  assert(root, 'root directory is required to serve files');

  var options = Object.assign({
    root: resolve(root),
    index: 'index.html'
  }, opts);


  // options
  debug('static "%s" %j', root, opts);

  if (!options.defer) {
    return function *serve(next){
      if (this.method == 'HEAD' || this.method == 'GET') {
        if (yield send(this, this.path, options)) return;
      }
      yield* next;
    };
  }

  return function *serve(next){
    yield* next;

    if (this.method != 'HEAD' && this.method != 'GET') return;
    // response is already handled
    if (this.body != null || this.status != 404) return;

    yield send(this, this.path, options);
  };
}
