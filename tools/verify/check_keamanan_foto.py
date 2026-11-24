"""Pembuktian keamanan tabel `foto` dan bucket `foto`. Dijalankan terhadap
project Supabase sungguhan.

Skrip ini DIMULAI dengan kontrol positif, mengikuti pola `check_keamanan.py`.
Alasannya: kalau kunci atau project sedang bermasalah, SEMUA permintaan akan
ditolak, termasuk yang memang diharap ditolak. Tanpa kontrol positif skrip ini
akan mencetak deretan OK dan "0 masalah" tepat ketika ia sudah tidak menguji
apa pun, yaitu tes yang tidak bisa gagal. Ini bukan kekhawatiran teoretis: di
Tahap 2a versi `check_keamanan.py` tanpa kontrol positif dijalankan dengan
kunci sengaja salah dan benar-benar melaporkan empat OK dan "0 masalah".

Dua jebakan yang sudah terukur dan sengaja dihindari di sini:

1. Bucket `foto` dibatasi ke image/png, image/jpeg, image/webp. Mengunggah
   text/plain ditolak dengan `invalid_mime_type`, yaitu penolakan dari
   pembatasan jenis berkas, BUKAN dari aturan akses baris. Karena itu
   pembuktian unggah memakai image/jpeg dengan isi JPEG minimal, dan badan
   balasannya WAJIB memuat `row-level security`.

2. Menghapus berkas yang tidak ada dijawab 404 `Object not found`, jadi izinnya
   kemungkinan belum sempat diperiksa. Pembuktian hapus hanya dijalankan kalau
   bucket benar-benar berisi berkas; kalau kosong, pembuktian itu DILEWATI
   dengan sebabnya dicetak, bukan dihitung sebagai lulus.
"""
import os, sys, json, urllib.request, urllib.error

