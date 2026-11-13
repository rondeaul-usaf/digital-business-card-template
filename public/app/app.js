(function () {
  var tabs = document.getElementById('tabs'), main = document.getElementById('main');
  var cards = [], cur = null, contactOnly = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function draw() {
    if (!cards.length) { tabs.innerHTML = ''; main.innerHTML = '<p class="mute">No cards yet. Tap Edit to create one.</p>'; return; }
    if (!cards.some(function (c) { return c.slug === cur; })) cur = cards[0].slug;
    tabs.innerHTML = '<label class="pick"><span>Card</span><select id="cardsel" aria-label="Choose a card">' + cards.map(function (c) { return '<option value="' + esc(c.slug) + '"' + (c.slug === cur ? ' selected' : '') + '>' + esc(c.label || c.slug) + '</option>'; }).join('') + '</select></label>';
    var c = cards.find(function (x) { return x.slug === cur; });
    var url = location.origin + '/c/' + c.slug;
    var qr = '/c/' + c.slug + (contactOnly ? '/vcard-qr.svg' : '/qr.svg');
    main.innerHTML = '<div class="qrwrap"><img src="' + qr + '" alt="QR code"></div>' +
      '<p class="who">' + esc(c.name) + '</p><p class="role">' + esc([c.title, c.company].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="btns"><button class="btn" id="share">Share</button><button class="btn sec" id="copy">Copy link</button><a class="btn sec" href="' + esc(url) + '">Open</a></div>' +
      '<div class="sw"><label><input type="checkbox" id="co"' + (contactOnly ? ' checked' : '') + '> Contact-only QR (adds me directly, no web page)</label></div>';
    document.getElementById('share').onclick = function () {
      if (navigator.share) navigator.share({ title: c.name, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url);
    };
    document.getElementById('copy').onclick = function (e) { if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { e.target.textContent = 'Copied'; }); };
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
