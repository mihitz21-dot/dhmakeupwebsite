# Tahap 2b-1: Foto pada dua puluh posisi tetap, Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pemilik situs dapat mengisi dan mengganti foto pada kedua puluh posisi yang ada lewat halaman admin, tanpa menyentuh git, dan perubahannya tayang di produksi dalam waktu sekitar dua menit.

**Architecture:** Foto disimpan di Supabase Storage dan dicatat di tabel `foto` berkunci `slot`. Peramban mengecilkan foto sebelum mengunggah. Satu langkah sebelum build mengunduh semua foto ke `public/assets/foto/`, sehingga pengunjung mengambilnya dari Vercel dan tidak pernah menyentuh Supabase. `PhotoSlot.astro` menerima `slot` dan mencari sendiri data posisinya.

**Tech Stack:** Astro 7, `@supabase/supabase-js` 2, Supabase Postgres dan Storage, Vercel Deploy Hook, Python dan Playwright untuk gerbang, Node untuk uji logika.

## Global Constraints

- `src/styles/site.css` dan `src/scripts/site.js` TIDAK BOLEH DISUNTING. Keduanya wajib tetap identik byte demi byte dengan situs lama. Periksa dengan `git status --porcelain` sebelum setiap commit.
- Jangan memakai em dash (tanda pisah panjang, U+2014) di mana pun, termasuk komentar dan dokumen.
- Seluruh teks yang dilihat pemilik situs berbahasa Indonesia, termasuk pesan galat.
- Kunci `service_role` dan `sb_secret_` tidak dipakai dan tidak boleh ada di repo.
- Alamat Deploy Hook rahasia: tidak boleh masuk repo, peramban, maupun laporan.
- Kata sandi akun admin hanya dipegang pemilik situs. Jangan meminta, mengarang, atau menuliskannya ke berkas mana pun termasuk `.env`.
- Setiap penjaga baru wajib dibuktikan bisa MERAH lewat uji mutasi. Penjaga yang tidak pernah bisa gagal lebih buruk daripada tidak ada penjaga.
- Jangan mengubah kode agar sebuah pemeriksaan lolos kalau sebenarnya pemeriksaannya yang perlu dibicarakan. Laporkan.
- `rm -rf dist` boleh gagal dengan `Device or resource busy` kalau ada server HTTP memegang folder itu. Jangan membunuh proses yang bukan kamu jalankan; `npm run build` saja sudah menulis ulang `dist`.
- Setiap task yang mengklaim menghasilkan sesuatu WAJIB punya langkah yang mengukurnya. Di Tahap 2a, Task 1 mengklaim menghasilkan "webhook terpasang" tanpa satu pun langkah memeriksanya, dan baru ketahuan tujuh task kemudian.

## Struktur berkas

| Berkas | Tanggung jawab |
|---|---|
| `src/scripts/admin-umum.js` | BARU. Penolong yang dipakai bersama: `terjemah`, `tulisKabar`, `kabarPenuh`, `tayang`, `ambilPenanda`, `pantauBuild`, `hentikanPantau` |
| `src/scripts/admin.js` | Kerangka, login, dan formulir pengaturan. Mengimpor dari `admin-umum.js` |
| `src/scripts/admin-foto.js` | BARU. Daftar dua puluh posisi, unggah, hapus |
| `src/scripts/kecilkan.js` | BARU. Pengecilan gambar di peramban. Satu fungsi murni agar bisa diuji sendiri |
| `src/data/foto.ts` | BARU. `getFoto()` mengambil seluruh baris tabel `foto` saat build |
| `src/components/PhotoSlot.astro` | Menerima `slot`, memilih bingkai dari ukuran foto |
| `tools/ambil-foto.mjs` | BARU. Langkah sebelum build, mengunduh foto ke `public/assets/foto/` |
| `tools/verify/check_foto.py` | BARU. Penjaga alt, width/height, dan ukuran berkas |
| `tools/verify/check_keamanan_foto.py` | BARU. Pembuktian keamanan tabel dan bucket |
| `tools/verify/uji_kecilkan.mjs` | BARU. Uji logika pengecilan |
| `docs/supabase-setup-2b.md` | BARU. Tutorial penyiapan untuk pemilik situs |

---

## Task 1: Penyiapan Supabase dan verifikasinya

**Files:**
- Create: `docs/supabase-setup-2b.md`

**Interfaces:**
- Produces: tabel `foto` berisi dua puluh baris dengan `berkas` null, RLS aktif, bucket `foto` ada, webhook kedua terpasang.

Langkah dashboard dikerjakan pemilik situs. Task ini MENULIS tutorialnya dan MEMVERIFIKASI hasilnya. Tidak boleh mengklaim sesuatu terpasang tanpa mengukurnya.

- [ ] **Step 1: Tulis `docs/supabase-setup-2b.md`**

Isinya empat bagian. Bagian SQL harus satu blok yang bisa disalin sekali jalan, tidak dipotong-potong, karena memotongnya di Tahap 2a membuat GRANT terlewat dan build gagal dengan 401.

````markdown
# Menyiapkan Supabase untuk Tahap 2b-1

## 1. Tabel foto, izin, dan dua puluh barisnya

Buka **SQL Editor**, tempel seluruh blok di bawah sekaligus, lalu Run.

```sql
create table foto (
  slot        text primary key,
  berkas      text,
  alt         text,
  lebar       int,
  tinggi      int,
  diperbarui  timestamptz not null default now()
);

-- Izin tabel. Ini LAPIS TERPISAH dari aturan akses baris, dan wajib ada.
-- Tanpa baris ini, proses build gagal membaca dan situs tidak bisa dibangun.
grant select on public.foto to anon;
grant select, update on public.foto to authenticated;

alter table foto enable row level security;

create policy "publik boleh baca" on foto
  for select using (true);

create policy "login boleh ubah" on foto
  for update to authenticated using (true) with check (true);

create trigger foto_diperbarui
  before update on foto
  for each row execute function set_diperbarui();

insert into foto (slot) values
  ('hero'),
  ('acara-01'), ('acara-02'), ('acara-03'), ('acara-04'), ('acara-05'),
  ('beranda-01'), ('beranda-02'), ('beranda-03'), ('beranda-04'),
  ('plat-01'), ('plat-02'), ('plat-03'), ('plat-04'), ('plat-05'),
  ('plat-06'), ('plat-07'), ('plat-08'), ('plat-09'),
  ('perias');
```

Fungsi `set_diperbarui()` sudah dibuat di Tahap 2a, jadi tidak dibuat ulang.

## 2. Bucket penyimpanan

**Storage**, **New bucket**. Nama `foto`, dan **Public bucket** dinyalakan.

Public di sini berarti siapa pun boleh MEMBACA. Menulis tetap tertutup, dan itu
diatur di langkah berikutnya.

## 3. Izin menulis ke bucket

Kembali ke **SQL Editor**, tempel seluruh blok ini sekaligus, lalu Run.

```sql
create policy "login boleh unggah foto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'foto');

create policy "login boleh ganti foto" on storage.objects
  for update to authenticated
  using (bucket_id = 'foto') with check (bucket_id = 'foto');

create policy "login boleh hapus foto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'foto');
```

Tanpa ketiganya, unggah dari halaman admin ditolak walau sudah login.

## 4. Webhook kedua

**Integrations**, **Database Webhooks**, **Create a new hook**.

| Kolom | Isi |
|---|---|
| Name | `bangun_ulang_situs_foto` |
| Table | `foto` |
| Events | centang **Update** saja |
| Type | **HTTP Request** |
| Method | **POST** |
| URL | alamat Deploy Hook yang sama dengan webhook pengaturan |

## Cara menguji semuanya benar

Dijalankan oleh agen di Task 1 Step 2, bukan oleh kamu.
````

- [ ] **Step 2: Verifikasi hasilnya, dan JANGAN mengklaim tanpa mengukur**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
set -a; . ./.env; set +a

echo "=== tabel foto: harus 20 baris, semua berkas null ==="
curl -s "$PUBLIC_SUPABASE_URL/rest/v1/foto?select=slot,berkas&order=slot" \
  -H "apikey: $PUBLIC_SUPABASE_ANON_KEY" \
  | python -c "import sys,json; d=json.load(sys.stdin); print('baris:',len(d)); print('berkas terisi:',sum(1 for r in d if r['berkas'])); print('slot:',[r['slot'] for r in d])"

