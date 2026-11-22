/* DH Makeup Studio: navigasi ponsel, saringan galeri, formulir booking.
   Tidak ada backend. Formulir menyusun pesan nyata lalu menyalinnya,
   bukan memalsukan pengiriman ke server. */

(function () {
  'use strict';

  /* ------------------------------------------------- reveal saat scroll
     MOTION 2. Sekali jalan, tidak berulang, tidak ada loop. Dimatikan
     untuk prefers-reduced-motion, dan kalau IntersectionObserver tidak
     ada semuanya langsung terlihat. */
  window.__revealReady = true;

  var items = document.querySelectorAll('.reveal');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* mencetak halaman tidak boleh kehilangan bagian yang belum di-scroll */
  window.addEventListener('beforeprint', function () {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  });

  if (!items.length) {
    /* tidak ada yang perlu diungkap */
  } else if (still || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el, i) {
      /* elemen yang sudah terlihat saat muat tampil tanpa menunggu scroll */
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.style.setProperty('--i', Math.min(i, 6));
        window.requestAnimationFrame(function () { el.classList.add('is-in'); });
      } else {
        io.observe(el);
      }
    });
  }

  /* ---------------------------------------------- lembar navigasi ponsel */
  var sheet = document.getElementById('nav-sheet');
  var openBtn = document.getElementById('nav-open');
  var lastFocused = null;

  function openSheet() {
    if (!sheet) return;
    lastFocused = document.activeElement;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    var first = sheet.querySelector('.sheet__close');
    if (first) first.focus();
  }

  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.body.style.overflow = '';
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (openBtn) openBtn.addEventListener('click', openSheet);
  if (sheet) {
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('.sheet__close') || e.target.closest('.sheet__scrim')) closeSheet();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
  });

  /* --------------------------------------------------- saringan galeri */
  var filterBar = document.getElementById('gallery-filters');
  if (filterBar) {
    var shots = Array.prototype.slice.call(document.querySelectorAll('[data-look]'));
    var count = document.getElementById('gallery-count');
    var empty = document.getElementById('gallery-empty');

    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      var want = btn.getAttribute('data-filter');

      filterBar.querySelectorAll('button[data-filter]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });

      var shown = 0;
      /* menyaring memindahkan foto ke posisi baru, jadi yang belum sempat
         muncul saat scroll ditampilkan sekarang supaya tidak ada kotak kosong */
      shots.forEach(function (fig) { fig.classList.add('is-in'); });
      shots.forEach(function (fig) {
        var match = want === 'all' || fig.getAttribute('data-look') === want;
        fig.hidden = !match;
        if (match) shown++;
      });

      if (count) {
        count.textContent = shown === 0
          ? 'Tidak ada foto pada kategori ini'
          : (want === 'all' ? shown + ' foto' : shown + ' foto pada kategori ini');
      }
      if (empty) empty.hidden = shown !== 0;
    });
  }

  /* ------------------------------------------------- formulir booking */
  var form = document.getElementById('booking-form');
  if (!form) return;

  var outcome = document.getElementById('booking-outcome');
  var submitBtn = document.getElementById('booking-submit');
  var copyBtn = null;

  var LABEL = {
    nama: 'Nama',
    wa: 'Nomor WhatsApp',
    tanggal: 'Tanggal acara',
    acara: 'Jenis acara',
    paket: 'Paket',
    lokasi: 'Lokasi',
    pesan: 'Catatan'
  };

  function setError(field, message) {
    var input = form.elements[field];
    var slot = document.getElementById('err-' + field);
    if (!input) return;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (slot) slot.textContent = message;
    } else {
      input.removeAttribute('aria-invalid');
      if (slot) slot.textContent = '';
    }
  }

  function validate() {
    var problems = [];

    var nama = form.elements.nama.value.trim();
    setError('nama', '');
    if (nama.length < 2) { setError('nama', 'Tulis nama Anda.'); problems.push('nama'); }

    var wa = form.elements.wa.value.replace(/[\s-]/g, '');
    setError('wa', '');
    if (!/^(\+?62|0)\d{8,13}$/.test(wa)) {
      setError('wa', 'Nomor belum benar. Contoh: 081234567890.');
      problems.push('wa');
    }

    var tanggal = form.elements.tanggal.value;
    setError('tanggal', '');
    if (!tanggal) {
      setError('tanggal', 'Pilih tanggal acara.');
      problems.push('tanggal');
    } else if (new Date(tanggal + 'T23:59:59') < new Date()) {
      setError('tanggal', 'Tanggal itu sudah lewat.');
      problems.push('tanggal');
    }

    setError('consent', '');
    if (!form.elements.consent.checked) {
      var slot = document.getElementById('err-consent');
      if (slot) slot.textContent = 'Centang dulu agar kami boleh menghubungi Anda.';
      problems.push('consent');
    }

    return problems;
  }

  function compose() {
    var lines = ['Halo DH Makeup Studio, saya ingin menanyakan ketersediaan tanggal.', ''];
    Object.keys(LABEL).forEach(function (key) {
      var el = form.elements[key];
      if (!el) return;
      var v = (el.value || '').trim();
      if (!v) return;
      lines.push(LABEL[key] + ': ' + v);
    });
    return lines.join('\n');
  }

  function render(state, payload) {
    if (!outcome) return;
    outcome.setAttribute('data-state', state);
    outcome.innerHTML = '';

    var title = document.createElement('p');
    title.className = 'outcome__title';
    var text = document.createElement('p');
    text.className = 'outcome__text';

    if (state === 'busy') {
      title.textContent = 'Menyusun pesan';
      outcome.appendChild(title);
      var row = document.createElement('p');
      row.className = 'outcome__text';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '0.5rem';
      var sp = document.createElement('span');
      sp.className = 'spinner';
      row.appendChild(sp);
      row.appendChild(document.createTextNode('Sebentar, isian Anda sedang dirapikan.'));
      outcome.appendChild(row);
      return;
    }

    if (state === 'error') {
      title.textContent = 'Ada ' + payload + ' isian yang perlu dilengkapi';
      text.textContent = 'Pesan kesalahan muncul tepat di bawah kolomnya. Perbaiki lalu kirim lagi.';
      outcome.appendChild(title);
      outcome.appendChild(text);
      return;
    }

    if (state === 'ready') {
      title.textContent = 'Pesan Anda siap dikirim';
      text.textContent = 'Situs ini belum tersambung ke server, jadi pesannya tidak terkirim otomatis. Salin teks di bawah, lalu tempel di WhatsApp DH Makeup Studio.';
      outcome.appendChild(title);
      outcome.appendChild(text);

      var pre = document.createElement('pre');
      pre.textContent = payload;
      outcome.appendChild(pre);

      copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn--primary';
      copyBtn.style.justifySelf = 'start';
      copyBtn.textContent = 'Salin pesan';
      copyBtn.addEventListener('click', function () { copy(payload); });
      outcome.appendChild(copyBtn);

      var status = document.createElement('p');
      status.className = 'outcome__text';
      status.id = 'copy-status';
      outcome.appendChild(status);
      return;
    }

    title.textContent = 'Belum ada pesan';
    text.textContent = 'Lengkapi formulir di atas. Setelah dikirim, teks pesan untuk WhatsApp muncul di sini.';
    outcome.appendChild(title);
    outcome.appendChild(text);
  }

  function copy(textToCopy) {
    var status = document.getElementById('copy-status');
    function ok() { if (status) status.textContent = 'Tersalin. Buka WhatsApp dan tempel pesannya.'; }
    function fail() {
      if (status) status.textContent = 'Penyalinan otomatis diblokir peramban. Pilih teks di kotak atas lalu salin manual.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(ok).catch(fail);
    } else {
      fail();
    }
  }

  render('empty');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var problems = validate();

    if (problems.length) {
      render('error', problems.length);
      var firstBad = form.elements[problems[0]];
      if (firstBad && firstBad.focus) firstBad.focus();
      return;
    }

    render('busy');
    if (submitBtn) submitBtn.disabled = true;

    window.setTimeout(function () {
      render('ready', compose());
      if (submitBtn) submitBtn.disabled = false;
      if (copyBtn) copyBtn.focus();
    }, 220);
  });

  form.addEventListener('input', function (e) {
    if (e.target.name && e.target.getAttribute('aria-invalid') === 'true') setError(e.target.name, '');
    if (e.target.name === 'consent' && e.target.checked) {
      var slot = document.getElementById('err-consent');
      if (slot) slot.textContent = '';
    }
  });
})();
