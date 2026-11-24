"""Pembuktian keamanan Tahap 2a. Dijalankan terhadap project Supabase sungguhan.

Skrip ini DIMULAI dengan kontrol positif. Alasannya: kalau kunci atau project
sedang bermasalah, SEMUA permintaan akan ditolak, termasuk keempat permintaan
yang memang diharap ditolak. Tanpa kontrol positif skrip ini akan mencetak empat
baris OK dan "0 masalah" tepat ketika ia sudah tidak menguji apa pun lagi, yaitu
tes yang tidak bisa gagal. Tes yang tidak bisa gagal lebih buruk daripada tidak
ada tes, karena ia memberi rasa aman yang palsu.
"""
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
    except Exception as e:
        return 0, f"{type(e).__name__}: {e}"


def main():
    if not URL or not KEY:
        print("GAGAL: PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY kosong")
        return 1

    # 0. KONTROL POSITIF. Baca publik memang DIIZINKAN dengan sengaja: proses
    # build perlu mengambil nilainya dan isinya memang tampil di situs publik.
    # Jadi permintaan ini WAJIB berhasil. Kalau tidak, keempat pembuktian
    # penolakan di bawah tidak bermakna.
    kode, isi = panggil("GET", "/rest/v1/pengaturan?id=eq.1&select=whatsapp")
    if kode != 200:
        print(f"GAGAL kontrol positif: baca tabel pengaturan dengan kunci anon")
        print(f"      balas HTTP {kode}, seharusnya 200. Balasan: {isi}")
        print("")
        print("BERHENTI. Kunci anon atau project Supabase sedang bermasalah")
        print("(kunci salah, project dijeda, tabel tidak ada, atau jaringan mati).")
        print("Karena itu keempat pembuktian penolakan di bawah TIDAK dijalankan:")
        print("kalau dijalankan semuanya akan 'ditolak' hanya karena tidak ada yang")
        print("tersambung, dan hasilnya TIDAK BOLEH DIPERCAYA sebagai bukti keamanan.")
        print("check_keamanan: 1 masalah (kontrol positif gagal, pembuktian tidak jalan)")
        return 1
    print(f"OK  kontrol positif: baca publik dengan kunci anon berhasil (HTTP {kode})")

    gagal = []

    # 1. update tanpa login harus ditolak
    kode, isi = panggil("PATCH", "/rest/v1/pengaturan?id=eq.1",
                        {"whatsapp": "DIBAJAK"})
    if kode < 400:
        gagal.append(f"update tanpa login DITERIMA (HTTP {kode}). Ini lubang serius. "
                     f"Balasan: {isi}")
    else:
        print(f"OK  update tanpa login ditolak (HTTP {kode})")

    # 2. pendaftaran akun baru harus ditolak
    kode, isi = panggil("POST", "/auth/v1/signup",
                        {"email": "uji-keamanan@contoh.invalid",
                         "password": "KataSandiUji12345"})
    if kode < 400:
        gagal.append(f"pendaftaran DITERIMA (HTTP {kode}). Matikan di Authentication. "
                     f"Balasan: {isi}")
    elif "signup_disabled" not in isi:
        # Kode >= 400 sendiri TIDAK cukup. Supabase membalas 422 juga untuk
        # alasan lain, misalnya alamat email yang tidak sah, sehingga penolakan
        # bisa datang dari validasi email, bukan dari pendaftaran yang dimatikan.
        gagal.append(f"pendaftaran ditolak (HTTP {kode}) TAPI bukan karena "
                     f"signup_disabled, jadi belum terbukti pendaftaran publik "
                     f"sudah dimatikan. Balasan: {isi}")
    else:
        print(f"OK  pendaftaran ditolak (HTTP {kode}, signup_disabled)")

    # 3. insert TANPA LOGIN harus ditolak
    kode, isi = panggil("POST", "/rest/v1/pengaturan", {"id": 2})
    if kode < 400:
        gagal.append(f"insert tanpa login DITERIMA (HTTP {kode}). Tidak boleh ada "
                     f"baris kedua. Balasan: {isi}")
    else:
        print(f"OK  insert tanpa login ditolak (HTTP {kode})")

    # 4. delete TANPA LOGIN harus ditolak
    kode, isi = panggil("DELETE", "/rest/v1/pengaturan?id=eq.1")
    if kode < 400:
        gagal.append(f"delete tanpa login DITERIMA (HTTP {kode}). Baris tunggal bisa "
                     f"hilang. Balasan: {isi}")
    else:
        print(f"OK  delete tanpa login ditolak (HTTP {kode})")

    # Keadaan tabel sesudahnya. Pembuktian 1 mengirim nilai "DIBAJAK"; kalau
    # permintaan itu ternyata berhasil, tabelnya tercemar dan pemilik situs
    # harus tahu persisnya. Pembuktian 4 bisa menghapus barisnya.
    kode, isi = panggil("GET", "/rest/v1/pengaturan?id=eq.1&select=whatsapp")
    print(f"--  keadaan tabel sesudah pembuktian: HTTP {kode} {isi}")
    if "DIBAJAK" in isi:
        gagal.append("tabel TERCEMAR: kolom whatsapp berisi 'DIBAJAK'. Tidak "
                     "dibersihkan oleh skrip ini, pemilik situs harus memperbaikinya "
                     "sendiri setelah menutup lubangnya.")
    if kode == 200 and isi.strip() in ("[]", ""):
        gagal.append("baris id=1 HILANG setelah pembuktian delete.")

    for g in gagal:
        print("GAGAL", g)
    print(f"check_keamanan: {len(gagal)} masalah")

    # Batas pembuktian. Spec meminta insert dan delete ditolak WALAU SUDAH LOGIN,
    # dibuktikan dengan sesi yang sah. Yang di atas memakai kunci anon, yaitu
    # TANPA sesi, jadi klaimnya lebih lemah daripada yang diminta spec.
    print("")
    print("BELUM TERUJI: varian 'sudah login' dari pembuktian 3 dan 4.")
    print("  Pembuktian di atas dijalankan dengan kunci anon, yaitu TANPA sesi.")
    print("  Spec meminta insert dan delete ditolak WALAU SUDAH LOGIN, dibuktikan")
    print("  dengan sesi yang sah. Itu butuh kata sandi akun admin, yang hanya")
    print("  dipegang pemilik situs, jadi skrip ini TIDAK bisa membuktikannya.")
    print("  Penalaran dari skema (bukan pengukuran): authenticated hanya diberi")
    print("  'grant select, update', jadi lapisan GRANT sudah menolak insert dan")
    print("  delete sebelum aturan akses baris diperiksa. Tidak adanya kebijakan")
    print("  insert/delete adalah lapisan kedua. Keduanya harus diperiksa langsung")
    print("  oleh pemilik situs memakai sesinya sendiri.")

    return 1 if gagal else 0


if __name__ == "__main__":
    sys.exit(main())
