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

async function muatPengaturan() {
  el('adm-isi').innerHTML = '<p class="fine">Formulir pengaturan dibuat di Task 5.</p>';
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
  await supabase.auth.signOut();
  keadaan('login');
});

mulai();