echo "=== bucket foto ada dan boleh dibaca publik ==="
curl -s -o /dev/null -w "  HTTP %{http_code}\n" \
  "$PUBLIC_SUPABASE_URL/storage/v1/object/public/foto/tidak-ada.jpg"
```

Expected: 20 baris, 0 berkas terisi, dan kedua puluh kunci slot persis seperti di spec bagian 3.

Untuk bucket, KODE HTTP TIDAK BISA DIPAKAI MEMBEDAKAN. Sudah diukur: bucket yang tidak ada dan nama bucket yang dikarang sembarangan sama-sama membalas HTTP **400**. Yang membedakan hanya badan balasannya:

- badan memuat `Bucket not found` berarti bucket BELUM dibuat
- badan memuat `Object not found` atau sejenisnya berarti bucket SUDAH ada dan hanya berkasnya yang tidak ada, dan itu yang diharapkan

Jadi baca badan balasannya, jangan kodenya:

```bash
curl -s "$PUBLIC_SUPABASE_URL/storage/v1/object/public/foto/tidak-ada.jpg" | head -c 200; echo
```

Kalau memuat `Bucket not found`, berhenti dan minta pemilik situs membuat bucketnya.

- [ ] **Step 3: Verifikasi webhook kedua, dengan mengukur bukan menanya**

Webhook tidak bisa dibaca lewat kunci anon. Jadi buktikan secara fungsional nanti di Task 9, dan di sini CATAT saja bahwa belum terbukti. Jangan menulis "webhook terpasang" di laporan.

- [ ] **Step 4: Commit**

```bash
git add docs/supabase-setup-2b.md
git commit -m "docs: tutorial penyiapan Supabase untuk Tahap 2b-1"
```

---

## Task 2: Pindahkan penolong bersama ke admin-umum.js

**Files:**
- Create: `src/scripts/admin-umum.js`
- Modify: `src/scripts/admin.js`

**Interfaces:**
- Produces: `src/scripts/admin-umum.js` mengekspor `terjemah(pesan) -> string`, `tulisKabar(wadah, state, judul, teks) -> void`, `kabarPenuh(wadah, state, judul, teks) -> void`, `tayang(dibangun, diperbarui) -> boolean`, `ambilPenanda(situs) -> Promise<string|null>`, `pantauBuild(hasil, diperbarui) -> void`, `hentikanPantau() -> void`.

Ini pemindahan murni. TIDAK ADA perubahan perilaku. Jangan memperbaiki, merapikan, atau mengganti nama apa pun sambil memindahkan. Kalau kamu melihat sesuatu yang ingin diperbaiki, catat di laporan dan biarkan kodenya apa adanya.

- [ ] **Step 1: Catat keadaan sebelum**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
npm run build >/dev/null 2>&1
node tools/verify/uji_pantau.mjs src/scripts/admin.js | tail -1
wc -l src/scripts/admin.js
```

Catat keluarannya. `uji_pantau` harus `SEMUA LULUS` SEBELUM kamu menyentuh apa pun.

- [ ] **Step 2: Buat `src/scripts/admin-umum.js`**

Pindahkan tujuh fungsi berikut dari `admin.js` APA ADANYA, beserta komentar dan variabel modul `timerPantau` dan `sesiPantau` yang dipakai `pantauBuild` dan `hentikanPantau`: `terjemah` (dan konstanta `PESAN` yang dipakainya), `tulisKabar`, `kabarPenuh`, `tayang`, `ambilPenanda`, `pantauBuild`, `hentikanPantau`.

Tambahkan `export` di depan deklarasi masing-masing fungsi. Jangan mengubah isinya satu karakter pun.

- [ ] **Step 3: Sunting `src/scripts/admin.js`**

Hapus ketujuh fungsi itu beserta `PESAN`, `timerPantau`, dan `sesiPantau` dari `admin.js`, lalu tambahkan impor di bagian atas, tepat setelah impor `supabase`:

```js
import {
  terjemah, tulisKabar, kabarPenuh,
  pantauBuild, hentikanPantau,
} from './admin-umum.js';
```

Impor hanya yang benar-benar dipakai `admin.js`. Kalau `tayang` dan `ambilPenanda` ternyata tidak dipanggil langsung dari `admin.js`, jangan diimpor.

- [ ] **Step 4: Arahkan uji_pantau ke berkas yang baru**

`tools/verify/uji_pantau.mjs` mengambil `tayang` dan `ambilPenanda` dengan regex dari berkas yang diberikan sebagai argumen. Keduanya sekarang tinggal di `admin-umum.js`. Perbarui bagian cara pakai di komentar berkas itu dan di `tools/verify/README.md`, lalu jalankan:

```bash
node tools/verify/uji_pantau.mjs src/scripts/admin-umum.js
```

Expected: `SEMUA LULUS`, dua belas kasus.

Regex di berkas itu mencari `function tayang(dibangun, diperbarui) {` dan `async function ambilPenanda(situs) {`. Menambahkan `export ` di depannya membuat regex TIDAK cocok lagi dan tes akan berhenti dengan `GAGAL: fungsi tayang tidak ditemukan`. Perbaiki regexnya supaya menerima `export ` opsional, misalnya dengan `(?:export )?` di depan. Buktikan dengan menjalankannya, jangan diasumsikan.

- [ ] **Step 5: Gerbang**

```bash
npm run build
python tools/verify/check_static.py dist
node tools/verify/uji_bersih.mjs src/data/site.ts
node tools/verify/uji_pantau.mjs src/scripts/admin-umum.js
git status --porcelain src/styles/site.css src/scripts/site.js
```

Expected: build lulus, `check_static: 0 masalah`, kedua uji `SEMUA LULUS`, dan dua baris terakhir tidak mengeluarkan apa-apa.

- [ ] **Step 6: Buktikan perilaku admin tidak berubah**

Layani `dist` di port yang belum dipakai, JANGAN port 8080. Dengan Playwright buka `/admin` dan buktikan:

- nol galat konsol saat halaman dimuat
- formulir login terlihat, panel tidak
- kata sandi karangan memunculkan pesan **berbahasa Indonesia** "Gagal masuk. Email atau kata sandi salah."

Pesan ketiga itu yang membuktikan `terjemah` masih tersambung setelah dipindah. Kalau yang muncul "Invalid login credentials", impornya putus.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/admin-umum.js src/scripts/admin.js tools/verify/uji_pantau.mjs tools/verify/README.md
git commit -m "refactor: pindahkan penolong admin yang dipakai bersama ke admin-umum.js"
```

---

## Task 3: getFoto dan PhotoSlot berbasis slot

**Files:**
- Create: `src/data/foto.ts`
- Modify: `src/components/PhotoSlot.astro`, `src/pages/index.astro`, `src/pages/portofolio.astro`, `src/pages/tentang.astro`

**Interfaces:**
- Consumes: tabel `foto` dari Task 1, klien dari `src/lib/supabase.ts`.
- Produces: `getFoto(): Promise<Map<string, Foto>>` di `src/data/foto.ts`, dengan `interface Foto { slot: string; berkas: string | null; alt: string | null; lebar: number | null; tinggi: number | null; }`. `PhotoSlot` menerima prop `slot: string`.

- [ ] **Step 1: Tulis `src/data/foto.ts`**

```ts
import { supabase } from '../lib/supabase';

export interface Foto {
  slot: string;
  berkas: string | null;
  alt: string | null;
  lebar: number | null;
  tinggi: number | null;
}

// Ketiga rasio yang tersedia di site.css, beserta nilai lebar dibagi tinggi.
// Aturannya ditulis eksplisit supaya hasilnya sama setiap kali, bukan
// bergantung pada urutan pemeriksaan di dalam kode.
const RASIO: [string, number][] = [
  ['4:6', 700 / 1050],
  ['4:5', 800 / 1000],
  ['16:12', 960 / 720],
];

export function bingkai(lebar: number | null, tinggi: number | null): string {
  if (!lebar || !tinggi || tinggi <= 0) return '4:5';
  const r = lebar / tinggi;
  let pilih = RASIO[0];
  for (const kandidat of RASIO) {
    if (Math.abs(kandidat[1] - r) < Math.abs(pilih[1] - r)) pilih = kandidat;
  }
  return pilih[0];
}

