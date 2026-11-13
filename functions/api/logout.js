import { sessionCookie } from '../../lib/auth.js';
export async function onRequestPost({ request }) {
  return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie('', request.url) } });
}
