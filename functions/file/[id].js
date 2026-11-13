export async function onRequestGet({ params, env }) {
  if (!/^[a-z0-9]{8,40}$/.test(params.id)) return new Response('Not found', { status: 404 });
  const { value, metadata } = await env.CARDS.getWithMetadata(`file:${params.id}`, 'arrayBuffer');
  if (!value) return new Response('Not found', { status: 404 });
  const name = String(metadata?.name || 'file').replace(/[^\w .()\-]/g, '_');
  const pdf = metadata?.type === 'application/pdf';
  return new Response(value, {
    headers: {
      'Content-Type': metadata?.type || 'application/octet-stream',
      'Content-Disposition': `${pdf ? 'inline' : 'attachment'}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(pdf ? {} : { 'Content-Security-Policy': "default-src 'none'; sandbox" }),
    },
  });
}
