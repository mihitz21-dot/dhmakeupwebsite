import { supabase } from '../lib/supabase';

const el = (id) => document.getElementById(id);

// Supabase mengirim pesan galatnya dalam bahasa Inggris. Seluruh situs ini
// berbahasa Indonesia, jadi yang sudah dikenali diterjemahkan. Yang belum
// dikenali TIDAK ditelan: pesan aslinya tetap ikut ditampilkan, supaya galat
// yang tak terduga tetap bisa dilacak dan bukan berubah jadi "gagal" kosong.
const PESAN = {
  'Invalid login credentials': 'Email atau kata sandi salah.',
  'Email not confirmed': 'Email ini belum dikonfirmasi.',
  'User not found': 'Akun dengan email ini tidak ada.',
  'Failed to fetch': 'Tidak bisa menghubungi server. Periksa koneksi internet, atau project Supabase sedang dijeda.',
  'Email logins are disabled': 'Login dengan email sedang dimatikan di pengaturan Supabase.',
  'Signups not allowed for this instance': 'Pendaftaran akun baru dimatikan.',
};

function terjemah(pesan) {
  if (PESAN[pesan]) return PESAN[pesan];
  if (/rate limit|too many requests/i.test(pesan)) {
    return 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
  }
  return 'Sebabnya: ' + pesan;
}
const tampil = (id, ya) => { el(id).hidden = !ya; };

function keadaan(nama) {
  tampil('adm-memuat', nama === 'memuat');
  tampil('adm-login', nama === 'login');
  tampil('adm-panel', nama === 'panel');
}

// Enam kolom bertipe text. Kolom area ditangani terpisah karena tipenya
// text[] di basis data, jadi formulir ini punya tujuh kolom: enam di sini
// ditambah satu kolom area.
const KOLOM = [
  ['whatsapp',        'Nomor WhatsApp',        'tel'],
  ['instagram',       'Username Instagram',    'text'],
  ['email',           'Alamat email',          'email'],
  ['jam_operasional', 'Jam balas',             'text'],
  ['dp',              'Nominal DP',            'text'],
  ['pembatalan',      'Kebijakan pembatalan',  'text'],
];

// Nilai dari basis data dan pesan galat tidak pernah dirangkai ke dalam
// string HTML. Judul dan isi dipasang lewat textContent, jadi tanda kutip
// atau tanda kurung sudut di dalamnya tidak bisa berubah jadi markup.
function tulisKabar(wadah, state, judul, teks) {
  wadah.setAttribute('data-state', state);
  wadah.textContent = '';
  const h = document.createElement('p');
  h.className = 'outcome__title';
  h.textContent = judul;
  wadah.appendChild(h);
  if (teks) {
    const t = document.createElement('p');
    t.className = 'outcome__text';
    t.textContent = teks;
    wadah.appendChild(t);
  }
}

function kabarPenuh(wadah, state, judul, teks) {
  const kotak = document.createElement('div');
  kotak.className = 'outcome';
  tulisKabar(kotak, state, judul, teks);
  wadah.replaceChildren(kotak);
}

async function muatPengaturan() {
  const isi = el('adm-isi');
  isi.innerHTML = '<p class="fine">Mengambil pengaturan...</p>';

  let data;
  try {
    const hasil = await supabase
      .from('pengaturan').select('*').eq('id', 1).single();
    if (hasil.error) throw hasil.error;
    data = hasil.data;
  } catch (e) {
    kabarPenuh(isi, 'error', 'Gagal mengambil pengaturan',
      terjemah(e.message || String(e)));
    return;
  }

  // Markup disisipkan dengan value kosong. Nilainya diisi sesudah markup
  // masuk ke DOM, sebagai properti, bukan sebagai teks HTML.
  const baris = KOLOM.map(([k, label, tipe]) =>
    '<div class="field"><label for="f-' + k + '">' + label + '</label>' +
    '<input type="' + tipe + '" id="f-' + k + '" name="' + k + '"></div>'
  ).join('');

  isi.innerHTML =
    '<form id="adm-form" class="form" novalidate>' +
      '<div class="adm-baris">' + baris + '</div>' +
      '<div class="field"><label for="f-area">Area layanan, pisahkan dengan koma</label>' +
      '<input type="text" id="f-area" name="area"></div>' +
      '<div class="adm-bar"><div class="btn-row">' +
      '<button class="btn btn--primary" type="submit" id="adm-simpan">Simpan</button>' +
      '</div></div>' +
    '</form>' +
    '<div id="adm-hasil" class="outcome" data-state="empty" role="status" aria-live="polite">' +
    '<p class="outcome__title">Belum ada perubahan</p></div>';

  KOLOM.forEach(([k]) => {
    el('f-' + k).value =
      data[k] === null || data[k] === undefined ? '' : String(data[k]);
  });
  el('f-area').value = (data.area || []).join(', ');

  el('adm-form').addEventListener('submit', simpan);
}

