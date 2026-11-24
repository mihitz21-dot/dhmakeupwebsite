# Menyiapkan Supabase untuk Tahap 2b-1

Ikuti berurutan. Seluruhnya lewat dashboard supabase.com, tidak ada yang perlu
dikerjakan dari terminal. Tahap 2a harus sudah selesai lebih dulu: tabel
`pengaturan`, fungsi `set_diperbarui()`, dan Deploy Hook di Vercel sudah ada.

Tidak ada nilai baru yang perlu disalin ke `.env` atau ke Vercel. Variabel
`PUBLIC_SUPABASE_URL` dan `PUBLIC_SUPABASE_ANON_KEY` yang sudah terpasang tetap
dipakai apa adanya. Jangan mengubah, menambah, atau mengganti namanya.

## 1. Tabel foto, izin, dan dua puluh barisnya

Buka **SQL Editor**, tempel seluruh blok di bawah sekaligus dari baris pertama
sampai terakhir, lalu tekan **Run**. Jangan dipotong-potong dan jangan dijalankan
sebagian, karena baris izin (`grant`) yang terlewat membuat build gagal dengan
galat 401.

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

Hasil yang benar: tulisan **Success. No rows returned**. Kalau muncul merah
bertuliskan `already exists`, berarti blok ini sudah pernah dijalankan. Jangan
dijalankan lagi, kabari saja.

Fungsi `set_diperbarui()` sudah dibuat di Tahap 2a, jadi tidak dibuat ulang di
sini.

## 2. Bucket penyimpanan

**Storage**, **New bucket**. Isi:

| Kolom | Isi |
|---|---|
| Name | `foto` (huruf kecil semua, tanpa spasi) |
| Public bucket | dinyalakan |

Public di sini berarti siapa pun boleh MEMBACA. Menulis tetap tertutup, dan itu
diatur di langkah berikutnya.

## 3. Izin menulis ke bucket

Kembali ke **SQL Editor**, tempel seluruh blok ini sekaligus, lalu **Run**.

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

**Kalau muncul galat `must be owner of table objects`**, berarti project ini
tidak mengizinkan menyunting kebijakan storage lewat SQL. Itu wajar di sebagian
project dan bukan kesalahanmu. Pakai jalur menu sebagai gantinya:

**Storage**, pilih bucket `foto`, tab **Policies**, lalu **New policy**. Buat
tiga kebijakan, masing-masing dengan target role `authenticated`:

| Nama | Operasi yang dicentang |
|---|---|
| `login boleh unggah foto` | INSERT |
| `login boleh ganti foto` | UPDATE |
| `login boleh hapus foto` | DELETE |

Biarkan isian ekspresinya pada nilai bawaan, yang sudah membatasi ke bucket ini.
Jangan mencentang SELECT: baca publik sudah ditangani setelan Public bucket di
langkah 2, dan menambahkannya di sini hanya menduplikasi hal yang sama di dua
tempat.

## 4. Webhook kedua

**Integrations**, **Database Webhooks**, **Create a new hook**. Di dashboard
yang lebih lama menunya bernama **Database**, **Webhooks**, sama seperti di
Tahap 2a.

| Kolom | Isi |
|---|---|
| Name | `bangun_ulang_situs_foto` |
| Table | `foto` |
| Events | centang **Update** saja |
| Type | **HTTP Request** |
| Method | **POST** |
| URL | alamat Deploy Hook yang sama dengan webhook pengaturan |

Hal yang rawan salah:

- Ini webhook KEDUA. Webhook `pengaturan` dari Tahap 2a jangan diubah dan jangan
  dihapus.
- Alamat Deploy Hook dibuka dari webhook lama (atau dari Vercel, **Settings**,
  **Git**, **Deploy Hooks**), lalu disalin utuh. Alamat ini rahasia: jangan
  ditempel ke chat, kode, atau dokumen mana pun.
- Yang dicentang hanya **Update**. Insert dan Delete dibiarkan kosong.

## Cara menguji semuanya benar

Dijalankan oleh agen di Task 1 Step 2, bukan oleh kamu. Webhook tidak bisa dibaca
dari luar, jadi pembuktiannya baru ada nanti, saat satu foto diunggah dari
halaman admin dan Vercel memperlihatkan build baru.
