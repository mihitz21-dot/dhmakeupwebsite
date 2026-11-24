import { supabase } from '../lib/supabase';

const el = (id) => document.getElementById(id);
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
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    el('adm-siapa').textContent = data.session.user.email;
    keadaan('panel');
    await muatPengaturan();
  } else {
    keadaan('login');
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
    galat.textContent = 'Gagal masuk: ' + error.message;
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