let cache: Map<string, Foto> | null = null;

export async function getFoto(): Promise<Map<string, Foto>> {
  if (cache) return cache;

  const { data, error } = await supabase
    .from('foto')
    .select('slot, berkas, alt, lebar, tinggi');

  if (error) {
    throw new Error('Gagal mengambil data foto dari Supabase: ' + error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Tabel foto kosong. Jalankan SQL di docs/supabase-setup-2b.md.');
  }

  cache = new Map(data.map((r) => [r.slot, r as Foto]));
  return cache;
}
```

Cache ada karena dua puluh `PhotoSlot` di satu halaman masing-masing akan memanggil `getFoto()`, dan tanpa cache itu dua puluh permintaan jaringan per halaman.

- [ ] **Step 2: Tulis tes untuk `bingkai()` dan jalankan**

Buat `tools/verify/uji_bingkai.mjs` dengan pola `tools/verify/uji_bersih.mjs` yang sudah ada di repo. Baca berkas itu dulu sebagai contoh. Kodenya DIAMBIL dari `src/data/foto.ts` dengan regex, bukan ditulis ulang.

Kasus yang wajib ada:

```
bingkai(800, 1000)  -> '4:5'     foto tegak sedang
bingkai(700, 1050)  -> '4:6'     foto tegak panjang
bingkai(960, 720)   -> '16:12'   foto melebar
bingkai(1000, 1000) -> '16:12'   foto persegi, terdekat ke 1.333
bingkai(null, null) -> '4:5'     belum diisi, jatuh ke bawaan
bingkai(800, 0)     -> '4:5'     tinggi nol tidak boleh membagi
bingkai(1600, 900)  -> '16:12'   foto lanskap lebar
```

Expected: `SEMUA LULUS`.

- [ ] **Step 3: Buktikan tesnya bisa MERAH**

Pada SALINAN `src/data/foto.ts` di folder scratchpad, bukan pada berkas repo, lakukan tiga mutasi dan tunjukkan ketiganya membuat tes merah:

1. `Math.abs(kandidat[1] - r) < Math.abs(pilih[1] - r)` jadi `>`
2. `if (!lebar || !tinggi || tinggi <= 0) return '4:5';` dihapus
3. `return pilih[0];` jadi `return '4:5';`

Lalu pastikan berkas repo utuh dengan `cmp`. Laporkan hasil ketiganya.

- [ ] **Step 4: Ubah `src/components/PhotoSlot.astro`**

```astro
---
import { getFoto, bingkai } from '../data/foto';

interface Props {
  slot: string;
  no: string;
  label: string;
  varian?: 'terang' | 'gelap';
  prioritas?: boolean;
}
const { slot, no, label, varian = 'terang', prioritas = false } = Astro.props;

const foto = (await getFoto()).get(slot);
if (!foto) {
  throw new Error('Slot foto "' + slot + '" tidak ada di tabel foto. ' +
    'Tambahkan barisnya lewat SQL, atau perbaiki nama slot di halaman.');
}

const rasio = bingkai(foto.lebar, foto.tinggi);

// Ukuran intrinsik per rasio, dipakai pada atribut width dan height supaya
// ruangnya dipesan dan tata letak tidak bergeser saat foto dimuat.
const DIM: Record<string, [number, number]> = {
  '4:5':   [800, 1000],
  '4:6':   [700, 1050],
  '16:12': [960, 720],
};
const [w, h] = DIM[rasio];
---
{foto.berkas
  ? (prioritas
    ? <img src={'/assets/foto/' + foto.berkas} alt={foto.alt ?? ''} width={w} height={h} fetchpriority="high" decoding="async" />
    : <img src={'/assets/foto/' + foto.berkas} alt={foto.alt ?? ''} width={w} height={h} loading="lazy" decoding="async" />)
  : (
    <span class={varian === 'gelap' ? 'ph ph--dark' : 'ph'}>
      <span class="ph__no">{no}</span>
      <span class="ph__label">{label}</span>
    </span>
  )}
```

Melempar galat saat slot tidak ada itu disengaja: salah ketik nama slot akan menggagalkan build dengan pesan yang menyebut slotnya, bukan diam-diam menggambar placeholder yang tidak pernah bisa diisi.

- [ ] **Step 5: Ubah kedua puluh pemanggilan**

Ganti `file=...`, `ada=...`, dan `rasio=...` dengan `slot=...`. Pertahankan `no`, `label`, `varian`, dan `prioritas` apa adanya. Pemetaannya:

| Berkas | Baris kira-kira | `file` lama | `slot` baru |
|---|---|---|---|
| index.astro | 39 | `assets/foto/hero.jpg` | `hero` |
| index.astro | 93 | tidak ada, label Wedding | `acara-01` |
| index.astro | 98 | tidak ada, label Lamaran | `acara-02` |
| index.astro | 103 | tidak ada, label Pre-wedding | `acara-03` |
| index.astro | 108 | tidak ada, label Wisuda | `acara-04` |
| index.astro | 113 | tidak ada, label Photoshoot | `acara-05` |
| index.astro | 137 | `assets/foto/beranda-01.jpg` | `beranda-01` |
| index.astro | 143 | `assets/foto/beranda-02.jpg` | `beranda-02` |
| index.astro | 149 | `assets/foto/beranda-03.jpg` | `beranda-03` |
| index.astro | 155 | `assets/foto/beranda-04.jpg` | `beranda-04` |
| portofolio.astro | 43 | `assets/foto/plat-01.jpg` | `plat-01` |
| portofolio.astro | 48 | `assets/foto/plat-02.jpg` | `plat-02` |
| portofolio.astro | 53 | `assets/foto/plat-03.jpg` | `plat-03` |
| portofolio.astro | 58 | `assets/foto/plat-04.jpg` | `plat-04` |
| portofolio.astro | 63 | `assets/foto/plat-05.jpg` | `plat-05` |
| portofolio.astro | 68 | `assets/foto/plat-06.jpg` | `plat-06` |
| portofolio.astro | 73 | `assets/foto/plat-07.jpg` | `plat-07` |
| portofolio.astro | 78 | `assets/foto/plat-08.jpg` | `plat-08` |
| portofolio.astro | 83 | `assets/foto/plat-09.jpg` | `plat-09` |
| tentang.astro | 22 | `assets/foto/perias.jpg` | `perias` |

Nomor baris adalah petunjuk, bukan kebenaran. Cocokkan dengan `label` dan `file` yang ada di sana, dan kalau tidak cocok, cari yang benar sebelum menyunting.

Contoh hasil akhir satu baris:

```astro
<PhotoSlot slot="plat-07" no="07" label="Kids makeup" varian="terang" />
```

Periksa jumlahnya:

```bash
grep -c 'slot="' src/pages/index.astro src/pages/portofolio.astro src/pages/tentang.astro
grep -rn 'file="assets' src/pages/ ; echo "sisa file=: $?"
```

Expected: 10, 9, 1, dan tidak ada sisa `file="assets`.

- [ ] **Step 6: Gerbang**

```bash
npm run build
python tools/verify/check_static.py dist
node tools/verify/uji_bersih.mjs src/data/site.ts
node tools/verify/uji_pantau.mjs src/scripts/admin-umum.js
node tools/verify/uji_bingkai.mjs src/data/foto.ts
git status --porcelain src/styles/site.css src/scripts/site.js
```

Expected: semuanya lulus, `check_static: 0 masalah`. Karena seluruh `berkas` masih null, kedua puluh posisi tetap menggambar placeholder, jadi hitungan `.ph` tidak berubah dan gerbang tetap hijau. Itu bukti bahwa perubahan ini belum mengubah apa pun yang terlihat.

- [ ] **Step 7: Buktikan halaman tidak berubah secara visual**

Jalankan `tools/verify/snapshot.py` dan `tools/verify/compare.py` seperti dijelaskan di `tools/verify/README.md`. Ketujuh halaman harus identik dengan sebelum Task 3. Kalau alat itu butuh baseline, ambil baselinenya SEBELUM menyunting, di Step 1 task ini, dan katakan di laporan kalau kamu lupa mengambilnya.

- [ ] **Step 8: Commit**

```bash
git add src/data/foto.ts src/components/PhotoSlot.astro src/pages/index.astro src/pages/portofolio.astro src/pages/tentang.astro tools/verify/uji_bingkai.mjs tools/verify/README.md
git commit -m "feat: PhotoSlot mengambil data foto dari Supabase lewat kunci slot"
```

---

## Task 4: Unduh foto sebelum build

**Files:**
- Create: `tools/ambil-foto.mjs`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Consumes: tabel `foto`, bucket `foto`.
- Produces: berkas di `public/assets/foto/` sebelum Astro membangun.

- [ ] **Step 1: Tulis `tools/ambil-foto.mjs`**

```js
// Mengunduh seluruh foto dari Supabase Storage ke public/assets/foto/ sebelum
// Astro membangun. Dengan begitu foto ikut diterbitkan bersama halaman, dan
// pengunjung mengambilnya dari Vercel, tidak pernah menyentuh Supabase. Tier
// gratis Supabase dijeda setelah tujuh hari tanpa aktivitas; kalau foto diambil
// saat kunjungan, seluruh foto berubah jadi kotak kosong saat itu terjadi.
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Di Vercel env var sudah ada di process.env. Di lokal nilainya ada di .env,
// dan skrip Node biasa tidak membacanya sendiri seperti Astro.
if (existsSync('.env')) {
  try { process.loadEnvFile('.env'); } catch { /* sudah ada di process.env */ }
}

const URL_SB = (process.env.PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const TUJUAN = 'public/assets/foto';

if (!URL_SB || !KEY) {
  throw new Error(
    'PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY belum diisi. ' +
    'Isi berkas .env di akar project, dan Environment Variables di Vercel.'
  );
}

const r = await fetch(URL_SB + '/rest/v1/foto?select=slot,berkas', {
  headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
});
if (!r.ok) {
  throw new Error('Gagal membaca tabel foto: HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
const baris = await r.json();

await mkdir(TUJUAN, { recursive: true });

// Buang berkas lama yang tidak lagi dirujuk, supaya build tidak menumpuk sisa
// dari foto yang sudah diganti.
const dipakai = new Set(baris.filter((b) => b.berkas).map((b) => b.berkas));
for (const f of await readdir(TUJUAN)) {
  if (f.endsWith('.txt')) continue;
  if (!dipakai.has(f)) await unlink(TUJUAN + '/' + f);
}

let n = 0;
for (const b of baris) {
  if (!b.berkas) continue;
  const alamat = URL_SB + '/storage/v1/object/public/foto/' + b.berkas;
  const g = await fetch(alamat);
  if (!g.ok) {
    throw new Error(
      'Gagal mengunduh foto untuk slot "' + b.slot + '" (' + b.berkas + '): HTTP ' + g.status +
      '. Build sengaja dihentikan daripada menerbitkan situs dengan gambar hilang.'
    );
  }
  await writeFile(TUJUAN + '/' + b.berkas, Buffer.from(await g.arrayBuffer()));
  n++;
}
console.log('ambil-foto: ' + n + ' foto diunduh dari ' + baris.length + ' posisi');
```

- [ ] **Step 2: Sambungkan ke build**

Di `package.json`, tambahkan satu skrip. npm menjalankan `prebuild` otomatis sebelum `build`, termasuk di Vercel.

```json
"scripts": {
  "dev": "astro dev",
  "prebuild": "node tools/ambil-foto.mjs",
  "build": "astro build",
  "preview": "astro preview"
}
```

- [ ] **Step 3: Jangan masukkan foto hasil unduhan ke git**

Tambahkan ke `.gitignore`:

```
public/assets/foto/*
!public/assets/foto/LETAKKAN-FOTO-DI-SINI.txt
```

Foto itu hasil unduhan, bukan sumber. Memasukkannya ke git berarti setiap penggantian foto jadi commit, dan itu persis yang tahap ini hendak dihapus.

- [ ] **Step 4: Jalankan dan ukur**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
npm run build
ls public/assets/foto/
```

Expected: `ambil-foto: 0 foto diunduh dari 20 posisi` karena semua `berkas` masih null, lalu build Astro lulus.

- [ ] **Step 5: Buktikan kegagalan yang aman**

Tanpa menyentuh basis data, buktikan bahwa unduhan yang gagal menghentikan build. Salin `tools/ambil-foto.mjs` ke scratchpad, ubah baris yang membangun `alamat` menjadi berkas yang pasti tidak ada, lalu jalankan salinan itu.

Expected: skrip melempar galat yang menyebut nama slot, dan keluar dengan kode bukan nol.

Jalankan juga dengan `PUBLIC_SUPABASE_ANON_KEY` sengaja salah:

```bash
env PUBLIC_SUPABASE_ANON_KEY=salah node tools/ambil-foto.mjs; echo "exit=$?"
```

Expected: gagal membaca tabel, exit bukan nol. Laporkan keluaran sebenarnya.

- [ ] **Step 6: Commit**

```bash
git add tools/ambil-foto.mjs package.json .gitignore
git commit -m "feat: unduh foto dari Supabase sebelum build"
```

---

## Task 5: Pengecilan gambar di peramban

**Files:**
- Create: `src/scripts/kecilkan.js`, `tools/verify/uji_kecilkan.mjs`

**Interfaces:**
- Produces: `src/scripts/kecilkan.js` mengekspor `ukuranBaru(lebar, tinggi, maks) -> {lebar, tinggi}` dan `kecilkan(file) -> Promise<{blob, lebar, tinggi}>`.

Dipisah dua fungsi dengan sengaja. `ukuranBaru` murni hitungan dan bisa diuji di Node tanpa peramban; `kecilkan` menyentuh kanvas dan hanya bisa diuji di peramban.

- [ ] **Step 1: Tulis `src/scripts/kecilkan.js`**

```js
// Mengecilkan foto di peramban sebelum diunggah. Berkas kamera 3 sampai 8 MB
// jadi sekitar 200 sampai 400 KB. Tiga sebabnya: unggah tetap berhasil walau
// sinyal lemah, kuota Storage 1 GB tidak cepat habis, dan pengunjung berkuota
// terbatas tidak perlu mengunduh foto raksasa untuk bingkai kecil.
export const MAKS_SISI = 1600;
export const MAKS_BYTE = 500 * 1024;
export const MUTU = 0.82;

export function ukuranBaru(lebar, tinggi, maks = MAKS_SISI) {
  if (!lebar || !tinggi) return { lebar: 0, tinggi: 0 };
  const sisi = Math.max(lebar, tinggi);
  if (sisi <= maks) return { lebar, tinggi };
  const skala = maks / sisi;
  return {
    lebar: Math.max(1, Math.round(lebar * skala)),
    tinggi: Math.max(1, Math.round(tinggi * skala)),
  };
}

export async function kecilkan(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    throw new Error('Berkas ini bukan gambar.');
  }

  let bitmap;
  try {
    // createImageBitmap menghormati metadata arah putar dari ponsel, sehingga
    // foto tidak tiba-tiba miring setelah diunggah.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Gambar tidak bisa dibaca. Coba simpan ulang sebagai JPG lalu unggah lagi.');
  }

  const { lebar, tinggi } = ukuranBaru(bitmap.width, bitmap.height);
  const kanvas = document.createElement('canvas');
  kanvas.width = lebar;
  kanvas.height = tinggi;
  kanvas.getContext('2d').drawImage(bitmap, 0, 0, lebar, tinggi);
  bitmap.close();

  const blob = await new Promise((res) => kanvas.toBlob(res, 'image/jpeg', MUTU));
  if (!blob) throw new Error('Gagal menyiapkan gambar di peramban ini.');
  if (blob.size > MAKS_BYTE) {
    throw new Error(
      'Hasilnya masih ' + Math.round(blob.size / 1024) + ' KB, lebih dari batas ' +
      Math.round(MAKS_BYTE / 1024) + ' KB. Coba foto dengan ukuran lebih kecil.'
    );
  }
  return { blob, lebar, tinggi };
}
```

- [ ] **Step 2: Tulis `tools/verify/uji_kecilkan.mjs`**

Pola sama dengan `tools/verify/uji_bersih.mjs`: kode `ukuranBaru` DIAMBIL dari berkasnya dengan regex, bukan ditulis ulang. Baca `uji_bersih.mjs` dulu sebagai contoh.

Kasus wajib:

```
ukuranBaru(4000, 3000, 1600) -> {lebar:1600, tinggi:1200}   lanskap besar
ukuranBaru(3000, 4000, 1600) -> {lebar:1200, tinggi:1600}   potret besar
ukuranBaru(1200,  900, 1600) -> {lebar:1200, tinggi:900}    sudah kecil, dibiarkan
ukuranBaru(1600, 1600, 1600) -> {lebar:1600, tinggi:1600}   persis di batas
ukuranBaru(0, 0, 1600)       -> {lebar:0, tinggi:0}         tidak membagi nol
ukuranBaru(8000, 10, 1600)   -> {lebar:1600, tinggi:2}      sisi pendek tidak jadi nol
```

Kasus terakhir penting: tanpa `Math.max(1, ...)` hasilnya 0 dan kanvas berukuran nol menghasilkan gambar kosong.

- [ ] **Step 3: Buktikan tesnya bisa MERAH**

Pada salinan di scratchpad, tiga mutasi, ketiganya harus merah:

1. `Math.max(lebar, tinggi)` jadi `Math.min(lebar, tinggi)`
2. `Math.max(1, Math.round(...))` jadi `Math.round(...)`
3. `if (sisi <= maks) return { lebar, tinggi };` dihapus

Pastikan berkas repo utuh sesudahnya dengan `cmp`. Laporkan ketiganya.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/kecilkan.js tools/verify/uji_kecilkan.mjs tools/verify/README.md
git commit -m "feat: pengecilan gambar di peramban sebelum unggah"
```

