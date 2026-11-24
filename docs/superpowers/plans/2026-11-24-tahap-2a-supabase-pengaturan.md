# Tahap 2a: Supabase, Login, Admin, Pengaturan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pemilik situs dapat mengubah tujuh nilai pengaturan lewat halaman admin di peramban, tanpa menyentuh git, dan perubahannya tayang di produksi dalam sekitar dua menit.

**Architecture:** Astro tetap statis. `getSite()` mengambil satu baris dari Supabase saat build, bukan saat pengunjung membuka halaman. Halaman `/admin` adalah halaman statis dengan bagian interaktif di peramban yang bicara langsung ke Supabase memakai kunci anon, dan seluruh penulisan dijaga aturan akses baris. Build ulang dipicu Database Webhook dari sisi server Supabase.

**Tech Stack:** Astro, `@supabase/supabase-js`, Supabase Postgres dan Auth, Vercel Deploy Hook, Python dan Playwright untuk gerbang.

## Global Constraints

- Repo `https://github.com/mihitz21-dot/dhmakeupwebsite`, PUBLIK, branch `main`. Produksi: `https://dhmakeupwebsite.vercel.app`
- Lokasi: `/d/Imam/Projects/dhmakeupwebsite`. Shell Git Bash di Windows.
- Seluruh `git config` memakai `--local`. JANGAN `--replace-all` pada `credential.helper`, kunci itu sengaja punya dua nilai.
- `core.autocrlf=true` ada di config system. JANGAN membandingkan byte berkas disk melawan sumber lain, itu gagal palsu.
- Jangan menyunting `src/styles/site.css` dan `src/scripts/site.js`.
- Tidak boleh ada em dash (tanda pisah panjang, U+2014) di berkas yang dihasilkan.
- Dua environment variable, keduanya publik secara desain: `PUBLIC_SUPABASE_URL` dan `PUBLIC_SUPABASE_ANON_KEY`. Kunci `service_role` TIDAK dipakai dan tidak boleh dipasang di mana pun.
- Alamat Deploy Hook bersifat rahasia. Tidak boleh masuk repo, peramban, maupun laporan.
- Sebelum membandingkan apa pun: matikan server lama, hapus `dist`, build ulang. Hasil "identik" palsu pernah terjadi karena server usang.
- Kalau `pkill` tidak ada: `Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%http.server%'" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`

### Invarian yang masih berlaku SELAMA tabel pengaturan kosong

| halaman | h1 | section | .ph | kata |
|---|---|---|---|---|
| index | 1 | 6 | 10 | 637 |
| kontak | 1 | 4 | 0 | 484 |
| layanan | 1 | 5 | 0 | 704 |
| paket | 1 | 5 | 0 | 614 |
| portofolio | 1 | 3 | 9 | 310 |
| tentang | 1 | 5 | 1 | 518 |
| ulasan | 1 | 4 | 0 | 325 |

Begitu nilai sungguhan masuk, angka kata BERGESER dan itu diinginkan. Invarian kata dipensiunkan setelah Task 8.

---

## Struktur Berkas

| Berkas | Tanggung jawab |
|---|---|
| `src/lib/supabase.ts` | Membuat klien Supabase, gagal keras kalau env kosong |
| `src/data/site.ts` | `getSite()` mengambil pengaturan dari Supabase |
| `src/layouts/Base.astro` | Tambahan satu meta penanda waktu build |
| `src/pages/admin.astro` | Kerangka halaman admin, `noindex` |
| `src/scripts/admin.js` | Seluruh logika admin: sesi, login, muat, simpan, pantau build |
| `src/styles/admin.css` | Gaya khusus admin, terpisah dari `site.css` yang tidak boleh disentuh |
| `tools/verify/check_keamanan.py` | Tiga pembuktian keamanan |
| `.env.example` | Contoh nama variabel, tanpa nilai |

---

## Task 1: Verifikasi penyiapan Supabase

