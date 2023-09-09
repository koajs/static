export type KoaStaticOptions = Partial<{
  /**
   *  Default file name, defaults to 'index.html'
   * @default "index.html"
   */
  index: string;

  /**
   * Browser cache max-age in milliseconds. defaults to 0
   * @default 0
   */
  maxage: number;

  /**
   * Allow transfer of hidden files. defaults to false
   * @default false
   */
  hidden: boolean;

  /**
   * If true, serves after return next(), allowing any downstream middleware to respond first.
   */
  defer: boolean;

  /**
   * gzip Try to serve the gzipped version of a file automatically when gzip is supported by a client and if the requested file with .gz extension exists. defaults to true.
   */
  gzip: boolean;

  /* private property */
  root: string;
}>;
