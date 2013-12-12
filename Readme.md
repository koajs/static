
# koa-static

 Static file serving middleware.

## Installation

```js
$ npm install koa-static
```

## Options

 - `maxage` Browser cache max-age in milliseconds. defaults to 0
 - `hidden` Allow transfer of hidden files. defaults to false
 - `index` Default file name, defaults to 'index.html'

## Example

```js
var serve = require('./');
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

## License

  MIT