---

## Task 6: Bagian foto di halaman admin

**Files:**
- Create: `src/scripts/admin-foto.js`
- Modify: `src/pages/admin.astro`, `src/scripts/admin.js`, `src/styles/admin.css`

**Interfaces:**
- Consumes: `admin-umum.js` dari Task 2, `kecilkan.js` dari Task 5, tabel dan bucket dari Task 1.
- Produces: `muatFoto()` diekspor dari `admin-foto.js`, dipanggil `admin.js` setelah login berhasil.

- [ ] **Step 1: Tambahkan wadahnya di `src/pages/admin.astro`**

Di dalam `<section id="adm-panel">`, setelah `<div id="adm-isi"></div>`, tambahkan:

```astro
    <h2 class="h3 adm-judul-foto">Foto</h2>
    <div id="adm-foto"></div>
```

Jangan menyentuh bagian lain berkas itu.

- [ ] **Step 2: Tambahkan gaya di `src/styles/admin.css`**

`site.css` tidak boleh disentuh, jadi gaya khas admin tinggal di sini.

```css
.adm-judul-foto { margin-top: var(--s-4); }
.adm-grup { margin-bottom: var(--s-3); }
.adm-grup > h3 { font-size: 0.8rem; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-soft); margin-bottom: var(--s-2); }
.adm-foto-baris { display: grid; grid-template-columns: 72px 1fr;
  gap: var(--s-2); align-items: start; padding: var(--s-2) 0;
  border-top: 1px solid var(--rule); }
.adm-foto-baris img { width: 72px; height: 90px; object-fit: cover;
  border-radius: var(--r); display: block; }
.adm-foto-kosong { width: 72px; height: 90px; border: 1px dashed var(--rule);
  border-radius: var(--r); display: grid; place-items: center;
  font-size: 0.7rem; color: var(--ink-soft); text-align: center; }
.adm-foto-aksi { display: flex; flex-wrap: wrap; gap: var(--s-2);
  align-items: center; margin-top: var(--s-2); }
.adm-foto-aksi input[type="file"] { font: inherit; font-size: 0.85rem; }
```

