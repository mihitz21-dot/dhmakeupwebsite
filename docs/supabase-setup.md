# Menyiapkan Supabase untuk Tahap 2a

Ikuti berurutan. Seluruhnya lewat dashboard supabase.com dan vercel.com,
tidak ada yang perlu dikerjakan dari terminal.

## 1. Buat tabel dan aturan aksesnya

Buka project Supabase, masuk ke **SQL Editor**, tempel seluruh blok di bawah,
lalu tekan **Run**.

```sql
create table if not exists pengaturan (
  id              int primary key default 1 check (id = 1),
  whatsapp        text,
  instagram       text,
  email           text,
  jam_operasional text,
  dp              text,
  pembatalan      text,
  area            text[] not null default '{}',
  diperbarui      timestamptz not null default now()
);

insert into pengaturan (id, area)
values (1, array['Bandung','Subang','Cimahi','Jakarta'])
on conflict (id) do nothing;

alter table pengaturan enable row level security;

create policy "publik boleh baca" on pengaturan
  for select using (true);

create policy "login boleh ubah" on pengaturan
  for update to authenticated using (true) with check (true);

create or replace function set_diperbarui()
returns trigger language plpgsql as $fn$
begin
  new.diperbarui = now();
  return new;
end $fn$;

create trigger pengaturan_diperbarui
  before update on pengaturan
  for each row execute function set_diperbarui();
```

`check (id = 1)` memaksa tabel ini hanya boleh punya satu baris, sehingga tidak
akan pernah ada dua baris pengaturan yang saling bertentangan.

Tidak ada kebijakan untuk insert maupun delete, jadi keduanya ditolak secara
bawaan. Barisnya dibuat sekali di atas dan tidak pernah ditambah atau dihapus.

## 2. Matikan pendaftaran publik

Ini langkah paling penting di seluruh dokumen ini.

**Authentication -> Sign In / Providers -> Email**, lalu matikan
**Allow new users to sign up**.

Secara bawaan Supabase mengizinkan siapa pun mendaftar. Kalau dibiarkan, orang
asing bisa membuat akun, lolos pemeriksaan "sudah login", lalu mengganti nomor
WhatsApp di situs dengan nomornya sendiri.

## 3. Buat satu akun admin

**Authentication -> Users -> Add user -> Create new user**.

Isi email dan kata sandi, lalu centang **Auto Confirm User** supaya tidak perlu
verifikasi email. Simpan kata sandinya di pengelola kata sandi.

Ini satu-satunya akun yang akan pernah ada.

## 4. Ambil dua nilai untuk aplikasi

**Project Settings -> API**, salin:

- **Project URL**
- **anon public** key

Keduanya memang dirancang untuk publik dan akan ikut terbaca di kode halaman.
Pengamanannya bukan dari menyembunyikan kunci, melainkan dari aturan akses baris
pada langkah 1. Yang **tidak boleh** dibagikan ke mana pun adalah
**service_role**, dan kunci itu tidak dipakai di Tahap 2a.

### Pasang di dua tempat

Di komputer, buat berkas `.env` di akar project. Berkas ini sudah diabaikan git.

    PUBLIC_SUPABASE_URL=...
    PUBLIC_SUPABASE_ANON_KEY=...

Di Vercel, **Settings -> Environment Variables**, tambahkan dua nama yang sama
dengan nilai yang sama, untuk environment Production dan Preview.

## 5. Buat Deploy Hook di Vercel

**Settings -> Git -> Deploy Hooks**. Beri nama `supabase-cms`, pilih branch
`main`, lalu **Create Hook**. Salin alamat yang diberikan.

Alamat ini bersifat rahasia. Siapa pun yang memilikinya bisa memicu build
berulang-ulang. Jangan menaruhnya di kode, dan jangan mengirimkannya lewat chat.

## 6. Sambungkan ke Supabase

**Database -> Webhooks -> Create a new hook**.

- Name: `bangun-ulang-situs`
- Table: `pengaturan`
- Events: centang **Update** saja
- Type: **HTTP Request**, method **POST**
- URL: alamat Deploy Hook dari langkah 5

Dengan cara ini alamat Deploy Hook hanya hidup di sisi server Supabase dan tidak
pernah sampai ke peramban.

## Cara menguji semuanya benar

1. **SQL Editor**, jalankan `select * from pengaturan;`. Harus memberi satu baris.
2. Masih di SQL Editor, jalankan `update pengaturan set whatsapp = '0812' where id = 1;`.
   Lalu cek tab **Deployments** di Vercel, harus muncul build baru.
3. Coba daftar akun baru lewat halaman login aplikasi nanti. Harus ditolak.

## Kalau project tertidur

Tier gratis dijeda setelah tujuh hari tanpa aktivitas. Akibatnya build berikutnya
gagal, dan itu memang disengaja: Vercel tetap menyajikan versi sebelumnya,
sehingga situs yang hidup tidak pernah kehilangan nomor kontaknya. Bangunkan
project dari dashboard, lalu picu build ulang.
