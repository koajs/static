
/**
 * Module dependencies.
 */

debug = require('debug')('koa-static');
var path = require('path');
var normalize = path.normalize;
var basename = path.basename;
var extname = path.extname;
var resolve = path.resolve;
var fs = require('fs');
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
  debug('static "%s" %j', root, opts);
  var root = resolve(root);
  var index = opts.index || 'index.html';
  var maxage = opts.maxAge || 0;
  var redirect = false !== opts.redirect;
  var hidden = opts.hidden || false;

  return function(next){
    return function *(){
      yield next;

      if (!this.idempotent || this.body) return;

      var path = this.path;
      var trailingSlash = '/' == path[path.length - 1];

      // normalize path
      path = decode(path);

      if (-1 == path) return this.error('failed to decode', 400);

      // null byte(s)
      if (~path.indexOf('\0')) return this.error('null bytes', 400);

      // relative to root
      path = normalize(join(root, path));

      // malicious path, ignore
      if (0 != path.indexOf(root)) return;

      // hidden file support, ignore
      if (!hidden && leadingDot(path)) return;

      // index file support
      if (index && trailingSlash) path += index;

      // stat
      try {
        var stats = yield stat(path);
      } catch (err) {
        var notfound = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'];
        if (~notfound.indexOf(err.code)) return;  
        err.status = 500;
        throw err; 
      }

      // dir
      if (stats.isDirectory() && redirect && !trailingSlash) {
        this.redirect(this.path + '/');
        this.status = 303;
        return;
      }

      // stream
      this.type = extname(path);
      this.body = fs.createReadStream(path);
    }
  }
}

/**
 * Check if it's hidden.
 */

function leadingDot(path) {
  return '.' == basename(path)[0];
}

/**
 * Stat thunk.
 */

function stat(file) {
  return function(done){
    fs.stat(file, done);
  }
}

/**
 * Decode `path`.
 */

function decode(path) {
  try {
    return decodeURIComponent(path);
  } catch (err) {
    return -1;
  }
}