Kelas `.h3` ada di `site.css`; periksa dulu dengan `grep -n '\.h3' src/styles/site.css` dan kalau tidak ada, pakai `.h2` yang sudah terbukti ada, dan laporkan penggantiannya.

- [ ] **Step 3: Tulis `src/scripts/admin-foto.js`**

Seluruh markup dibangun dengan `createElement` dan `textContent`, bukan `innerHTML`, supaya nilai dari basis data tidak pernah menjadi HTML.

```js
import { supabase } from '../lib/supabase';
import { terjemah, tulisKabar, pantauBuild } from './admin-umum.js';
import { kecilkan } from './kecilkan.js';

// Nama posisi dalam bahasa manusia. Urutannya menentukan urutan tampil.
const GRUP = [
  ['Beranda', [
    ['hero', 'Foto utama'],
    ['beranda-01', 'Pilihan 01, Rias pengantin'],
    ['beranda-02', 'Pilihan 02, Lamaran'],
    ['beranda-03', 'Pilihan 03, Natural'],
    ['beranda-04', 'Pilihan 04, Kids makeup'],
  ]],
  ['Kategori acara', [
    ['acara-01', 'Wedding'],
    ['acara-02', 'Lamaran'],
    ['acara-03', 'Pre-wedding'],
    ['acara-04', 'Wisuda'],
    ['acara-05', 'Photoshoot'],
  ]],
  ['Portofolio', [
    ['plat-01', 'Portofolio 01, Soft glam'],
    ['plat-02', 'Portofolio 02, Soft glam'],
    ['plat-03', 'Portofolio 03, Natural'],
    ['plat-04', 'Portofolio 04, Adat'],
    ['plat-05', 'Portofolio 05, Photoshoot'],
    ['plat-06', 'Portofolio 06, Natural'],
    ['plat-07', 'Portofolio 07, Kids makeup'],
    ['plat-08', 'Portofolio 08, Soft glam'],
    ['plat-09', 'Portofolio 09, Di balik layar'],
  ]],
  ['Tentang', [
    ['perias', 'Foto perias'],
  ]],
];

const el = (id) => document.getElementById(id);
let alamatBucket = '';

function buat(tag, kelas, teks) {
  const n = document.createElement(tag);
  if (kelas) n.className = kelas;
  if (teks !== undefined) n.textContent = teks;
  return n;
}

function baris(slot, nama, data) {
  const wadah = buat('div', 'adm-foto-baris');
  wadah.id = 'fb-' + slot;

  if (data.berkas) {
    const img = buat('img');
    img.src = alamatBucket + data.berkas;
    img.alt = data.alt || '';
    img.width = 72; img.height = 90;
    wadah.appendChild(img);
  } else {
    wadah.appendChild(buat('div', 'adm-foto-kosong', 'belum diisi'));
  }

  const kanan = buat('div');
  kanan.appendChild(buat('p', 'fine', nama));

  const bidang = buat('div', 'field');
  const lab = buat('label', null, 'Keterangan foto, wajib diisi');
  lab.setAttribute('for', 'alt-' + slot);
  const inp = buat('input');
  inp.type = 'text'; inp.id = 'alt-' + slot;
  inp.value = data.alt || '';
  bidang.appendChild(lab); bidang.appendChild(inp);
  kanan.appendChild(bidang);

  const aksi = buat('div', 'adm-foto-aksi');
  const berkas = buat('input');
  berkas.type = 'file'; berkas.accept = 'image/*'; berkas.id = 'file-' + slot;
  const simpan = buat('button', 'btn btn--primary', 'Unggah');
  simpan.type = 'button'; simpan.id = 'unggah-' + slot;
  simpan.addEventListener('click', () => unggah(slot));
  aksi.appendChild(berkas); aksi.appendChild(simpan);

  if (data.berkas) {
    const hapus = buat('button', 'btn btn--quiet', 'Hapus');
    hapus.type = 'button';
    hapus.addEventListener('click', () => hapusFoto(slot));
    aksi.appendChild(hapus);
  }
  kanan.appendChild(aksi);

  const kabar = buat('div', 'outcome');
  kabar.id = 'kabar-' + slot;
  kabar.setAttribute('data-state', 'empty');
  kabar.setAttribute('role', 'status');
  kabar.setAttribute('aria-live', 'polite');
  kabar.hidden = true;
  kanan.appendChild(kabar);

  wadah.appendChild(kanan);
  return wadah;
}

export async function muatFoto() {
  const wadah = el('adm-foto');
  wadah.replaceChildren(buat('p', 'fine', 'Mengambil data foto...'));

  alamatBucket = import.meta.env.PUBLIC_SUPABASE_URL.replace(/\/+$/, '') +
    '/storage/v1/object/public/foto/';

  let data;
  try {
    const r = await supabase.from('foto').select('slot, berkas, alt, lebar, tinggi');
    if (r.error) throw r.error;
    data = r.data;
  } catch (e) {
    wadah.replaceChildren();
    const k = buat('div', 'outcome');
    k.setAttribute('data-state', 'error');
    k.appendChild(buat('p', 'outcome__title', 'Gagal mengambil data foto'));
    k.appendChild(buat('p', 'outcome__text', terjemah(e.message || String(e))));
    wadah.appendChild(k);
    return;
  }

  const peta = new Map(data.map((r) => [r.slot, r]));
  wadah.replaceChildren();
  for (const [judul, isi] of GRUP) {
    const g = buat('div', 'adm-grup');
    g.appendChild(buat('h3', null, judul));
    for (const [slot, nama] of isi) {
      g.appendChild(baris(slot, nama, peta.get(slot) || {}));
    }
    wadah.appendChild(g);
  }
}

function kabar(slot, state, judul, teks) {
  const k = el('kabar-' + slot);
  k.hidden = false;
  tulisKabar(k, state, judul, teks);
  return k;
}

async function unggah(slot) {
  const berkas = el('file-' + slot).files[0];
  const alt = el('alt-' + slot).value.trim();
  const tombol = el('unggah-' + slot);

  if (!alt) {
    kabar(slot, 'error', 'Keterangan foto wajib diisi',
      'Pembaca layar membacakannya untuk orang yang tidak bisa melihat foto. Satu kalimat pendek sudah cukup.');
    el('alt-' + slot).focus();
    return;
  }
  if (!berkas) {
    kabar(slot, 'error', 'Belum ada berkas dipilih', 'Pilih satu foto dulu.');
    return;
  }

  tombol.disabled = true;
  kabar(slot, 'empty', 'Menyiapkan foto', 'Mengecilkan sebelum dikirim.');

  let hasil;
  try {
    hasil = await kecilkan(berkas);
  } catch (e) {
    tombol.disabled = false;
    kabar(slot, 'error', 'Foto ditolak', e.message);
    return;
  }

  const nama = slot + '-' + Date.now() + '.jpg';
  kabar(slot, 'empty', 'Mengunggah',
    Math.round(hasil.blob.size / 1024) + ' KB, ' + hasil.lebar + ' kali ' + hasil.tinggi + ' piksel.');

  try {
    const u = await supabase.storage.from('foto')
      .upload(nama, hasil.blob, { contentType: 'image/jpeg' });
    if (u.error) throw u.error;

    const lama = (await supabase.from('foto').select('berkas').eq('slot', slot).single()).data;

    const s = await supabase.from('foto')
      .update({ berkas: nama, alt, lebar: hasil.lebar, tinggi: hasil.tinggi })
      .eq('slot', slot).select('diperbarui').single();
    if (s.error) throw s.error;

    // Berkas lama dihapus SESUDAH baris menunjuk yang baru. Kalau urutannya
    // dibalik dan penyimpanan gagal, situs kehilangan fotonya.
    if (lama && lama.berkas && lama.berkas !== nama) {
      await supabase.storage.from('foto').remove([lama.berkas]);
    }

    tombol.disabled = false;
    const k = kabar(slot, 'ready', 'Tersimpan', 'Situs sedang dibangun ulang, sekitar dua menit.');
    if (s.data && s.data.diperbarui) {
      pantauBuild(k, s.data.diperbarui);
    } else {
      kabar(slot, 'ready', 'Tersimpan, tapi build tidak bisa dipantau',
        'Perubahan sudah masuk basis data. Periksa situs beberapa menit lagi.');
    }
  } catch (e) {
    tombol.disabled = false;
    kabar(slot, 'error', 'Gagal mengunggah', terjemah(e.message || String(e)));
  }
}

async function hapusFoto(slot) {
  try {
    const lama = (await supabase.from('foto').select('berkas').eq('slot', slot).single()).data;
    const s = await supabase.from('foto')
      .update({ berkas: null, alt: null, lebar: null, tinggi: null })
      .eq('slot', slot).select('diperbarui').single();
    if (s.error) throw s.error;
    if (lama && lama.berkas) {
      await supabase.storage.from('foto').remove([lama.berkas]);
    }
    await muatFoto();
  } catch (e) {
    kabar(slot, 'error', 'Gagal menghapus', terjemah(e.message || String(e)));
  }
}
```

