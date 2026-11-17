// Cloudflare Worker entry. Static files in /public are served by the assets binding;
// this Worker only handles the dynamic routes (see run_worker_first in wrangler.jsonc).
import { onRequest as middleware } from './functions/_middleware.js';
import * as cardPage from './functions/c/[slug]/index.js';
import * as cardFile from './functions/c/[slug]/[file].js';
import * as img from './functions/img/[id].js';
import * as file from './functions/file/[id].js';
import * as publicList from './functions/api/public.js';
import * as login from './functions/api/login.js';
import * as logout from './functions/api/logout.js';
import * as me from './functions/api/admin/me.js';
import * as cards from './functions/api/admin/cards/index.js';
import * as oneCard from './functions/api/admin/cards/[slug].js';
import * as upload from './functions/api/admin/upload.js';
import * as exchange from './functions/api/exchange.js';
import * as stats from './functions/api/admin/stats.js';
import * as exchanges from './functions/api/admin/exchanges.js';

const M = { GET: 'onRequestGet', POST: 'onRequestPost', PUT: 'onRequestPut', DELETE: 'onRequestDelete' };

function route(path) {
  let m;
  if (path === '/api/public') return [publicList, {}];
  if (path === '/api/login') return [login, {}];
  if (path === '/api/logout') return [logout, {}];
  if (path === '/api/admin/me') return [me, {}];
  if (path === '/api/admin/cards') return [cards, {}];
  if (path === '/api/admin/upload') return [upload, {}];
  if (path === '/api/exchange') return [exchange, {}];
  if (path === '/api/admin/stats') return [stats, {}];
  if (path === '/api/admin/exchanges') return [exchanges, {}];
  if ((m = /^\/api\/admin\/cards\/([^/]+)$/.exec(path))) return [oneCard, { slug: m[1] }];
  if ((m = /^\/c\/([^/]+)\/?$/.exec(path))) return [cardPage, { slug: m[1] }];
  if ((m = /^\/c\/([^/]+)\/([^/]+)$/.exec(path))) return [cardFile, { slug: m[1], file: m[2] }];
  if ((m = /^\/img\/([^/]+)$/.exec(path))) return [img, { id: m[1] }];
  if ((m = /^\/file\/([^/]+)$/.exec(path))) return [file, { id: m[1] }];
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const hit = route(new URL(request.url).pathname);
    if (!hit) return env.ASSETS.fetch(request);
    const [mod, params] = hit;
    const fn = mod[M[request.method === 'HEAD' ? 'GET' : request.method]];
    const next = async () => (fn ? fn({ request, env, params, waitUntil: (p) => ctx.waitUntil(p) }) : new Response('Method not allowed', { status: 405 }));
    try {
      return await middleware({ request, env, next });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  },
};
