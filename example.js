
var serve = require('./');
var koa = require('koa');
var app = koa();

// $ GET /package.json
app.use(serve('.'));
app.listen(3000);

console.log('listening on port 3000');