// Kolom yang dikosongkan admin dikembalikan menjadi null, bukan string
// kosong, karena Kontak.astro hanya menggambar cip "belum diisi" saat
// nilainya persis null.
function kosongJadiNull(v) {
  const t = v.trim();
  return t === '' ? null : t;
}

async function simpan(e) {
  e.preventDefault();
  const tombol = el('adm-simpan');
  const hasil = el('adm-hasil');

  const muatan = {};
  KOLOM.forEach(([k]) => { muatan[k] = kosongJadiNull(el('f-' + k).value); });
  muatan.area = el('f-area').value.split(',')
    .map((s) => s.trim()).filter(Boolean);

  if (muatan.area.length === 0) {
    tulisKabar(hasil, 'error', 'Area layanan tidak boleh kosong',
      'Build akan gagal kalau area kosong.');
    el('f-area').focus();
    return;
  }

  tombol.disabled = true;
  tulisKabar(hasil, 'empty', 'Menyimpan', '');

  let galat = null;
  let diperbarui = null;
  try {
    // `diperbarui` diisi pemicu basis data setiap baris berubah. Nilainya
    // diminta kembali karena pemantauan build butuh waktu penyimpanan dari
    // jam server, bukan jam peramban: jam peramban bisa salah, dan kalau
    // salah perbandingannya tidak bisa dipercaya sama sekali.
    const res = await supabase
      .from('pengaturan').update(muatan).eq('id', 1)
      .select('diperbarui').single();
    galat = res.error;
    diperbarui = res.data ? res.data.diperbarui : null;
  } catch (err) {
    galat = err;
  }

  tombol.disabled = false;

  if (galat) {
    tulisKabar(hasil, 'error', 'Gagal menyimpan',
      terjemah(galat.message || String(galat)));
    return;
  }

  // Tanpa waktu simpan dari server tidak ada yang bisa dibandingkan. Halaman
  // ini TIDAK diam-diam jatuh ke "penandanya beda berarti sudah tayang",
  // karena penanda yang beda belum membuktikan build itu membawa perubahan
  // yang baru disimpan. Lebih baik mengaku tidak bisa memantau.
  if (!diperbarui) {
    hentikanPantau();
    tulisKabar(hasil, 'ready', 'Tersimpan, tapi build tidak bisa dipantau',
      'Perubahan sudah masuk basis data. Server tidak mengembalikan waktu ' +
      'penyimpanan, jadi halaman ini tidak bisa memastikan build mana yang ' +
      'membawa perubahanmu. Periksa tab Deployments di Vercel.');
    return;
  }

  tulisKabar(hasil, 'ready', 'Tersimpan',
    'Situs sedang dibangun ulang, sekitar dua menit.');
  pantauBuild(hasil, diperbarui);
}

// Satu pegangan timer untuk seluruh modul. Tanpa ini, menekan Simpan dua
// kali membuat dua putaran berjalan sekaligus dan saling menimpa pesan di
// layar. `sesiPantau` membatalkan putaran yang fetch-nya masih di udara saat
// pemantauan dihentikan, karena clearTimeout tidak bisa menarik kembali
// fetch yang sudah berjalan.
let timerPantau = null;
let sesiPantau = 0;

function hentikanPantau() {
  if (timerPantau !== null) clearTimeout(timerPantau);
  timerPantau = null;
  sesiPantau += 1;
}