URL = os.environ.get("PUBLIC_SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("PUBLIC_SUPABASE_ANON_KEY", "")

# JPEG minimal: penanda SOI, blok APP0 JFIF, lalu EOI. Isinya tidak penting,
# yang menentukan lolos tidaknya pembatasan jenis berkas adalah Content-Type.
JPEG_MINIMAL = (b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01"
                b"\x00\x01\x00\x00\xff\xd9")


def panggil(metode, jalur, muatan=None, mentah=None, jenis="application/json",
            token=None):
    req = urllib.request.Request(URL + jalur, method=metode)
    req.add_header("apikey", KEY)
    req.add_header("Authorization", "Bearer " + (token or KEY))
    # jenis=None berarti header Content-Type sengaja TIDAK dikirim. Itu perlu
    # untuk DELETE ke storage: dengan "application/json" dan badan kosong,
    # layanannya menjawab 400 FastifyError "Body cannot be empty", yaitu
    # penolakan dari pemeriksaan bentuk permintaan, bukan dari izin. Sudah
    # diukur, bukan dugaan.
    if jenis:
        req.add_header("Content-Type", jenis)
    if mentah is not None:
        data = mentah
    elif muatan is not None:
        data = json.dumps(muatan).encode()
    else:
        data = None
    try:
        with urllib.request.urlopen(req, data, timeout=20) as r:
            return r.status, r.read().decode(errors="replace")[:300]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")[:300]
    except Exception as e:
        return 0, f"{type(e).__name__}: {e}"


def berhenti(sebab, kode, isi):
    print(f"GAGAL kontrol positif: {sebab}")
    print(f"      balas HTTP {kode}, seharusnya 200. Balasan: {isi}")
    print("")
    print("BERHENTI. Kunci anon atau project Supabase sedang bermasalah")
    print("(kunci salah, project dijeda, tabel atau bucket tidak ada, atau")
    print("jaringan mati). Karena itu pembuktian penolakan di bawah TIDAK")
    print("dijalankan: kalau dijalankan semuanya akan 'ditolak' hanya karena")
    print("tidak ada yang tersambung, dan hasilnya TIDAK BOLEH DIPERCAYA")
    print("sebagai bukti keamanan.")
    print("check_keamanan_foto: 1 masalah (kontrol positif gagal, "
          "pembuktian tidak jalan)")
    return 1


def main():
    if not URL or not KEY:
        print("GAGAL: PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY kosong")
        return 1

    # 0a. KONTROL POSITIF PERTAMA. Baca publik tabel `foto` memang DIIZINKAN
    # dengan sengaja: proses build mengambil seluruh barisnya dan isinya tampil
    # di situs publik. Jadi permintaan ini WAJIB berhasil.
    kode, isi = panggil("GET", "/rest/v1/foto?limit=1&select=slot")
    if kode != 200:
        return berhenti("baca tabel foto dengan kunci anon", kode, isi)
    print(f"OK  kontrol positif 1: baca tabel foto dengan kunci anon "
          f"berhasil (HTTP {kode})")

    # 0b. KONTROL POSITIF KEDUA, soal bucket. Urutan yang dicoba:
    #   1) GET /storage/v1/bucket/foto. Endpoint metadata bucket menolak kunci
    #      anon dan menjawab 404 NoSuchBucket walau bucketnya ada, jadi
    #      kegagalannya di sini BUKAN tanda bucket hilang.
    #   2) Daftar isi bucket, lalu unduh berkas yang memang ada. Ini kontrol
    #      positif yang penuh.
    #   3) Kalau bucket kosong, tidak ada berkas untuk diunduh. Yang tersisa
    #      hanyalah bukti lemah bahwa layanan storage bisa dihubungi dengan
    #      kunci anon. Sudah diukur: daftar isi bucket yang namanya SENGAJA
    #      salah pun menjawab HTTP 200 dan `[]`, jadi balasan 200 di sini
    #      TIDAK membuktikan bucketnya ada.
    penuh = False
    berkas = []
    kode, isi = panggil("GET", "/storage/v1/bucket/foto")
    if kode == 200:
        penuh = True
        print(f"OK  kontrol positif 2: baca metadata bucket foto dengan kunci "
              f"anon berhasil (HTTP {kode})")
    else:
        print(f"--  metadata bucket dengan kunci anon: HTTP {kode} {isi}")
        kode_daftar, isi_daftar = panggil(
            "POST", "/storage/v1/object/list/foto", {"prefix": "", "limit": 100})
        if kode_daftar != 200:
            return berhenti("daftar isi bucket foto dengan kunci anon",
                            kode_daftar, isi_daftar)
        try:
            daftar = json.loads(isi_daftar)
        except Exception:
            daftar = []
        berkas = [b.get("name") for b in daftar
                  if isinstance(b, dict) and b.get("name")
                  and not str(b.get("name")).endswith("/")]
        if berkas:
            kode_unduh, isi_unduh = panggil(
                "GET", "/storage/v1/object/public/foto/" + berkas[0])
            if kode_unduh != 200:
                return berhenti(f"unduh berkas publik foto/{berkas[0]}",
                                kode_unduh, isi_unduh)
            penuh = True
            print(f"OK  kontrol positif 2: unduh berkas publik "
                  f"foto/{berkas[0]} dengan kunci anon berhasil "
                  f"(HTTP {kode_unduh})")
        else:
            # Bucket masih kosong, jadi tidak ada berkas untuk diunduh. Tapi
            # keberadaan bucket TETAP bisa diukur, dengan membandingkan badan
            # balasan untuk bucket ini dengan bucket yang namanya dikarang.
            # Kode HTTP-nya sama-sama 400 dan tidak bisa membedakan; yang
            # membedakan hanya badan balasannya:
            #   bucket ADA  -> "Object not found", kode NoSuchKey
            #   bucket TIDAK -> "Bucket not found", kode NoSuchBucket
            _, isi_ada = panggil("GET", "/storage/v1/object/public/foto/"
                                        "berkas-yang-pasti-tidak-ada.jpg")
            _, isi_palsu = panggil("GET", "/storage/v1/object/public/"
                                          "bucket-yang-pasti-tidak-ada/x.jpg")
            if "NoSuchBucket" in isi_ada:
                return berhenti(
                    "kontrol positif 2: bucket foto TIDAK ADA. Layanan storage "
                    "menjawab NoSuchBucket untuk bucket ini, sama seperti untuk "
                    "bucket yang namanya dikarang", 0, isi_ada)
            if "NoSuchBucket" not in isi_palsu:
                return berhenti(
                    "kontrol positif 2: bucket karangan TIDAK menjawab "
                    "NoSuchBucket, jadi pembedaan ini tidak bisa dipakai dan "
                    "keberadaan bucket tidak terbukti", 0, isi_palsu)
            penuh = True
            print("OK  kontrol positif 2: bucket foto ADA (balasannya "
                  "'Object not found',")
            print("    berbeda dari bucket karangan yang menjawab "
                  "'Bucket not found')")
            print("--  bucket masih kosong, jadi baca publik atas berkas "
                  "sungguhan belum terukur")

    gagal = []

    # 1. update tanpa login harus ditolak. Ini pembuktian yang paling penting:
    # tabel `foto` punya kebijakan update untuk authenticated, jadi kalau
    # kebijakan itu ternyata kena ke publik, siapa pun bisa mengganti nama
    # berkas foto di situs pemilik repo.
    kode, isi = panggil("PATCH", "/rest/v1/foto?slot=eq.hero",
                        {"alt": "DIBAJAK"})
    if kode < 400:
        gagal.append(f"update tabel foto tanpa login DITERIMA (HTTP {kode}). "
                     f"Ini lubang serius. Balasan: {isi}")
    else:
        catatan = " (42501, izin ditolak di lapisan GRANT)" if "42501" in isi else ""
        print(f"OK  1. update tabel foto tanpa login ditolak "
              f"(HTTP {kode}){catatan}")

    # 2. unggah tanpa login harus ditolak, dan ditolak oleh ATURAN AKSES BARIS.
    # Memakai image/jpeg dengan sengaja: text/plain akan ditolak lebih dulu
    # oleh pembatasan jenis berkas bucket, dan penolakan itu tidak membuktikan
    # apa pun soal izin.
    kode, isi = panggil("POST", "/storage/v1/object/foto/uji-keamanan.jpg",
                        mentah=JPEG_MINIMAL, jenis="image/jpeg")
    if kode < 400:
        gagal.append(f"unggah ke bucket foto tanpa login DITERIMA "
                     f"(HTTP {kode}). Siapa pun bisa menaruh berkas di bucket "
                     f"situs. Balasan: {isi}")
    elif "invalid_mime_type" in isi or "InvalidMimeType" in isi:
        gagal.append(f"unggah ditolak (HTTP {kode}) TAPI karena jenis berkas, "
                     f"bukan karena aturan akses baris, jadi pembuktian ini "
                     f"TIDAK SAH. Balasan: {isi}")
    elif "row-level security" not in isi:
        # Kode >= 400 sendiri TIDAK cukup. Bucket bisa menolak karena ukuran,
        # jenis berkas, atau nama yang bertabrakan, dan penolakan semacam itu
        # tidak membuktikan izinnya diperiksa.
        gagal.append(f"unggah ditolak (HTTP {kode}) TAPI badan balasannya tidak "
                     f"memuat 'row-level security', jadi belum terbukti yang "
                     f"menolak adalah aturan akses baris. Balasan: {isi}")
    else:
        print(f"OK  2. unggah image/jpeg ke bucket foto tanpa login ditolak "
              f"(HTTP {kode}, row-level security)")

    # 3. hapus berkas bucket tanpa login harus ditolak. Hanya sah terhadap
    # berkas yang SUNGGUH ADA: berkas yang tidak ada dijawab 404 Object not
    # found, dan izinnya kemungkinan belum sempat diperiksa.
    if berkas:
        sasaran = berkas[0]
        kode, isi = panggil("DELETE", "/storage/v1/object/foto/" + sasaran,
                            jenis=None)
        if kode < 400:
            gagal.append(f"hapus berkas foto/{sasaran} tanpa login DITERIMA "
                         f"(HTTP {kode}). Foto di situs bisa dihapus siapa pun. "
                         f"Balasan: {isi}")
        elif "not_found" in isi or "NoSuchKey" in isi:
            gagal.append(f"hapus foto/{sasaran} dijawab 'tidak ditemukan' "
                         f"(HTTP {kode}) padahal berkas itu baru saja terdaftar "
                         f"di bucket, jadi pembuktian ini tidak sah. "
                         f"Balasan: {isi}")
        elif not any(t in isi for t in ("row-level security", "Unauthorized",
                                        "AccessDenied", "42501")):
            # Kode >= 400 sendiri TIDAK cukup. Layanan storage juga menjawab
            # 400 untuk bentuk permintaan yang salah, misalnya FastifyError
            # "Body cannot be empty", dan penolakan semacam itu tidak
            # membuktikan izinnya pernah diperiksa.
            gagal.append(f"hapus foto/{sasaran} ditolak (HTTP {kode}) TAPI "
                         f"badan balasannya tidak menunjukkan penolakan izin, "
                         f"jadi belum terbukti yang menolak adalah aturan akses "
                         f"baris. Balasan: {isi}")
        else:
            print(f"OK  3. hapus berkas foto/{sasaran} tanpa login ditolak "
                  f"(HTTP {kode})")
    else:
        print("DILEWATI 3. pembuktian hapus berkas bucket: bucket foto masih "
              "KOSONG.")
        print("         Menghapus berkas yang tidak ada dijawab 404 'Object "
              "not found', yaitu")
        print("         penolakan yang kemungkinan terjadi SEBELUM izin "
              "diperiksa, jadi tidak")
        print("         membuktikan apa pun. Pembuktian ini DITUNDA sampai ada "
              "berkas")
        print("         sungguhan di bucket, yaitu setelah Task 9. Ini BUKAN "
              "lulus.")

    # 4. insert dan delete baris tabel tanpa login harus ditolak. Tabel `foto`
    # tidak punya kebijakan insert maupun delete, jadi keduanya ditolak secara
    # bawaan. Dua puluh barisnya tetap dan tidak boleh bertambah atau hilang.
    kode, isi = panggil("POST", "/rest/v1/foto", {"slot": "slot-palsu"})
    if kode < 400:
        gagal.append(f"insert baris tabel foto tanpa login DITERIMA "
                     f"(HTTP {kode}). Tidak boleh ada posisi foto tambahan. "
                     f"Balasan: {isi}")
    else:
        catatan = " (42501, izin ditolak di lapisan GRANT)" if "42501" in isi else ""
        print(f"OK  4a. insert baris tabel foto tanpa login ditolak "
              f"(HTTP {kode}){catatan}")

    kode, isi = panggil("DELETE", "/rest/v1/foto?slot=eq.hero")
    if kode < 400:
        gagal.append(f"delete baris tabel foto tanpa login DITERIMA "
                     f"(HTTP {kode}). Posisi foto bisa hilang. Balasan: {isi}")
    else:
        catatan = " (42501, izin ditolak di lapisan GRANT)" if "42501" in isi else ""
        print(f"OK  4b. delete baris tabel foto tanpa login ditolak "
              f"(HTTP {kode}){catatan}")

    # Keadaan tabel sesudahnya. Pembuktian 1 mengirim nilai "DIBAJAK"; kalau
    # permintaan itu ternyata berhasil, tabelnya tercemar dan pemilik situs
    # harus tahu persisnya. Pembuktian 4 bisa menambah atau menghapus baris.
    kode, isi = panggil("GET",
                        "/rest/v1/foto?slot=eq.hero&select=slot,alt,berkas")
    print(f"--  keadaan baris hero sesudah pembuktian: HTTP {kode} {isi}")
    if "DIBAJAK" in isi:
        gagal.append("tabel TERCEMAR: kolom alt pada slot hero berisi "
                     "'DIBAJAK'. Tidak dibersihkan oleh skrip ini, pemilik "
                     "situs harus memperbaikinya sendiri setelah menutup "
                     "lubangnya.")
    if kode == 200 and isi.strip() in ("[]", ""):
        gagal.append("baris slot hero HILANG setelah pembuktian delete.")

    kode, isi = panggil("GET", "/rest/v1/foto?slot=eq.slot-palsu&select=slot")
    print(f"--  baris slot-palsu sesudah pembuktian: HTTP {kode} {isi}")
    if kode == 200 and isi.strip() not in ("[]", ""):
        gagal.append("baris 'slot-palsu' ADA di tabel: pembuktian insert "
                     "ternyata mendarat. Tidak dibersihkan oleh skrip ini.")

    for g in gagal:
        print("GAGAL", g)
    print(f"check_keamanan_foto: {len(gagal)} masalah")
    if not penuh:
        print("Catatan: kontrol positif kedua DILEWATI dan pembuktian 3 "
              "DITUNDA, lihat di atas.")

    # Batas pembuktian, sama seperti di check_keamanan.py.
    print("")
    print("BELUM TERUJI: varian 'sudah login' dari seluruh pembuktian di atas.")
    print("  Pembuktian di atas dijalankan dengan kunci anon, yaitu TANPA "
          "sesi, jadi")
    print("  namanya 'tanpa login ditolak', bukan 'ditolak'. Yang belum "
          "terukur: bahwa")
    print("  sesi yang sudah login hanya boleh update tabel foto dan mengelola "
          "bucket")
    print("  foto, dan tetap ditolak untuk insert dan delete baris. Itu butuh "
          "kata sandi")
    print("  akun admin, yang hanya dipegang pemilik situs, jadi skrip ini "
          "TIDAK bisa")
    print("  membuktikannya.")
    print("  Penalaran dari skema (bukan pengukuran): tabel foto tidak punya "
          "kebijakan")
    print("  insert maupun delete, jadi keduanya ditolak secara bawaan walau "
          "sudah")
    print("  login. Pemilik situs harus memeriksanya langsung dengan sesinya "
          "sendiri.")
    if not penuh:
        print("  BELUM TERUJI juga: bahwa bucket foto benar-benar ada dan bisa "
              "dibaca")
        print("  publik, serta bahwa hapus berkas tanpa login ditolak. "
              "Keduanya butuh")
        print("  berkas sungguhan di bucket, yaitu setelah Task 9.")

    return 1 if gagal else 0


if __name__ == "__main__":
    sys.exit(main())
