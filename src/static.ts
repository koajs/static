import path from 'node:path';
import assert from 'node:assert';
import type * as Koa from 'koa';
import send from '@koa/send';
import debug from 'debug';
import type {KoaStaticOptions} from './static.types';

const debugIn = debug('koa-static');

/**
 * Serve static files from `root`.
 *
 * @param {String} root
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */
export function serve(root: string, opts: KoaStaticOptions = {}) {
  assert(root, 'root directory is required to serve files');

  debugIn('static "%s" %j', root, opts);
  opts.root = path.resolve(root);
  opts.index = opts.index ?? 'index.html';

  if (!opts.defer) {
    return async function serve(ctx: Koa.Context, next: Koa.Next) {
      let done = false;

      if (ctx.method === 'HEAD' || ctx.method === 'GET') {
        try {
          done = await send(ctx, ctx.path, opts);
        } catch (err) {
          if (err.status !== 404) {
            throw err;
          }
        }
      }

      if (!done) {
        await next();
      }
    };
  }

  return async function serve(ctx: Koa.Context, next: Koa.Next) {
    await next();

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return; // eslint-disable-line

    try {
      await send(ctx, ctx.path, opts);
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
    }
  };
}
