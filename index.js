
/**
 * Module dependencies.
 */

var send = require('send');
var path = require('path');
var resolve = path.resolve;
var join = path.join;

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

  if (!root) throw new Error('root directory is required to serve files');
  
  // options
  var root = resolve(root);
  var index = opts.index || 'index.html';
  var maxage = opts.maxAge || 0;
  var redirect = false !== opts.redirect;

  return function(next){
    return function *(){
      if ('GET' != this.method && 'HEAD' != this.method) return next();
      var path = this.path;

      // file stream
      var stream = send(this.req, path)
        .hidden(opts.hidden)
        .maxage(maxage)
        .index(index)
        .root(root);

      this.body = stream;
    }
  }
}