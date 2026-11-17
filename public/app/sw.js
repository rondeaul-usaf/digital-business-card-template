var V = 'cards-v4';
var SHELL = ['/app/', '/app/app.js', '/qrdl.js', '/app/app.css', '/app/manifest.webmanifest', '/app/icon-192.png', '/app/apple-touch-icon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function cacheable(u) { return u.pathname.indexOf('/app/') === 0 || u.pathname === '/api/public' || u.pathname === '/qrdl.js' || /^\/c\/[a-z0-9-]+\/(vcard-)?qr\.svg$/.test(u.pathname); }
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !cacheable(u)) return;
  e.respondWith(caches.open(V).then(function (c) {
    return c.match(r).then(function (hit) {
      var net = fetch(r).then(function (res) { if (res.ok) c.put(r, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
