import { supabase } from '../lib/supabase';

export interface Paket {
  slug: string;
  nama: string;
  harga: number;
  untuk: string;
  penanda: string;
  isi: string[];
  /** Versi ringkas untuk kartu di beranda. */
  ringkas: { untuk: string; penanda: string; isi: string[] };
}

export interface Tambahan {
  nama: string;
  deskripsi: string;
  harga: number;
  satuan: string;
}

export interface Site {
  nama: string;
  area: string[];
  kontak: {
    whatsapp: string | null;
    instagram: string | null;
    email: string | null;
    jamOperasional: string | null;
  };
  kebijakan: { dp: string | null; pembatalan: string | null };
  nav: { href: string; label: string; labelFooter?: string }[];
  paket: Paket[];
  tambahan: Tambahan[];
}

/**
 * Async sejak awal. Di Tahap 2 isi fungsi ini diganti menjadi pengambilan
 * dari Supabase saat build, dan tidak satu pun halaman perlu disunting.
 */
// Kontak.astro menguji `nilai === null` dengan ketat untuk memutuskan antara
// cip "belum diisi" dan tautan sungguhan. Basis data bisa berisi string kosong,
// bukan null, lewat SQL Editor atau penyuntingan sel di dasbor Supabase. Tanpa
// normalisasi ini kolom seperti itu menghasilkan href="mailto:" bertekstkan
// kosong, yaitu tautan tak terlihat yang bisa diklik, dan cip-nya tidak muncul.
// Halaman admin sendiri sudah mengirim null lewat kosongJadiNull(); penjagaan
// di sini untuk semua jalur selain itu.
export function bersih(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

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
  // Disaring SEBELUM diperiksa, bukan sesudah. Kalau urutannya dibalik, kolom
  // berisi {'', '  '} akan lolos pemeriksaan karena panjangnya 2, lalu menyusut
  // jadi kosong, dan build yang seharusnya gagal justru berhasil dengan daftar
  // area kosong.
  const area: string[] = (data.area ?? [])
    .map((a: string) => (a ?? '').trim())
    .filter(Boolean);
  if (area.length === 0) {
    throw new Error('Kolom area kosong. Isi dulu lewat admin atau SQL.');
  }

  return {
    nama: "DH Makeup Studio",
    area,
    kontak: {
      whatsapp: bersih(data.whatsapp),
      instagram: bersih(data.instagram),
      email: bersih(data.email),
      jamOperasional: bersih(data.jam_operasional),
    },
    kebijakan: { dp: bersih(data.dp), pembatalan: bersih(data.pembatalan) },
    nav: [
      { href: "/",           label: "Beranda" },
      { href: "/layanan",    label: "Layanan" },
      { href: "/paket",      label: "Paket", labelFooter: "Paket dan harga" },
      { href: "/portofolio", label: "Portofolio" },
      { href: "/tentang",    label: "Tentang" },
      { href: "/ulasan",     label: "Ulasan" },
      { href: "/kontak",     label: "Kontak" },
    ],
    paket: [
      {
        slug: "essential",
        nama: "Essential",
        harga: 1500000,
        untuk: "Untuk acara sekali jalan: wisuda, lamaran kecil, sesi foto keluarga. Satu sesi, dua sampai tiga jam pengerjaan.",
        penanda: "Tanpa touch up di lokasi",
        isi: [
          "Makeup dan hairdo atau penataan hijab",
          "Bulu mata, kalau Anda mau pakai",
          "Lipstik dan spons untuk dibawa pulang",
          "Satu kali konsultasi online sebelum hari H",
        ],
        ringkas: {
          untuk: "Untuk acara sekali jalan: wisuda, lamaran kecil, sesi foto keluarga.",
          penanda: "Tanpa touch up di lokasi",
          isi: [
            "Makeup dan hairdo atau penataan hijab",
            "Bulu mata, kalau Anda mau pakai",
            "Lipstik dan spons untuk dibawa pulang",
            "Satu kali konsultasi online",
          ],
        },
      },
      {
        slug: "signature",
        nama: "Signature",
        harga: 2500000,
        untuk: "Untuk acara yang berjalan setengah hari dan butuh dirapikan sekali di tengah jalan. Lamaran dan resepsi kecil masuk ke sini.",
        penanda: "Satu kali touch up di lokasi",
        isi: [
          "Semua isi paket Essential",
          "Satu kali retouch sebelum acara dimulai",
          "Konsultasi bentuk wajah dan warna kulit",
          "Biaya perjalanan dalam kota sudah termasuk",
        ],
        ringkas: {
          untuk: "Untuk acara yang berjalan setengah hari dan butuh dirapikan sekali di tengah.",
          penanda: "Satu kali touch up di lokasi",
          isi: [
            "Semua isi paket Essential",
            "Satu kali retouch sebelum acara mulai",
            "Konsultasi bentuk wajah dan warna kulit",
            "Biaya perjalanan dalam kota sudah termasuk",
          ],
        },
      },
      {
        slug: "bridal",
        nama: "Bridal",
        harga: 4500000,
        untuk: "Untuk hari pernikahan penuh, dari akad pagi sampai resepsi malam. Kami tinggal sampai acara selesai.",
        penanda: "Tiga kali touch up, kami standby seharian",
        isi: [
          "Semua isi paket Signature",
          "Retouch sebelum akad dimulai",
          "Dua kali retouch saat resepsi, termasuk ganti warna bibir",
          "Persiapan kulit sebelum riasan dimulai",
        ],
        ringkas: {
          untuk: "Untuk hari pernikahan penuh, dari akad pagi sampai resepsi malam.",
          penanda: "Tiga kali touch up, kami standby",
          isi: [
            "Semua isi paket Signature",
            "Retouch sebelum akad",
            "Dua kali retouch saat resepsi, termasuk ganti warna bibir",
            "Persiapan kulit sebelum riasan dimulai",
          ],
        },
      },
    ],
    tambahan: [
      {
        nama: "Ibu pengantin",
        deskripsi: "Riasan untuk ibu dari mempelai perempuan atau laki-laki, termasuk penataan rambut atau hijab.",
        harga: 750000,
        satuan: "orang",
      },
      {
        nama: "Bridesmaid",
        deskripsi: "Riasan senada untuk rombongan pengiring, menyesuaikan warna baju yang dipakai. Minimal tiga orang.",
        harga: 550000,
        satuan: "orang",
      },
      {
        nama: "Groom",
        deskripsi: "Merapikan kulit supaya tidak memantulkan cahaya di foto, menata alis, dan merapikan rambut.",
        harga: 350000,
        satuan: "sesi",
      },
      {
        nama: "Trial",
        deskripsi: "Sesi percobaan untuk menentukan gaya sebelum hari H. Dua variasi dikerjakan supaya Anda bisa membandingkan langsung di cermin, bukan di foto orang lain.",
        harga: 950000,
        satuan: "sesi",
      },
    ],
  };
}

/** Format rupiah seperti yang dipakai sekarang: "Rp 1.500.000". */
export function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}