// Penanda `dibangun` hanya membuktikan ada build BARU yang sedang disajikan,
// bukan bahwa build itu membawa nilai yang baru disimpan: sebuah build yang
// sudah berjalan bisa saja membaca basis data sesaat SEBELUM penyimpanan,
// jadi penandanya berubah sementara isinya masih nilai lama. Karena itu yang
// dibandingkan adalah waktu, bukan beda-tidak-beda. Sebuah build dianggap
// membawa perubahan hanya kalau ia dibangun SESUDAH baris itu diperbarui.
function tayang(dibangun, diperbarui) {
  if (!dibangun || !diperbarui) return false;
  const b = new Date(dibangun).getTime();
  const d = new Date(diperbarui).getTime();
  if (Number.isNaN(b) || Number.isNaN(d)) return false;
  return b > d;
}

async function ambilPenanda(situs) {
  try {
    const r = await fetch(situs + '/?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const teks = await r.text();
    const m = teks.match(/name="dibangun" content="([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function pantauBuild(hasil, diperbarui) {
  hentikanPantau();
  const sesi = sesiPantau;
  const situs = location.origin;
  const mulaiPantau = Date.now();
  const batas = 5 * 60 * 1000;
  const selang = 10000;

  // setInterval dengan callback async bisa menumpuk: kalau satu fetch lebih
  // lama dari selangnya, selang berikutnya tetap tiba dan panggilannya
  // bertumpuk. Putaran ini menjadwalkan dirinya sendiri sesudah fetch
  // selesai, jadi tidak pernah ada dua pengambilan sekaligus.
  const putaran = async () => {
    const kini = await ambilPenanda(situs);
    if (sesi !== sesiPantau) return;

    if (tayang(kini, diperbarui)) {
      timerPantau = null;
      tulisKabar(hasil, 'ready', 'Sudah tayang',
        'Situs selesai dibangun ulang pada ' + kini + '.');
      return;
    }

    // Batas lima menit disengaja: tanpa itu halaman menengok selamanya kalau
    // build gagal, dan pemilik situs tidak pernah diberi tahu apa pun.
    if (Date.now() - mulaiPantau > batas) {
      timerPantau = null;
      tulisKabar(hasil, 'ready', 'Tersimpan, tapi build belum terdeteksi',
        'Perubahan sudah masuk basis data dan tidak hilang. Yang belum ' +
        'terdeteksi hanya build ulangnya. Periksa tab Deployments di Vercel.');
      return;
    }

    timerPantau = setTimeout(putaran, selang);
  };

  timerPantau = setTimeout(putaran, selang);
}

async function mulai() {
  keadaan('memuat');
  // Tanpa try/catch, Supabase yang tidak terjangkau membuat halaman ini
  // berhenti selamanya di tulisan "Memeriksa sesi", dan satu-satunya
  // petunjuknya cuma di konsol peramban. Tier gratis Supabase memang dijeda
  // setelah tujuh hari tanpa aktivitas, jadi keadaan ini akan benar-benar
  // terjadi. Lebih baik jatuh ke formulir login dengan sebab yang terbaca.
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) {
      el('adm-siapa').textContent = data.session.user.email;
      keadaan('panel');
      await muatPengaturan();
      return;
    }
    keadaan('login');
  } catch (e) {
    keadaan('login');
    el('adm-login-err').textContent =
      'Tidak bisa memeriksa sesi. ' + terjemah(e.message || String(e));
  }
}

el('adm-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const tombol = el('adm-masuk');
  const galat = el('adm-login-err');
  galat.textContent = '';
  tombol.disabled = true;
  tombol.textContent = 'Masuk...';

  const { data, error } = await supabase.auth.signInWithPassword({
    email: el('adm-email').value.trim(),
    password: el('adm-sandi').value,
  });

  tombol.disabled = false;
  tombol.textContent = 'Masuk';

  if (error) {
    galat.textContent = 'Gagal masuk. ' + terjemah(error.message);
    el('adm-email').focus();
    return;
  }
  el('adm-siapa').textContent = data.user.email;
  keadaan('panel');
  await muatPengaturan();
});

el('adm-keluar').addEventListener('click', async () => {
  // Pemantau yang dibiarkan hidup akan terus menengok situs dan menulis
  // pesan ke panel sesudah sesinya berakhir.
  hentikanPantau();
  await supabase.auth.signOut();
  keadaan('login');
});

mulai();
