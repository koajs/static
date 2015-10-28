
'use strict';

const serve = require('./');
const koa = require('koa');
const app = new koa();

// $ GET /package.json
// $ GET /

app.use(serve('.'));

app.use(function (ctx, next){
  next(ctx);
  if ('/' == this.path) {
    ctx.body = 'Try `GET /package.json`';
  }
})

app.listen(3000);

console.log('listening on port 3000');
