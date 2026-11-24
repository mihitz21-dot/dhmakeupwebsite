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
  try {
    const res = await supabase.from('pengaturan').update(muatan).eq('id', 1);
    galat = res.error;
  } catch (err) {
    galat = err;
  }

  tombol.disabled = false;

  if (galat) {
    tulisKabar(hasil, 'error', 'Gagal menyimpan',
      terjemah(galat.message || String(galat)));
    return;
  }

  tulisKabar(hasil, 'ready', 'Tersimpan',
    'Situs sedang dibangun ulang, sekitar dua menit.');
  pantauBuild(hasil);
}

// Diisi di Task 6.
function pantauBuild() {}

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
  await supabase.auth.signOut();
  keadaan('login');
});

mulai();
