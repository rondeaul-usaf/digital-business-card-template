(function () {
  var tabs = document.getElementById('tabs'), main = document.getElementById('main');
  var cards = [], cur = null, contactOnly = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function draw() {
    if (!cards.length) { tabs.innerHTML = ''; main.innerHTML = '<p class="mute">No cards yet. Tap Edit to create one.</p>'; return; }
    if (!cards.some(function (c) { return c.slug === cur; })) cur = cards[0].slug;
    tabs.innerHTML = '<label class="pick"><span>Card</span><select id="cardsel" aria-label="Choose a card">' + cards.map(function (c) { return '<option value="' + esc(c.slug) + '"' + (c.slug === cur ? ' selected' : '') + '>' + esc(c.label || c.slug) + '</option>'; }).join('') + '</select></label>';
    var c = cards.find(function (x) { return x.slug === cur; });
    var kq = c.key ? '?k=' + encodeURIComponent(c.key) : '';
    var url = location.origin + '/c/' + c.slug + kq;
    var shareUrl = location.origin + '/c/' + c.slug + (kq ? kq + '&src=share' : '?src=share');
    var qr = '/c/' + c.slug + (contactOnly ? '/vcard-qr.svg' : '/qr.svg') + kq;
    var qrMain = '/c/' + c.slug + '/qr.svg' + kq;
    var fname = (c.slug || 'card') + '-qr.png';
    main.innerHTML = '<div class="qrwrap"><img src="' + qr + '" alt="QR code"></div>' +
      '<p class="who">' + esc(c.name) + '</p><p class="role">' + esc([c.title, c.company].filter(Boolean).join(' · ')) + '</p>' +
      (c.expired ? '<p class="mute">This card has expired. Only you can open it.</p>' : '') +
      '<div class="btns"><button class="btn" id="share">Share link</button><button class="btn sec" id="copy">Copy link</button><a class="btn sec" href="' + esc(url) + '">Open</a></div>' +
      '<div class="btns" style="margin-top:10px"><button class="btn sec" id="shareqr">Share QR image</button><button class="btn sec" id="saveqr">Save QR image</button></div><p class="mute" id="qrmsg" role="status"></p>' +
      '<div class="sw"><label><input type="checkbox" id="co"' + (contactOnly ? ' checked' : '') + '> Contact-only QR (adds me directly, no web page)</label></div>';
    document.getElementById('share').onclick = function () {
      if (navigator.share) navigator.share({ title: c.name, url: shareUrl }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(shareUrl);
    };
    function msg(t) { var m = document.getElementById('qrmsg'); if (m) m.textContent = t; }
    document.getElementById('shareqr').onclick = function () { window.QRDL.share(qrMain, fname, c.name, shareUrl).catch(function (e) { msg(e.message); }); };
    document.getElementById('saveqr').onclick = function () { window.QRDL.download(qrMain, fname, 1024).then(function () { msg('QR image saved'); }).catch(function (e) { msg(e.message); }); };
    document.getElementById('copy').onclick = function (e) { if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).then(function () { e.target.textContent = 'Copied'; }); };
    document.getElementById('co').onchange = function (e) { contactOnly = e.target.checked; draw(); };
  }

  tabs.addEventListener('change', function (e) {
    if (!e.target || e.target.id !== 'cardsel') return;
    cur = e.target.value; draw();
  });

  fetch('/api/public').then(function (r) { return r.json(); }).then(function (d) { cards = d; cur = (d.find(function (c) { return c.isDefault; }) || d[0] || {}).slug; draw(); })
    .catch(function () { main.innerHTML = '<p class="mute">Offline and nothing cached yet.</p>'; });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(function () {});
})();
