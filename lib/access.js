// Who may see a card: owner (signed in) always; everyone else only if the card is published,
// not expired, and (when a secret link is on) the link carries the right key.
import { verifySession, safeEqual } from './auth.js';

export const isExpired = (card, now = Date.now()) => !!card.expires && Date.parse(card.expires) < now;

const page = (status, title, msg) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><body style="font:16px system-ui;max-width:420px;margin:18vh auto;padding:0 20px;text-align:center;color:#10233d"><h1 style="font-size:22px">${title}</h1><p style="color:#5a6b82">${msg}</p></body>`, {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// Returns { res } to send instead of the card, or { owner } when access is granted.
export async function gate(card, env, request) {
  if (!card || card.published === false) return { res: new Response('Not found', { status: 404 }) };
  const owner = await verifySession(env, request.headers.get('Cookie'));
  if (owner) return { owner: true };
  if (card.secretKey && !safeEqual(new URL(request.url).searchParams.get('k') || '', card.secretKey)) return { res: new Response('Not found', { status: 404 }) };
  if (isExpired(card)) return { res: page(410, 'This card is no longer available', 'The link you opened has expired. Ask the owner for a new one.') };
  return { owner: false };
}
