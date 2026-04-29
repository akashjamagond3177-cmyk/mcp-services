import { AsyncLocalStorage } from 'node:async_hooks';
import type { IncomingHttpHeaders } from 'http';

type RequestContext = {
  headers: IncomingHttpHeaders;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestHeaders(): IncomingHttpHeaders | undefined {
  return storage.getStore()?.headers;
}