- [ ] **Step 4: Panggil `muatFoto()` dari `admin.js`**

Tambahkan impor:

```js
import { muatFoto } from './admin-foto.js';
```

Lalu panggil `await muatFoto();` tepat setelah setiap `await muatPengaturan();` yang sudah ada. Ada dua tempat: di `mulai()` saat sesi sudah ada, dan di handler submit login. Periksa dengan `grep -n 'muatPengaturan()' src/scripts/admin.js` dan pastikan tidak ada yang terlewat.

- [ ] **Step 5: Build dan gerbang**

```bash
npm run build
python tools/verify/check_static.py dist
grep -r 'import\.meta\.env' dist | wc -l
git status --porcelain src/styles/site.css src/scripts/site.js
```

Expected: build lulus, `0 masalah`, nol hasil `import.meta.env`, dua baris terakhir kosong.

- [ ] **Step 6: Uji di peramban tanpa login**

Layani `dist` di port yang belum dipakai, JANGAN 8080. Buktikan:

- nol galat konsol saat `/admin` dimuat
- formulir login terlihat, bagian foto tidak terlihat karena berada di dalam panel

Bagian yang butuh login TIDAK bisa kamu uji. Tulis di laporan bahwa itu disisakan untuk pemilik situs, dan jangan mengaku sudah mengujinya.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/admin-foto.js src/scripts/admin.js src/pages/admin.astro src/styles/admin.css
git commit -m "feat: bagian foto di halaman admin dengan unggah dan hapus"
```

---

## Task 7: Penjaga baru untuk foto

**Files:**
- Create: `tools/verify/check_foto.py`
- Modify: `tools/verify/check_static.py`, `tools/verify/README.md`

**Interfaces:**
- Produces: `check_foto.py` yang memeriksa alt, width/height, dan ukuran berkas.

- [ ] **Step 1: Perbaiki cara `check_static` menghitung bingkai**

Di `tools/verify/check_static.py`, ganti perhitungan `ph` supaya menghitung bingkai placeholder DITAMBAH gambar:

```python
            "ph": (len(re.findall(r'class="ph[ "]', s))
                   + len(re.findall(r"<img ", s))),
```

Tambahkan komentar di atas tabel `INVARIAN` yang menjelaskan kenapa. Angkanya TETAP 10, 9, dan 1.

Ini berbeda dari invarian jumlah kata yang dipensiunkan di Tahap 2a. Jumlah kata tidak punya bentuk yang tetap bermakna setelah data masuk; jumlah posisi punya, karena tiap posisi selalu menggambar tepat satu hal, entah placeholder entah gambar.

- [ ] **Step 2: Buktikan invarian itu masih bisa merah**

```bash
npm run build
python tools/verify/check_static.py dist
python tools/verify/mutasi_check_static.py dist <folder-scratchpad>/dmut
```

Expected: `0 masalah`, lalu ketujuh mutasi tertangkap. Kalau mutasi "hapus satu bingkai foto" tidak lagi tertangkap karena mengubah `class="ph` jadi `class="xx` sekarang tidak mengubah total, perbaiki `mutasi_check_static.py` agar mutasinya menghapus seluruh elemen bingkai, bukan menyamarkan kelasnya. Laporkan kalau ini terjadi.

- [ ] **Step 3: Tulis `tools/verify/check_foto.py`**

```python
"""Penjaga foto: teks alt, atribut ukuran, dan besar berkas."""
import sys, re, os, glob

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]
MAKS_BYTE = 500 * 1024

def cari(root, nama):
    for p in (os.path.join(root, nama, "index.html"),
              os.path.join(root, nama + ".html"),
              os.path.join(root, "index.html") if nama == "index" else ""):
        if p and os.path.exists(p):
            return p
    return None

