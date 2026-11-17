/* Turns a QR code (SVG) into a PNG you can save or share. Used by the phone app and the editor. */
(function () {
  function toPng(svgUrl, size) {
    size = size || 1024;
    return fetch(svgUrl, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('QR code unavailable');
      return r.text();
    }).then(function (svg) {
      svg = svg.replace('<svg ', '<svg width="' + size + '" height="' + size + '" ');
      return new Promise(function (res, rej) {
        var img = new Image(), u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        img.onload = function () {
          var c = document.createElement('canvas'); c.width = c.height = size;
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(u);
          c.toBlob(function (b) { b ? res(b) : rej(new Error('Could not make the image')); }, 'image/png');
        };
        img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Could not load the QR code')); };
        img.src = u;
      });
    });
  }
  function save(blob, name) {
    var a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  window.QRDL = {
    download: function (svgUrl, name, size) { return toPng(svgUrl, size).then(function (b) { save(b, name); }); },
    // Opens the phone's share sheet with the QR image; falls back to a download where files cannot be shared.
    share: function (svgUrl, name, title, url) {
      return toPng(svgUrl, 1024).then(function (b) {
        var f = new File([b], name, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: title, text: url }).catch(function () {});
        save(b, name);
      });
    },
  };
})();