**Files:** tidak ada perubahan kode.

**Interfaces:**
- Produces: tabel `pengaturan` berisi satu baris, RLS aktif, pendaftaran mati, webhook terpasang.

Langkah dashboard dikerjakan pemilik repo mengikuti `docs/supabase-setup.md`. Task ini memverifikasi hasilnya, bukan mengerjakannya.

- [ ] **Step 1: Pastikan env lokal ada**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
test -f .env && echo "ada, $(wc -c < .env) byte" || echo "BELUM ADA, minta pemilik repo membuatnya"
grep -c "PUBLIC_SUPABASE_URL\|PUBLIC_SUPABASE_ANON_KEY" .env
git check-ignore -v .env
```

Expected: berkas ada, dua nama variabel terbaca, dan git mengabaikannya. JANGAN menampilkan isi berkas.

- [ ] **Step 2: Tabel ada dan berisi tepat satu baris**

```bash
set -a; . ./.env; set +a
curl -s "$PUBLIC_SUPABASE_URL/rest/v1/pengaturan?select=id,area" \
  -H "apikey: $PUBLIC_SUPABASE_ANON_KEY" | head -c 400; echo
```

Expected: JSON berisi satu objek dengan `id: 1` dan `area` berisi empat kota.

- [ ] **Step 3: Tulis hasilnya ke laporan, lalu lanjut**

Kalau Step 2 memberi array kosong, galat, atau lebih dari satu baris, berhenti dan laporkan. Jangan memperbaiki sendiri lewat SQL tanpa memberi tahu.

---

## Task 2: Klien Supabase dan getSite dari basis data

**Files:**
- Create: `src/lib/supabase.ts`, `.env.example`
- Modify: `src/data/site.ts`, `package.json`

**Interfaces:**
- Produces: `supabase` client, dan `getSite()` yang mengambil kontak dari basis data. Bentuk `Site` TIDAK berubah, sehingga tujuh halaman tidak disentuh.

- [ ] **Step 1: Pasang pustaka**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
npm install @supabase/supabase-js
node -e "console.log(require('./package.json').dependencies['@supabase/supabase-js'])"
```

Catat versi yang terpasang di laporan. Jangan menebak nomor versi.

- [ ] **Step 2: Tulis `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY belum diisi. ' +
    'Isi berkas .env di akar project, dan Environment Variables di Vercel.'
  );
}

export const supabase = createClient(url, key);
```

Gagal keras disengaja. Build yang jalan tanpa konfigurasi akan menghasilkan situs tanpa kontak, dan itu lebih buruk daripada build yang gagal.

- [ ] **Step 3: Tulis `.env.example`**

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

Pastikan `.gitignore` tidak ikut mengabaikan berkas ini. Pola `.env.*` akan menangkapnya, jadi tambahkan pengecualian:

```gitignore
!.env.example
```

- [ ] **Step 4: Ubah `getSite()` di `src/data/site.ts`**

Ganti badan fungsinya saja. Antarmuka `Site`, `Paket`, `Tambahan`, serta nilai `nav`, `paket`, dan `tambahan` TIDAK berubah.

```ts
import { supabase } from '../lib/supabase';

export async function getSite(): Promise<Site> {
  const { data, error } = await supabase
    .from('pengaturan')
    .select('whatsapp, instagram, email, jam_operasional, dp, pembatalan, area')
    .eq('id', 1)
    .single();

  if (error) {
    throw new Error('Gagal mengambil pengaturan dari Supabase: ' + error.message);
  }
  if (!data) {
    throw new Error('Baris pengaturan id=1 tidak ditemukan.');
  }
  if (!data.area || data.area.length === 0) {
    throw new Error('Kolom area kosong. Isi dulu lewat admin atau SQL.');
  }

  return {
    nama: "DH Makeup Studio",
    area: data.area,
    kontak: {
      whatsapp: data.whatsapp,
      instagram: data.instagram,
      email: data.email,
      jamOperasional: data.jam_operasional,
    },
    kebijakan: { dp: data.dp, pembatalan: data.pembatalan },
    nav: [ /* TIDAK BERUBAH, salin dari versi sekarang */ ],
    paket: [ /* TIDAK BERUBAH */ ],
    tambahan: [ /* TIDAK BERUBAH */ ],
  };
}
```

