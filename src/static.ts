import createDebug from 'debug';
import path from 'path';
import assert from 'assert';
import type { Context, Middleware } from 'koa';
import type { KoaStaticMiddleware, KoaStaticOptions } from './types.js';
import send from 'koa-send';

type SendOptions = KoaStaticOptions & send.SendOptions;

const debug = createDebug('koa-static');

/**
 * Serve static files from `root`.
 *
 * @param {String} root
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */
export function serve(root: string, opts?: KoaStaticOptions): KoaStaticMiddleware;
export function serve(root: string, opts: KoaStaticOptions = {}): Middleware {
  const options: SendOptions = { ...opts };
  assert(root, 'root directory is required to serve files');
  debug('static "%s" %j', root, options);
  options.root = path.resolve(root);
  if (options.index !== false) options.index = options.index || 'index.html';
  if (options.defer) {
    const middleware = deferred(options);
    return middleware;
  }
  const middleware = immediate(options);
  return middleware;
}

function immediate(opts: SendOptions): Middleware {
  const middleware: Middleware = async function serve(ctx, next) {
    const canServe = ctx.method === 'HEAD' || ctx.method === 'GET';
    const done = canServe && (await sendFile(ctx, opts));
    if (!done) await next();
  };
  return middleware;
}

function deferred(opts: SendOptions): Middleware {
  const middleware: Middleware = async function serve(ctx, next) {
    await next();
    const canServe = ctx.method === 'HEAD' || ctx.method === 'GET';
    if (!canServe) return;
    // response is already handled
    const handled = ctx.body != null || ctx.status !== 404;
    if (handled) return;
    await sendFile(ctx, opts);
  };
  return middleware;
}

async function sendFile(ctx: Context, opts: SendOptions) {
  try {
    const sent = await send(ctx, ctx.path, opts);
    return sent;
  } catch (err) {
    const isObject = typeof err === 'object' && err !== null;
    if (!isObject) throw err;
    const notFound = 'status' in err && err.status === 404;
    if (!notFound) throw err;
    return undefined;
  }
}

export declare namespace serve {
  type Options = KoaStaticOptions;
}