def main(root):
    gagal = []
    diperiksa = 0

    for nama in HALAMAN:
        p = cari(root, nama)
        if not p:
            gagal.append(f"{nama}: berkas tidak ditemukan di {root}")
            continue
        s = open(p, encoding="utf-8").read()
        for tag in re.findall(r"<img\b[^>]*>", s):
            diperiksa += 1
            alt = re.search(r'\balt="([^"]*)"', tag)
            if not alt:
                gagal.append(f"{nama}: ada gambar tanpa atribut alt: {tag[:120]}")
            elif not alt.group(1).strip():
                gagal.append(f"{nama}: ada gambar dengan alt kosong: {tag[:120]}")
            if not re.search(r'\bwidth="\d+"', tag):
                gagal.append(f"{nama}: gambar tanpa width: {tag[:120]}")
            if not re.search(r'\bheight="\d+"', tag):
                gagal.append(f"{nama}: gambar tanpa height: {tag[:120]}")

    for f in glob.glob(os.path.join(root, "assets", "foto", "*")):
        if f.endswith(".txt"):
            continue
        n = os.path.getsize(f)
        if n > MAKS_BYTE:
            gagal.append(f"{os.path.basename(f)}: {n // 1024} KB, lebih dari batas "
                         f"{MAKS_BYTE // 1024} KB")

    for g in gagal:
        print("GAGAL", g)
    print(f"check_foto: {len(gagal)} masalah, {diperiksa} gambar diperiksa")
    return 1 if gagal else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "dist"))
```

- [ ] **Step 4: Jalankan**

```bash
npm run build
python tools/verify/check_foto.py dist
```

Expected saat semua `berkas` masih null: `check_foto: 0 masalah, 0 gambar diperiksa`.

Nol gambar diperiksa berarti penjaganya belum membuktikan apa pun. Itu sebabnya Step 5 ada dan tidak boleh dilewati.

- [ ] **Step 5: Buktikan ketiga penjaga bisa MERAH**

Pada salinan `dist` di scratchpad, dengan pola `tools/verify/mutasi_check_static.py` yang sudah ada. Baca berkas itu dulu, termasuk bagian yang memverifikasi tiap mutasi benar-benar mendarat dengan membaca ulang berkas dari disk. Tanpa verifikasi itu, mutasi yang polanya tidak cocok akan tampak sebagai penjaga yang gagal menangkap.

Lima kasus, kelimanya harus membuat `check_foto` melaporkan masalah:

1. sisipkan `<img src="/a.jpg" width="10" height="10">` tanpa alt, sebelum `</body>` di `dist/index.html`
2. sisipkan `<img src="/a.jpg" alt="" width="10" height="10">` dengan alt kosong
3. sisipkan `<img src="/a.jpg" alt="x" height="10">` tanpa width
4. sisipkan `<img src="/a.jpg" alt="x" width="10">` tanpa height
5. taruh berkas 600 KB di `dist/assets/foto/besar.jpg`

Simpan skripnya sebagai `tools/verify/mutasi_check_foto.py` dan tambahkan bagiannya di `tools/verify/README.md`.

- [ ] **Step 6: Commit**

```bash
git add tools/verify/check_foto.py tools/verify/mutasi_check_foto.py tools/verify/check_static.py tools/verify/README.md
git commit -m "test: penjaga alt, ukuran, dan besar berkas foto"
```

---

## Task 8: Pembuktian keamanan tabel dan bucket

**Files:**
- Create: `tools/verify/check_keamanan_foto.py`
- Modify: `tools/verify/README.md`

- [ ] **Step 1: Baca `tools/verify/check_keamanan.py` dulu**

Skrip baru ini mengikuti polanya persis, termasuk kontrol positif di awal. Jangan merancang ulang dari nol.

Kontrol positif itu wajib. Tanpa itu, kunci yang salah membuat SEMUA permintaan ditolak, dan skrip mencetak semua `OK` dan `0 masalah` justru ketika ia sudah tidak menguji apa pun. Ini bukan kekhawatiran teoretis: di Tahap 2a, versi rencana dari skrip itu dijalankan dengan kunci salah dan benar-benar melaporkan empat `OK` dan `0 masalah`.

- [ ] **Step 2: Tulis `tools/verify/check_keamanan_foto.py`**

Kontrol positif, keduanya wajib HTTP 200, dan skrip BERHENTI kalau salah satu gagal:

1. `GET /rest/v1/foto?limit=1&select=slot` dengan kunci anon
2. `GET /storage/v1/bucket/foto` dengan kunci anon, atau kalau endpoint itu menolak kunci anon, unduh sebuah berkas yang memang ada. Kalau tabel masih kosong isinya sehingga tidak ada berkas untuk diunduh, katakan di laporan bahwa kontrol positif kedua dilewati dan sebutkan sebabnya.

Lalu empat pembuktian, semuanya harus DITOLAK:

1. `PATCH /rest/v1/foto?slot=eq.hero` dengan `{"alt": "DIBAJAK"}`
2. `POST /storage/v1/object/foto/uji-keamanan.txt` dengan isi apa pun
3. `DELETE /storage/v1/object/foto/apa-saja.jpg`
4. `POST /rest/v1/foto` dengan `{"slot": "slot-palsu"}` dan `DELETE /rest/v1/foto?slot=eq.hero`

Beri nama hasilnya dengan jujur: "tanpa login ditolak", bukan "ditolak". Varian "sudah login" butuh sesi pemilik situs dan TIDAK bisa diuji skrip ini. Cetak bagian `BELUM TERUJI` di akhir yang menyatakan itu, seperti `check_keamanan.py` sudah melakukannya.

Periksa juga badan balasannya, bukan hanya kode HTTP. Untuk Postgres, kode `42501` berarti izin ditolak di lapisan GRANT.

- [ ] **Step 3: Jalankan**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
set -a; . ./.env; set +a
python tools/verify/check_keamanan_foto.py; echo "exit=$?"
```

Expected: kontrol positif lulus, keempat pembuktian `OK`, `0 masalah`, exit 0.

Kalau ADA yang GAGAL, itu lubang sungguhan. JANGAN menambalnya sendiri dan jangan mengubah apa pun di Supabase. Berhenti, laporkan apa yang diterima padahal seharusnya ditolak termasuk kode dan badan balasannya, dan katakan Task 9 tidak boleh dilanjutkan.

Periksa juga keadaan tabel sesudahnya. Kalau `alt` pada slot `hero` berisi `DIBAJAK`, itu berarti pembuktian 1 gagal dan tabel tercemar. Jangan membersihkannya sendiri; laporkan.

- [ ] **Step 4: Buktikan skripnya bisa MERAH, tiga mutasi**

Pada salinan di scratchpad:

1. balik ambang penilaian, `kode < 400` jadi `kode >= 400`
2. sasarkan salah satu pembuktian ke jalur yang memang diizinkan, misalnya `GET /rest/v1/foto?limit=1&select=slot`, sehingga cabang "DITERIMA" benar-benar pernah dijalankan terhadap HTTP 200 sungguhan
3. hapus kontrol positif lalu jalankan dengan kunci sengaja salah, dan tunjukkan bahwa tanpa kontrol positif skrip itu mencetak `0 masalah` padahal tidak menguji apa pun

Lalu jalankan skrip repo yang utuh dengan kunci sengaja salah. Hasil yang BENAR adalah berhenti di kontrol positif dengan exit 1, bukan `0 masalah`. Ukur exit code-nya langsung, jangan setelah pipa ke `head`, karena yang terbaca akan jadi status `head`.

Pastikan berkas repo utuh dengan `cmp`.

- [ ] **Step 5: Commit**

```bash
git add tools/verify/check_keamanan_foto.py tools/verify/README.md
git commit -m "test: pembuktian keamanan tabel foto dan bucket"
```

---

## Task 9: Deploy dan pembuktian rantai lengkap

**Files:** tidak ada perubahan kode, kecuali perbaikan dari temuan.

- [ ] **Step 1: Seluruh gerbang hijau sebelum push**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
npm run build
python tools/verify/check_static.py dist
python tools/verify/check_foto.py dist

# check_browser dan check_interactions menerima ALAMAT SERVER, bukan folder.
# Pakai port yang belum dipakai, dan JANGAN 8080 kalau pemilik situs sedang
# memakainya. Matikan servermu sendiri sesudahnya.
python -m http.server 8791 --directory dist >/dev/null 2>&1 &
SRV=$!; sleep 2
python tools/verify/check_browser.py http://127.0.0.1:8791
python tools/verify/check_interactions.py http://127.0.0.1:8791
kill $SRV

