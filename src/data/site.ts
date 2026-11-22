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
export async function getSite(): Promise<Site> {
  return {
    nama: "DH Makeup Studio",
    area: ["Bandung", "Subang", "Cimahi", "Jakarta"],
    kontak: {
      whatsapp: null,
      instagram: null,
      email: null,
      jamOperasional: null,
    },
    kebijakan: { dp: null, pembatalan: null },
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