Ketiga pemeriksaan galat itu disengaja. Semuanya menggagalkan build alih-alih diam-diam menghasilkan situs yang cacat.

- [ ] **Step 5: Build dan jalankan gerbang**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
rm -rf dist && npm run build
python tools/verify/check_static.py dist
```

Expected: build sukses 7 halaman, `check_static: 0 masalah`. Jumlah kata harus tetap sama, karena nilai kontak di basis data masih `null` sehingga cip placeholder tetap tergambar.

- [ ] **Step 6: Buktikan build GAGAL kalau Supabase tidak terjangkau**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
PUBLIC_SUPABASE_URL=https://salah.invalid npm run build 2>&1 | tail -5; echo "exit=${PIPESTATUS[0]}"
```

Expected: build gagal dengan pesan yang menyebut Supabase, dan kode keluar selain 0. Kalau build malah SUKSES, itu cacat: perbaiki supaya galat benar-benar melempar.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example src/lib src/data
git commit -m "feat: getSite mengambil pengaturan dari Supabase saat build"
```

---

## Task 3: Penanda waktu build

**Files:**
- Modify: `src/layouts/Base.astro`

**Interfaces:**
- Produces: `<meta name="dibangun" content="...">` di setiap halaman. Dipakai Task 6 untuk memastikan build ulang selesai.

- [ ] **Step 1: Tambahkan meta di `Base.astro`**

Di frontmatter:

```ts
const dibangun = new Date().toISOString();
```

Di dalam `<head>`, tepat setelah meta description:

```astro
<meta name="dibangun" content={dibangun}>
```

- [ ] **Step 2: Buktikan nilainya berubah tiap build**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
rm -rf dist && npm run build >/dev/null 2>&1
A=$(grep -o 'name="dibangun" content="[^"]*"' dist/index.html)
sleep 2
rm -rf dist && npm run build >/dev/null 2>&1
B=$(grep -o 'name="dibangun" content="[^"]*"' dist/index.html)
echo "build 1: $A"; echo "build 2: $B"
[ "$A" != "$B" ] && echo "BERUBAH, benar" || echo "SAMA, salah"
```

Expected: `BERUBAH, benar`. Penanda yang tidak berubah tidak berguna.

- [ ] **Step 3: Buktikan penanda tidak merusak gerbang**

```bash
python tools/verify/check_static.py dist
```

Expected: `0 masalah`. Jumlah kata tidak boleh bergeser, karena `meta` adalah tag dan tidak terhitung.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat: penanda waktu build di setiap halaman"
```

---

## Task 4: Halaman admin, bagian login

**Files:**
- Create: `src/pages/admin.astro`, `src/scripts/admin.js`, `src/styles/admin.css`

**Interfaces:**
- Produces: `/admin` dengan tiga keadaan awal: memuat, belum login, login gagal. Setelah login menampilkan penanda sementara, yang diisi Task 5.

- [ ] **Step 1: Tulis `src/pages/admin.astro`**

```astro
---
import '../styles/site.css';
import '../styles/admin.css';
---
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Admin | DH Makeup Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap">
</head>
<body>
<main id="main" class="wrap band band--tight">
  <h1 class="h2">Pengaturan situs</h1>

  <div id="adm-memuat" class="outcome" data-state="empty">
    <p class="outcome__title">Memeriksa sesi</p>
  </div>

  <form id="adm-login" class="form" hidden novalidate style="max-width:24rem;margin-top:2rem;">
    <div class="field">
      <label for="adm-email">Email</label>
      <input type="email" id="adm-email" name="email" autocomplete="username" aria-describedby="adm-login-err">
    </div>
    <div class="field">
      <label for="adm-sandi">Kata sandi</label>
      <input type="password" id="adm-sandi" name="sandi" autocomplete="current-password" aria-describedby="adm-login-err">
    </div>
    <p class="field__error" id="adm-login-err" role="alert"></p>
    <div class="btn-row">
      <button class="btn btn--primary" type="submit" id="adm-masuk">Masuk</button>
    </div>
  </form>

  <section id="adm-panel" hidden style="margin-top:2rem;">
    <p class="fine">Masuk sebagai <span id="adm-siapa"></span>.
      <button class="btn btn--quiet" type="button" id="adm-keluar">Keluar</button></p>
    <div id="adm-isi"></div>
  </section>
