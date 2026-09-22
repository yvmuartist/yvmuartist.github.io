/* ---------------------------------------------------------------------------
   Yv Maciel — gallery behaviour: category filter, justified rows, lightbox.

   Everything here is an enhancement. With JavaScript off the CSS still lays
   the photographs out in justified rows, the filter hides itself, and all the
   work is visible — there is simply no lightbox and nothing that looks like a
   control but isn't one.
   --------------------------------------------------------------------------- */

(function () {
  var grid = document.getElementById('grid');
  if (!grid) return;

  var buttons = document.querySelectorAll('.filter button');
  var items = [].slice.call(grid.querySelectorAll('figure'));
  var empty = document.getElementById('empty');
  var GAP = 14;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ar = function (fig) { return parseFloat(fig.dataset.ar) || 1; };
  var visible = function () { return items.filter(function (f) { return !f.hidden; }); };

  /* ---- justified rows ---------------------------------------------------
     The CSS produces justified rows on its own, but flex wraps on flex-basis
     and only then stretches, with no look-ahead: a row that wraps one image
     short gets stretched far taller than its neighbours. This pass picks each
     row break by whichever option lands closer to the target height. */

  function resetRows() {
    grid.classList.remove('is-justified');
    items.forEach(function (f) {
      f.style.width = '';
      f.querySelector('img').style.height = '';
    });
  }

  function justify() {
    var width = grid.clientWidth;
    // Below this width the CSS gives every photograph the full column.
    if (!width || window.matchMedia('(max-width: 520px)').matches) { resetRows(); return; }

    var shown = visible();
    if (!shown.length) { resetRows(); return; }

    var target = Math.max(240, Math.min(420, window.innerWidth * 0.26));
    grid.classList.add('is-justified');

    var row = [], sum = 0;

    function place(stretch) {
      var gaps = GAP * (row.length - 1);
      var h = stretch ? (width - gaps) / sum : target;
      var used = 0;
      row.forEach(function (f, i) {
        var w = (stretch && i === row.length - 1)
          ? width - gaps - used
          : Math.floor(h * ar(f));
        used += w;
        f.style.width = w + 'px';
        f.querySelector('img').style.height = Math.round(h) + 'px';
      });
      row = []; sum = 0;
    }

    shown.forEach(function (f) {
      var a = ar(f);
      if (row.length && (sum + a) * target + GAP * row.length > width) {
        var without = (width - GAP * (row.length - 1)) / sum;
        var withIt = (width - GAP * row.length) / (sum + a);
        if (Math.abs(withIt - target) < Math.abs(without - target)) {
          row.push(f); sum += a; place(true); return;
        }
        place(true);
      }
      row.push(f); sum += a;
    });

    if (row.length) place(false);
  }

  /* ---- lightbox --------------------------------------------------------- */

  var lb, lbImg, lbTitle, lbMeta, lbCount, lbPrev, lbNext, lbClose;
  var group = [], index = -1, opener = null, savedScroll = 0;

  // The grid serves a thumbnail-sized file. Pull the widest candidate out of
  // the srcset so the lightbox shows a genuinely larger image, and hand the
  // whole srcset over so a phone still downloads a sensible size rather than
  // the 2000px one.
  function widest(img) {
    var set = img.getAttribute('srcset');
    if (!set) return img.currentSrc || img.src;
    var best = { w: 0, url: img.currentSrc || img.src };
    set.split(',').forEach(function (candidate) {
      var bits = candidate.trim().split(/\s+/);
      var w = parseInt(bits[1], 10) || 0;
      if (w > best.w) best = { w: w, url: bits[0] };
    });
    return best.url;
  }

  function build() {
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photograph');
    lb.innerHTML =
      '<div class="lb-top"><button type="button" class="lb-btn lb-close" aria-label="Close">&#10005;</button></div>' +
      '<figure class="lb-stage">' +
        '<button type="button" class="lb-btn lb-side lb-prev" aria-label="Previous photograph">&#8249;</button>' +
        '<img alt="">' +
        '<button type="button" class="lb-btn lb-side lb-next" aria-label="Next photograph">&#8250;</button>' +
      '</figure>' +
      '<div class="lb-bottom">' +
        '<span class="lb-caption"><span class="lb-title"></span><span class="lb-meta"></span></span>' +
        '<span class="lb-nav">' +
          '<button type="button" class="lb-btn lb-bar-prev" aria-label="Previous photograph">&#8249;</button>' +
          '<span class="lb-count"></span>' +
          '<button type="button" class="lb-btn lb-bar-next" aria-label="Next photograph">&#8250;</button>' +
        '</span>' +
      '</div>';

    document.body.appendChild(lb);
    lbImg = lb.querySelector('img');
    lbTitle = lb.querySelector('.lb-title');
    lbMeta = lb.querySelector('.lb-meta');
    lbCount = lb.querySelector('.lb-count');
    lbClose = lb.querySelector('.lb-close');

    lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
    lb.querySelector('.lb-bar-prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('.lb-bar-next').addEventListener('click', function () { step(1); });
    lbClose.addEventListener('click', close);

    // Tapping the surround dismisses; tapping the photograph itself does not,
    // so a careless tap while looking never throws you out.
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lb-stage')) close();
    });

    var sx = 0, sy = 0, swiping = false;
    var stage = lb.querySelector('.lb-stage');
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      swiping = true; sx = e.clientX; sy = e.clientY;
    });
    stage.addEventListener('pointerup', function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
    });
    stage.addEventListener('pointercancel', function () { swiping = false; });
  }

  function show(i) {
    index = (i + group.length) % group.length;
    var fig = group[index];
    var img = fig.querySelector('img');
    var caption = fig.querySelectorAll('figcaption span');

    lbImg.src = widest(img);
    if (img.getAttribute('srcset')) {
      lbImg.setAttribute('srcset', img.getAttribute('srcset'));
      lbImg.setAttribute('sizes', '100vw');
    } else {
      lbImg.removeAttribute('srcset');
    }
    lbImg.alt = img.alt || '';
    lbTitle.textContent = caption[0] ? caption[0].textContent : '';
    lbMeta.textContent = caption[1] ? caption[1].textContent : '';
    lbCount.textContent = (index + 1) + ' / ' + group.length;

    var solo = group.length < 2;
    [].forEach.call(lb.querySelectorAll('.lb-prev,.lb-next,.lb-bar-prev,.lb-bar-next'), function (b) {
      b.hidden = solo;
    });
    lb.querySelector('.lb-nav').hidden = solo;

    // Warm the neighbours so navigation is instant.
    [-1, 1].forEach(function (d) {
      var n = group[(index + d + group.length) % group.length];
      if (n && n !== fig) { var pre = new Image(); pre.src = widest(n.querySelector('img')); }
    });
  }

  function step(d) { if (group.length > 1) show(index + d); }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { step(-1); return; }
    if (e.key === 'ArrowRight') { step(1); return; }
    if (e.key !== 'Tab') return;
    // Keep Tab inside the dialog.
    var focusable = [].filter.call(lb.querySelectorAll('button'), function (b) { return !b.hidden; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(fig) {
    if (!lb) build();
    group = visible();
    var at = group.indexOf(fig);
    if (at < 0) return;

    opener = fig;
    show(at);

    // iOS ignores `overflow: hidden` on body, so pin it instead and put the
    // scroll position back on close.
    savedScroll = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = -savedScroll + 'px';
    document.body.style.width = '100%';

    lb.hidden = false;
    // Next frame, so the opening transition actually runs.
    requestAnimationFrame(function () { lb.classList.add('is-open'); });
    document.addEventListener('keydown', onKey);
    lbClose.focus();
  }

  function close() {
    if (!lb || lb.hidden) return;
    lb.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);

    var finish = function () {
      lb.hidden = true;
      lbImg.removeAttribute('src');
      lbImg.removeAttribute('srcset');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      // While the body was pinned the document had no height, so restoring the
      // scroll is clamped to 0 unless the scrolling element's layout is
      // recomputed first. Reading scrollHeight on documentElement — not on
      // body, which is the element that was pinned — forces that, and the
      // rAF is a belt-and-braces second attempt after the next layout pass.
      void document.documentElement.scrollHeight;
      window.scrollTo(0, savedScroll);
      requestAnimationFrame(function () {
        if (Math.abs(window.scrollY - savedScroll) > 2) window.scrollTo(0, savedScroll);
      });
      if (opener) { opener.focus(); opener = null; }
    };

    if (reduceMotion) finish();
    else setTimeout(finish, 180);
  }

  /* ---- wiring ----------------------------------------------------------- */

  // Added from script so that without JavaScript there is no control that
  // looks clickable and does nothing.
  grid.classList.add('is-interactive');
  items.forEach(function (fig) {
    var title = fig.querySelector('figcaption span');
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', 'View ' + (title ? title.textContent : 'photograph') + ' larger');
    fig.addEventListener('click', function () { open(fig); });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(fig); }
    });
  });

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.dataset.cat, shown = 0;
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      items.forEach(function (fig) {
        var match = cat === 'all' || fig.dataset.cat === cat;
        fig.hidden = !match;
        if (match) shown++;
      });
      empty.hidden = shown > 0;
      justify();
    });
  });

  var timer;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(justify, 120);
  });

  justify();
})();
