export async function onRequestGet({ params, env }) {
  if (!/^[a-z0-9]{8,40}$/.test(params.id)) return new Response('Not found', { status: 404 });
  const { value, metadata } = await env.CARDS.getWithMetadata(`img:${params.id}`, 'arrayBuffer');
  if (!value) return new Response('Not found', { status: 404 });
  const type = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(metadata?.type) ? metadata.type : 'image/jpeg';
  return new Response(value, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
}
