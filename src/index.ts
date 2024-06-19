import { Env } from './types';
import { renderTemplFull } from './render';
import { siteConfig } from './config';

async function listBucket(bucket: R2Bucket, options?: R2ListOptions): Promise<R2Objects> {
  // List all objects in the bucket, launch new request if list is truncated
  const objects: R2Object[] = [];
  const delimitedPrefixes: string[] = [];

  // delete limit, cursor in passed options
  const requestOptions = {
    ...options,
    limit: undefined,
    cursor: undefined,
  };

  let cursor = undefined;

  while (true) {
    const next = await bucket.list({
      ...requestOptions,
      cursor,
    });

    objects.push(...next.objects);
    delimitedPrefixes.push(...next.delimitedPrefixes);

    if (!next.truncated) {
      break;
    }

    cursor = next.cursor;
  }

  return {
    objects,
    delimitedPrefixes,
    truncated: false,
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const originResponse = await fetch(request);

    // if status is not 404 or request path not end with '/', return origin response
    if (![404].includes(originResponse.status) || originResponse.url.slice(-1) !== '/' || !siteConfig) {
      return originResponse;
    }

    const { pathname, searchParams } = new URL(request.url);
    const secretKey = searchParams.get('secret');
    const { secret = '' } = siteConfig;

    if (secret && secretKey !== secret) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    // remove the leading '/'
    const objectKey = pathname.slice(1);
    const bucket = env.BUCKET_bucketname;
    const index = await listBucket(bucket, {
      prefix: objectKey,
      delimiter: '/',
      include: ['httpMetadata', 'customMetadata'],
    });

    // if no object found, return origin response
    if (index.objects.length === 0 && index.delimitedPrefixes.length === 0) {
      return originResponse;
    }

    return new Response(renderTemplFull(index.objects, index.delimitedPrefixes, pathname, siteConfig), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      status: 200,
    });
  },
};
