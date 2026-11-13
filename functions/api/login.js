import { configError, checkPasscode, makeSession, sessionCookie, rateLimited, noteFailure } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  const err = configError(env);
  if (err) return Response.json({ error: err }, { status: 500 });
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  if (await rateLimited(env, ip)) return Response.json({ error: 'Too many attempts. Try again in an hour.' }, { status: 429 });
  let body = {};
  try { body = await request.json(); } catch {}
  if (!(await checkPasscode(env, body.passcode))) {
    await noteFailure(env, ip);
    return Response.json({ error: 'Wrong passcode' }, { status: 401 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(await makeSession(env), request.url) },
  });
}