</main>
<script src="../scripts/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Tulis `src/styles/admin.css`**

```css
/* Gaya khusus admin. site.css tidak boleh disentuh, jadi yang khas admin
   tinggal di sini. */
.adm-baris { display: grid; gap: var(--s-2); margin-bottom: var(--s-2); }
@media (min-width: 46rem) { .adm-baris { grid-template-columns: 1fr 1fr; } }
.adm-bar { position: sticky; bottom: 0; background: var(--canvas);
  border-top: 1px solid var(--rule); padding: var(--s-2) 0; margin-top: var(--s-3); }
```

- [ ] **Step 3: Tulis bagian login di `src/scripts/admin.js`**

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

const el = (id) => document.getElementById(id);
const tampil = (id, ya) => { el(id).hidden = !ya; };

function keadaan(nama) {
  tampil('adm-memuat', nama === 'memuat');
  tampil('adm-login', nama === 'login');
  tampil('adm-panel', nama === 'panel');
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
```

Fungsi `muatPengaturan()` dibuat di Task 5. Untuk sekarang buat sementara:

```js
async function muatPengaturan() {
  el('adm-isi').innerHTML = '<p class="fine">Formulir pengaturan dibuat di Task 5.</p>';
}
```

- [ ] **Step 4: Build dan periksa**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
rm -rf dist && npm run build
test -f dist/admin/index.html && echo "halaman admin dibangun" || echo "GAGAL"
grep -c 'noindex' dist/admin/index.html
python tools/verify/check_static.py dist
```

Expected: halaman ada, `noindex` ada 1, dan `check_static: 0 masalah`. Catatan: `check_static` hanya memeriksa tujuh halaman publik, jadi `/admin` tidak ikut dinilai invariannya. Itu benar.

- [ ] **Step 5: Uji login di peramban**

```bash
(cd dist && python -m http.server 8777 >/dev/null 2>&1 &) ; sleep 2
```

Dengan Playwright, buka `http://127.0.0.1:8777/admin`, lalu buktikan:
- keadaan awal memperlihatkan formulir login, bukan panel
- kata sandi salah memunculkan pesan galat yang menyebut sebabnya, dan formulir tetap terlihat
- kata sandi benar memperlihatkan panel dan alamat email

Tulis hasil ketiganya di laporan. Pakai akun yang dibuat pemilik repo. Jangan menulis kata sandinya ke laporan maupun ke kode.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin.astro src/scripts/admin.js src/styles/admin.css
git commit -m "feat: halaman admin dengan login email dan kata sandi"
```

---

## Task 5: Formulir tujuh kolom

**Files:**
- Modify: `src/scripts/admin.js`

**Interfaces:**
- Consumes: sesi dari Task 4
- Produces: `muatPengaturan()` dan penyimpanan, dengan keadaan memuat, siap, menyimpan, tersimpan, dan gagal.

- [ ] **Step 1: Ganti `muatPengaturan()` dengan versi sungguhan**

```js
const KOLOM = [
  ['whatsapp',        'Nomor WhatsApp',        'tel'],
  ['instagram',       'Username Instagram',    'text'],
  ['email',           'Alamat email',          'email'],
  ['jam_operasional', 'Jam balas',             'text'],
  ['dp',              'Nominal DP',            'text'],
  ['pembatalan',      'Kebijakan pembatalan',  'text'],
];

async function muatPengaturan() {
  const isi = el('adm-isi');
  isi.innerHTML = '<p class="fine">Mengambil pengaturan...</p>';

  const { data, error } = await supabase
    .from('pengaturan').select('*').eq('id', 1).single();

  if (error) {
    isi.innerHTML = '<div class="outcome" data-state="error">' +
      '<p class="outcome__title">Gagal mengambil pengaturan</p>' +
      '<p class="outcome__text">' + error.message + '</p></div>';
    return;
  }

  const baris = KOLOM.map(([k, label, tipe]) =>
    '<div class="field"><label for="f-' + k + '">' + label + '</label>' +
    '<input type="' + tipe + '" id="f-' + k + '" name="' + k + '" value="' +
    (data[k] === null ? '' : String(data[k]).replace(/"/g, '&quot;')) + '"></div>'
  ).join('');

  isi.innerHTML =
    '<form id="adm-form" class="form" novalidate>' +
      '<div class="adm-baris">' + baris + '</div>' +
      '<div class="field"><label for="f-area">Area layanan, pisahkan dengan koma</label>' +
      '<input type="text" id="f-area" name="area" value="' +
      (data.area || []).join(', ') + '"></div>' +
      '<div class="adm-bar"><div class="btn-row">' +
      '<button class="btn btn--primary" type="submit" id="adm-simpan">Simpan</button>' +
      '</div></div>' +
    '</form>' +
    '<div id="adm-hasil" class="outcome" data-state="empty" role="status" aria-live="polite">' +
    '<p class="outcome__title">Belum ada perubahan</p></div>';

  el('adm-form').addEventListener('submit', simpan);
}
```

Kolom kosong ditulis sebagai string kosong, dan saat menyimpan dikembalikan menjadi `null`. Itu menjaga aturan "null berarti belum diisi" yang dipakai `Kontak.astro`.

- [ ] **Step 2: Tulis fungsi `simpan()`**

```js
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
    hasil.setAttribute('data-state', 'error');
    hasil.innerHTML = '<p class="outcome__title">Area layanan tidak boleh kosong</p>' +
      '<p class="outcome__text">Build akan gagal kalau area kosong.</p>';
    el('f-area').focus();
    return;
  }

  tombol.disabled = true;
  hasil.setAttribute('data-state', 'empty');
  hasil.innerHTML = '<p class="outcome__title">Menyimpan</p>';

  const { error } = await supabase
    .from('pengaturan').update(muatan).eq('id', 1);

  tombol.disabled = false;

  if (error) {
    hasil.setAttribute('data-state', 'error');
    hasil.innerHTML = '<p class="outcome__title">Gagal menyimpan</p>' +
      '<p class="outcome__text">' + error.message + '</p>';
    return;
  }

  hasil.setAttribute('data-state', 'ready');
  hasil.innerHTML = '<p class="outcome__title">Tersimpan</p>' +
    '<p class="outcome__text">Situs sedang dibangun ulang, sekitar dua menit.</p>';
  pantauBuild(hasil);
}
```

Fungsi `pantauBuild()` dibuat di Task 6. Sementara ini buat kosong:

```js
function pantauBuild() {}
```

- [ ] **Step 3: Uji keempat keadaan di peramban**

Dengan Playwright, setelah login:
- formulir terisi nilai sekarang, tujuh kolom ada
- mengosongkan area lalu menyimpan memunculkan galat dan TIDAK mengirim apa pun
- menyimpan nilai sah memunculkan "Tersimpan"
- nilai benar-benar berubah di basis data, dibuktikan dengan membacanya ulang lewat REST API

Kembalikan nilainya ke semula setelah uji, supaya tabel tetap kosong untuk gerbang berikutnya.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/admin.js
git commit -m "feat: formulir tujuh kolom pengaturan di admin"
```

---

## Task 6: Pantau build ulang

**Files:**
- Modify: `src/scripts/admin.js`

- [ ] **Step 1: Tulis `pantauBuild()`**

```js
async function pantauBuild(hasil) {
  const situs = location.origin;
  const awal = await ambilPenanda(situs);
  const mulai = Date.now();
  const batas = 5 * 60 * 1000;

  const timer = setInterval(async () => {
    if (Date.now() - mulai > batas) {
      clearInterval(timer);
      hasil.innerHTML = '<p class="outcome__title">Tersimpan, tapi build belum terdeteksi</p>' +
        '<p class="outcome__text">Perubahan sudah masuk basis data. ' +
        'Periksa tab Deployments di Vercel.</p>';
      return;
    }
    const kini = await ambilPenanda(situs);
    if (kini && kini !== awal) {
      clearInterval(timer);
      hasil.innerHTML = '<p class="outcome__title">Sudah tayang</p>' +
        '<p class="outcome__text">Situs selesai dibangun ulang pada ' + kini + '.</p>';
    }
  }, 10000);
}

async function ambilPenanda(situs) {
  try {
    const r = await fetch(situs + '/?t=' + Date.now(), { cache: 'no-store' });
    const teks = await r.text();
    const m = teks.match(/name="dibangun" content="([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
```

Batas lima menit disengaja. Tanpa itu halaman akan menengok selamanya kalau build gagal, dan pemilik situs tidak pernah diberi tahu apa pun.

- [ ] **Step 2: Uji di produksi, bukan lokal**

Pemantauan ini hanya bermakna terhadap situs sungguhan. Ujinya dilakukan di Task 8 setelah deploy.

Untuk sekarang buktikan fungsinya tidak merusak apa pun secara lokal: build, buka `/admin`, login, simpan, dan pastikan tidak ada error konsol.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/admin.js
git commit -m "feat: admin memantau penanda build sampai perubahan tayang"
```

---

## Task 7: Pembuktian keamanan

**Files:**
- Create: `tools/verify/check_keamanan.py`

**Interfaces:**
- Produces: skrip yang membuktikan tiga hal yang kalau salah membuat siapa pun bisa mengubah isi situs.

- [ ] **Step 1: Tulis `tools/verify/check_keamanan.py`**

```python
"""Tiga pembuktian keamanan Tahap 2a. Dijalankan terhadap project Supabase."""
import os, sys, json, urllib.request, urllib.error

URL = os.environ.get("PUBLIC_SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("PUBLIC_SUPABASE_ANON_KEY", "")

def panggil(metode, jalur, muatan=None, token=None):
    req = urllib.request.Request(URL + jalur, method=metode)
    req.add_header("apikey", KEY)
    req.add_header("Authorization", "Bearer " + (token or KEY))
    req.add_header("Content-Type", "application/json")
    data = json.dumps(muatan).encode() if muatan is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=20) as r:
            return r.status, r.read().decode()[:300]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

def main():
    if not URL or not KEY:
        print("GAGAL: PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY kosong")
        return 1

    gagal = []

    # 1. update tanpa login harus ditolak
    kode, isi = panggil("PATCH", "/rest/v1/pengaturan?id=eq.1",
                        {"whatsapp": "DIBAJAK"})
    if kode < 400:
        gagal.append(f"update tanpa login DITERIMA (HTTP {kode}). Ini lubang serius.")
    else:
        print(f"OK  update tanpa login ditolak (HTTP {kode})")

    # 2. pendaftaran akun baru harus ditolak
    kode, isi = panggil("POST", "/auth/v1/signup",
                        {"email": "uji-keamanan@contoh.invalid",
                         "password": "KataSandiUji12345"})
    if kode < 400:
        gagal.append(f"pendaftaran DITERIMA (HTTP {kode}). Matikan di Authentication.")
    else:
        print(f"OK  pendaftaran ditolak (HTTP {kode})")

    # 3. insert harus ditolak
    kode, isi = panggil("POST", "/rest/v1/pengaturan", {"id": 2})
    if kode < 400:
        gagal.append(f"insert DITERIMA (HTTP {kode}). Tidak boleh ada baris kedua.")
    else:
        print(f"OK  insert ditolak (HTTP {kode})")

    # 4. delete harus ditolak
    kode, isi = panggil("DELETE", "/rest/v1/pengaturan?id=eq.1")
    if kode < 400:
        gagal.append(f"delete DITERIMA (HTTP {kode}). Baris tunggal bisa hilang.")
    else:
        print(f"OK  delete ditolak (HTTP {kode})")

    for g in gagal:
        print("GAGAL", g)
    print(f"check_keamanan: {len(gagal)} masalah")
    return 1 if gagal else 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Jalankan dan pastikan keempatnya lulus**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
set -a; . ./.env; set +a
python tools/verify/check_keamanan.py
```

Expected: empat baris `OK` dan `check_keamanan: 0 masalah`.

Kalau ada yang `GAGAL`, **jangan lanjut ke Task 8**. Laporkan, karena artinya siapa pun di internet bisa mengubah isi situs.

- [ ] **Step 3: Buktikan skripnya bisa gagal**

Jalankan ulang dengan `PUBLIC_SUPABASE_ANON_KEY` yang sengaja salah. Skrip harus melaporkan masalah, bukan diam-diam lulus. Tulis hasilnya di laporan.

- [ ] **Step 4: Tambahkan ke README dan commit**

Tambahkan satu baris di bagian Verifikasi README yang menyebut skrip ini dan bahwa ia butuh `.env`.

```bash
git add tools/verify/check_keamanan.py README.md
git commit -m "test: tiga pembuktian keamanan aturan akses baris"
```

---

## Task 8: Deploy dan pembuktian rantai lengkap

**Files:** tidak ada perubahan kode, kecuali perbaikan dari temuan.

- [ ] **Step 1: Pemilik repo memasang environment variable di Vercel**

Settings, Environment Variables, tambahkan `PUBLIC_SUPABASE_URL` dan `PUBLIC_SUPABASE_ANON_KEY` untuk Production dan Preview, dengan nilai yang sama seperti `.env` lokal.

Langkah ini dikerjakan pemilik repo. Berhenti dan minta konfirmasi sebelum lanjut.

- [ ] **Step 2: Push dan pastikan build produksi lulus**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git push
```

Lalu tunggu dan periksa:

```bash
for i in 1 2 3 4 5 6 7 8 9; do
  sleep 20
  P=$(curl -s --max-time 20 "https://dhmakeupwebsite.vercel.app/?t=$(date +%s)" \
      | grep -o 'name="dibangun" content="[^"]*"')
  echo "$((i*20))s: $P"
done
```

Expected: penanda muncul. Kalau tidak pernah muncul, build produksi gagal, kemungkinan environment variable belum terpasang.

- [ ] **Step 3: Gerbang terhadap produksi**

```bash
python tools/verify/check_browser.py https://dhmakeupwebsite.vercel.app
python tools/verify/check_interactions.py https://dhmakeupwebsite.vercel.app
```

Expected: keduanya 0 masalah, 0 error konsol.

- [ ] **Step 4: Pembuktian rantai lengkap, ujung ke ujung**

Buka `https://dhmakeupwebsite.vercel.app/admin`, login, isi nomor WhatsApp dengan nomor sungguhan, simpan.

Catat waktunya, lalu buktikan:
- halaman admin akhirnya menampilkan "Sudah tayang"
- `https://dhmakeupwebsite.vercel.app/kontak` memuat nomor itu sebagai tautan `wa.me`, bukan cip placeholder
- cip `[NOMOR WHATSAPP]` tidak ada lagi di satu pun dari tujuh halaman

```bash
for h in "" kontak layanan paket portofolio tentang ulasan; do
  n=$(curl -s "https://dhmakeupwebsite.vercel.app/$h" | grep -c 'NOMOR WHATSAPP')
  w=$(curl -s "https://dhmakeupwebsite.vercel.app/$h" | grep -c 'wa.me')
  printf "  /%-12s cip=%s tautan=%s\n" "$h" "$n" "$w"
done
```

Expected: `cip=0` di semua halaman, dan `tautan` lebih dari 0 di halaman yang memang memuat kontak.

- [ ] **Step 5: Pensiunkan invarian jumlah kata**

Setelah Step 4, jumlah kata memang sudah bergeser dan itu benar. Hapus kunci `kata` dari tabel `INVARIAN` di `check_static.py`, dan tambahkan komentar yang menjelaskan kenapa: invarian itu bertugas membuktikan porting Tahap 1 tidak mengubah apa pun, dan tugasnya selesai begitu data sungguhan masuk.

Pemeriksaan `h1`, `section`, `.ph`, tautan mati, em dash, dan struktur TETAP berlaku.

```bash
python tools/verify/check_static.py dist
```

Expected: 0 masalah.

- [ ] **Step 6: Commit dan push**

```bash
git add tools/verify/check_static.py docs/
git commit -m "chore: pensiunkan invarian jumlah kata setelah data sungguhan masuk"
git push
```

---

## Self-Review

**Cakupan spec.** Tiap bagian spec ada task-nya: skema dan keamanan diverifikasi di Task 1 dan dibuktikan di Task 7; `getSite()` dari basis data di Task 2; penanda build di Task 3; halaman admin dan keadaannya di Task 4, 5, dan 6; environment variable di Task 2 dan Task 8; syarat lulus di Task 7 dan 8; pensiun invarian di Task 8 Step 5.

**Catatan yang ditemukan saat menulis rencana ini dan sudah ditangani di dalamnya:**

1. Pola `.env.*` di `.gitignore` akan ikut mengabaikan `.env.example`. Ditangani di Task 2 Step 3 dengan pengecualian `!.env.example`.
2. Kolom `area` bertipe `not null default '{}'`, sehingga bisa berisi array kosong dan menghasilkan situs tanpa daftar kota. Ditangani dua kali: `getSite()` menggagalkan build, dan formulir admin menolak menyimpan area kosong.
3. Nilai kosong di formulir harus kembali menjadi `null`, bukan string kosong, supaya `Kontak.astro` tetap menggambar cip placeholder dan bukan tautan kosong. Ditangani `kosongJadiNull()`.
4. `pantauBuild()` tanpa batas waktu akan menengok selamanya kalau build gagal. Diberi batas lima menit dengan pesan yang mengarahkan ke tab Deployments.
5. Penanda build harus dibuktikan BERUBAH antar build, bukan sekadar ada. Tanpa itu penandanya tidak berguna. Ditangani Task 3 Step 2.
6. `check_keamanan.py` sendiri harus dibuktikan bisa gagal, sama seperti uji mutasi di Tahap 1. Ditangani Task 7 Step 3.

**Konsistensi tipe.** `getSite(): Promise<Site>` tidak berubah bentuknya, sehingga tujuh halaman tidak disentuh. `KOLOM` di Task 5 memakai nama kolom basis data persis seperti skema di spec. `ambilPenanda()` mencari pola meta yang sama persis dengan yang ditulis Task 3.

**Tanpa placeholder.** Nilai yang sengaja dikosongkan hanya `nav`, `paket`, dan `tambahan` di Task 2 Step 4, dan itu karena isinya memang disalin apa adanya dari berkas yang sudah ada, bukan ditulis baru.
