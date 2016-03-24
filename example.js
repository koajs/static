
'use strict';

const serve = require('./');
const Koa = require('koa');
const app = new Koa();

// $ GET /package.json
// $ GET /

app.use(serve('.'));

app.use((ctx, next) => {
  return next().then(() => {
    if ('/' == ctx.path) {
      ctx.body = 'Try `GET /package.json`';
    }
  });
})

app.listen(3000);

console.log('listening on port 3000');
