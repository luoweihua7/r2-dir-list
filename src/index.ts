import { parse } from 'cookie';
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
    // remove query string
    const requestCopy = new Request(request.url.split('?').shift(), request);
    const bucketResp = await fetch(requestCopy);

    // if status is not 404 or request path not end with '/', return origin response
    if (![404].includes(bucketResp.status) || bucketResp.url.slice(-1) !== '/' || !siteConfig) {
      return bucketResp;
    }

    const { hostname, pathname, searchParams } = new URL(request.url);
    let secret = searchParams.get('secret');
    const { secretKey = '' } = siteConfig;

    // 增加简单的安全校验
    if (secretKey) {
      // 将URL中的secret参数写入到cookie中
      if (secretKey === secret) {
        return new Response('', {
          status: 302,
          headers: {
            Location: `${pathname}`,
            'Set-Cookie': `secret=${secret}; path=/; domain=${hostname}; SameSite=None; Secure`,
          },
        });
      }

      // URL中没有 secret 参数，从cookie中获取
      const cookies = parse(request.headers.get('Cookie') || '');
      secret = cookies['secret'];

      if (secretKey !== secret) {
        return new Response('Unauthorized', {
          status: 401,
        });
      }
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
      return bucketResp;
    }

    return new Response(renderTemplFull(index.objects, index.delimitedPrefixes, pathname, siteConfig), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      status: 200,
    });
  },
};