node tools/verify/uji_bersih.mjs src/data/site.ts
node tools/verify/uji_pantau.mjs src/scripts/admin-umum.js
node tools/verify/uji_bingkai.mjs src/data/foto.ts
node tools/verify/uji_kecilkan.mjs src/scripts/kecilkan.js
set -a; . ./.env; set +a
python tools/verify/check_keamanan.py
python tools/verify/check_keamanan_foto.py
git status --porcelain src/styles/site.css src/scripts/site.js
```

Expected: semuanya 0 masalah atau SEMUA LULUS, dan dua berkas terakhir tidak tersentuh.

Cara memanggil `check_browser.py` dan `check_interactions.py` ada di `tools/verify/README.md`. Baca dulu; keduanya mungkin butuh server berjalan atau alamat, bukan folder.

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Pastikan build produksi lulus**

```bash
for i in 1 2 3 4 5 6 7 8 9; do
  sleep 20
  P=$(curl -s --max-time 20 "https://dhmakeupwebsite.vercel.app/?t=$(date +%s)" \
      | grep -o 'name="dibangun" content="[^"]*"')
  echo "$((i*20))s: $P"
done
```

Expected: penanda berubah ke waktu yang lebih baru dari sebelum push.

Kalau penanda tidak pernah berubah, build produksi gagal. Minta pemilik situs membuka tab Deployments dan Build Logs. Penyebab yang sudah pernah terjadi di tahap sebelumnya: nama environment variable salah ketik, dan nilai `PUBLIC_SUPABASE_URL` yang kelebihan `/rest/v1/` di ujungnya.

- [ ] **Step 4: Pembuktian rantai lengkap, dikerjakan pemilik situs**

Ini TIDAK bisa dikerjakan agen karena butuh kata sandi admin dan berkas foto sungguhan.

Siapkan untuk pemilik situs: catat penanda `dibangun` dan `diperbarui` SEBELUM, lalu minta dia membuka `https://dhmakeupwebsite.vercel.app/admin`, mengunggah satu foto ke slot `hero` dengan teks alt, dan menekan Unggah.

Lalu ukur sendiri dari luar:

```bash
set -a; . ./.env; set +a
D=$(curl -s "$PUBLIC_SUPABASE_URL/rest/v1/foto?slot=eq.hero&select=berkas,alt,lebar,tinggi,diperbarui" \
    -H "apikey: $PUBLIC_SUPABASE_ANON_KEY")
echo "$D"
B=$(curl -s "https://dhmakeupwebsite.vercel.app/?t=$(date +%s)" \
    | grep -o 'content="[0-9T:.Z-]*Z"' | head -1)
echo "penanda: $B"
curl -s "https://dhmakeupwebsite.vercel.app/?t=$(date +%s)" | grep -o '<img[^>]*assets/foto[^>]*>' | head -3
```

Buktikan ketiganya:

- penanda `dibangun` lebih BARU daripada `diperbarui`
- beranda memuat tag `<img>` yang menunjuk `/assets/foto/`, dan tag itu punya `alt` tidak kosong serta `width` dan `height`
- jumlah bingkai di beranda tetap 10, dibuktikan dengan `check_foto.py` dan `check_static.py` terhadap build lokal yang segar

Langkah ini juga yang membuktikan webhook kedua terpasang, yang sengaja tidak diklaim di Task 1.

- [ ] **Step 5: Pembuktian kegagalan yang aman di produksi**

Setelah Step 4 berhasil, buktikan bahwa foto hilang menggagalkan build, bukan menerbitkan situs dengan gambar rusak. Lakukan LOKAL, jangan di produksi: salin `tools/ambil-foto.mjs` ke scratchpad, ubah nama berkas yang diunduh menjadi yang pasti tidak ada, jalankan, dan tunjukkan ia melempar galat yang menyebut slotnya.

Jangan merusak data produksi untuk menguji ini.

- [ ] **Step 6: Commit dan push kalau ada perbaikan**

```bash
git add -A
git commit -m "chore: perbaikan dari pembuktian rantai lengkap Tahap 2b-1"
git push
```

Kalau tidak ada perbaikan, lewati dan katakan begitu.

---

## Self-Review

**Cakupan spec.** Tiap bagian spec punya task: skema, izin, bucket, dan webhook di Task 1 dan dibuktikan di Task 8 dan 9; `getFoto` dan pemilihan bingkai di Task 3; pengambilan saat build di Task 4; pengecilan di peramban di Task 5; halaman admin di Task 6; invarian bingkai dan ketiga penjaga baru di Task 7; pembuktian keamanan di Task 8; pembuktian rantai lengkap dan kegagalan yang aman di Task 9.

**Catatan yang ditemukan saat menulis rencana ini dan sudah ditangani di dalamnya:**

1. Menambahkan `export` di depan `tayang` dan `ambilPenanda` membuat regex di `uji_pantau.mjs` tidak cocok lagi, sehingga tes berhenti dengan "fungsi tidak ditemukan", bukan dengan kegagalan yang jelas. Ditangani Task 2 Step 4.
2. Dua puluh `PhotoSlot` di satu halaman akan memanggil `getFoto()` masing-masing. Tanpa cache itu dua puluh permintaan jaringan per halaman. Ditangani Task 3 Step 1.
3. Mengubah hitungan `.ph` menjadi `.ph` ditambah `<img>` bisa membuat mutasi "hapus satu bingkai foto" di `mutasi_check_static.py` tidak lagi tertangkap, karena menyamarkan nama kelas tidak mengubah total kalau elemennya masih ada. Ditangani Task 7 Step 2.
4. `check_foto.py` melaporkan `0 masalah` saat belum ada foto sama sekali, dan itu nol pembuktian. Ditangani Task 7 Step 5 yang wajib menyuntikkan kerusakan.
5. Menghapus berkas lama sebelum baris basis data menunjuk berkas baru akan membuat situs kehilangan fotonya kalau penyimpanan gagal di tengah. Urutannya dibalik di Task 6 Step 3.
6. `tools/ambil-foto.mjs` berjalan sebagai skrip Node biasa, yang tidak membaca `.env` sendiri seperti Astro. Ditangani dengan `process.loadEnvFile` di Task 4 Step 1.
7. Foto hasil unduhan tidak boleh masuk git, karena kalau masuk maka setiap penggantian foto jadi commit, persis yang tahap ini hendak dihapus. Ditangani Task 4 Step 3.
8. Task 1 tidak boleh mengklaim webhook terpasang tanpa mengukurnya. Pembuktiannya ditunda ke Task 9 Step 4, dan Task 1 Step 3 secara eksplisit melarang klaim itu.
9. Draf pertama Task 9 Step 1 memanggil `check_browser.py dist` dan `check_interactions.py dist`. Keduanya menerima ALAMAT SERVER, bukan folder, dan itu terlihat dari `main(base, ext="")` serta contoh di `tools/verify/README.md` baris 22 dan 23. Diperbaiki dengan menyalakan server lebih dulu. Ini jenis kesalahan yang paling mahal di dokumen rencana, karena implementernya akan menyangka kodenya yang rusak.

**Nomor baris diverifikasi.** Kedua puluh nomor baris di tabel pemetaan Task 3 Step 5 diambil dengan `grep -n` dari berkas sungguhan, lalu dicocokkan satu per satu dengan `label`-nya. Semuanya tepat pada saat rencana ini ditulis. Implementer tetap diminta mencocokkan dengan `label` dan `file`, bukan percaya nomornya, karena baris bisa bergeser.

**Konsistensi tipe.** `getFoto()` mengembalikan `Map<string, Foto>` dan dipakai `PhotoSlot` lewat `.get(slot)`. `bingkai(lebar, tinggi)` menerima `number | null` dan mengembalikan string yang menjadi kunci `DIM`, yang memuat ketiga nilai itu. `ukuranBaru` dan `kecilkan` di `kecilkan.js` memakai nama properti `lebar` dan `tinggi` yang sama dengan kolom basis data, sehingga tidak ada penerjemahan nama di antara keduanya. `tulisKabar(wadah, state, judul, teks)` dipanggil dengan urutan yang sama di `admin-foto.js` seperti di `admin.js`.

**Tanpa placeholder.** Tidak ada TBD, TODO, atau "serupa Task N". Setiap langkah kode memuat kodenya. Dua langkah sengaja meminta implementer membaca berkas yang sudah ada sebagai contoh, yaitu Task 3 Step 2 dan Task 7 Step 5, dan keduanya menyebut berkas mana dan kasus uji apa saja yang wajib ada.
