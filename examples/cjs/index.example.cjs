import Koa from 'koa'
import serve from '../../dist'

const app = new Koa()

// $ GET /package.json
// $ GET /

app.use(serve('.'))

app.use(async (ctx, next) => {
  await next()

  if (ctx.path === '/') {
    ctx.body = 'Try `GET /package.json`'
  }
})

app.listen(3000)

console.log('listening on port 3000')
