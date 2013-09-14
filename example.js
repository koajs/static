
var serve = require('./');
var koa = require('koa');
var app = koa();

// $ GET /package.json
// $ GET /

app.use(serve('.'));

app.use(function(next){
  return function *(){
    yield next;
    if ('/' == this.path) {
      this.body = 'Try `GET /package.json`';
    }
  }
})

app.listen(3000);

console.log('listening on port 3000');