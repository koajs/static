# koa-static

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

 Koa static file serving middleware, wrapper for [`koa-send`](https://github.com/koajs/send).

## Installation

```bash
$ npm install koa-static
```

## API

```js
var koa = require('koa');
var app = koa();
app.use(require('koa-static')(root, opts));
```

* `root` root directory string. nothing above this root directory can be served
* `opts` options object.

### Options

 - `maxage` Browser cache max-age in milliseconds. defaults to 0
 - `hidden` Allow transfer of hidden files. defaults to false
 - `index` Default file name, defaults to 'index.html'
 - `defer` If true, serves after `return next()`, allowing any downstream middleware to respond first.
 - `gzip`  Try to serve the gzipped version of a file automatically when gzip is supported by a client and if the requested file with .gz extension exists. defaults to true.

## Example

```js
var serve = require('koa-static');
var koa = require('koa');
var app = koa();

// $ GET /package.json
app.use(serve('.'));

// $ GET /hello.txt
app.use(serve('test/fixtures'));

// or use absolute paths
app.use(serve(__dirname + '/test/fixtures'));

app.listen(3000);

console.log('listening on port 3000');
```

### See also

 - [koajs/conditional-get](https://github.com/koajs/conditional-get) Conditional GET support for koa
 - [koajs/compress](https://github.com/koajs/compress) Compress middleware for koa
 - [koajs/mount](https://github.com/koajs/mount) Mount `koa-static` to a specific path

## License

  MIT

[npm-image]: https://img.shields.io/npm/v/koa-static.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-static
[github-tag]: http://img.shields.io/github/tag/koajs/static.svg?style=flat-square
[github-url]: https://github.com/koajs/static/tags
[travis-image]: https://img.shields.io/travis/koajs/static.svg?style=flat-square
[travis-url]: https://travis-ci.org/koajs/static
[coveralls-image]: https://img.shields.io/coveralls/koajs/static.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/koajs/static?branch=master
[david-image]: http://img.shields.io/david/koajs/static.svg?style=flat-square
[david-url]: https://david-dm.org/koajs/static
[license-image]: http://img.shields.io/npm/l/koa-static.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/koa-static.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/koa-static
[gittip-image]: https://img.shields.io/gittip/jonathanong.svg?style=flat-square
[gittip-url]: https://www.gittip.com/jonathanong/
