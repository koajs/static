import type { ServerResponse } from 'http';
import type { Stats } from 'fs';

export interface KoaStaticContext {
  method: string;
  path: string;
  status: number;
  body: unknown;
  type: string;
  res: ServerResponse;
  response: { get(field: string): string };
  acceptsEncodings(...encodings: string[]): string | false;
  set(field: string, value: string | string[]): void;
  throw(status: number, message: string): never;
}

export type KoaStaticMiddleware = (
  ctx: KoaStaticContext,
  next: () => Promise<unknown>
) => Promise<void>;

export interface KoaStaticOptions {
  /**
   *  Default file name, defaults to 'index.html'
   * @default "index.html"
   */
  index?: string | false;

  /**
   * Browser cache max-age in milliseconds. defaults to 0
   * @default 0
   */
  maxage?: number;

  /**
   * Allow transfer of hidden files. defaults to false
   * @default false
   */
  hidden?: boolean;

  /**
   * If true, serves after return next(), allowing any downstream middleware to respond first.
   */
  defer?: boolean;

  /**
   * gzip Try to serve the gzipped version of a file automatically when gzip is supported by a client and if the requested file with .gz extension exists. defaults to true.
   */
  gzip?: boolean;

  maxAge?: number;
  brotli?: boolean;
  format?: boolean;
  extensions?: string[] | false;
  immutable?: boolean;
  setHeaders?: (res: ServerResponse, path: string, stats: Stats) => void;
}
