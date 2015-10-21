
'use strict';

const serve = require('./');
const koa = require('koa');
const app = koa();

// $ GET /package.json
// $ GET /

app.use(serve('.'));

app.use(function *(next){
  yield next;
  if ('/' == this.path) {
    this.body = 'Try `GET /package.json`';
  }
})

app.listen(3000);

console.log('listening on port 3000');