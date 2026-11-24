"""Membuktikan check_foto.py bisa MERAH.

Selama kolom `berkas` masih null, check_foto melaporkan "0 gambar diperiksa",
yang berarti belum membuktikan apa pun. Skrip ini menyuntikkan gambar rusak ke
salinan dist lalu memastikan penjaganya bereaksi.

Pemakaian: python tools/verify/mutasi_check_foto.py dist <folder-kerja>
"""
import io, os, shutil, subprocess, sys

BASE, WORK = sys.argv[1], sys.argv[2]
GERBANG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check_foto.py")
SISIP = "</body>"

def img(tag):
    return ("index.html", SISIP, tag + SISIP)

# (nama, berkas, dari, ke), harus membuat check_foto melaporkan masalah
KASUS = [
    ("tanpa alt",    *img('<img src="/a.jpg" width="10" height="10">')),
    ("alt kosong",   *img('<img src="/a.jpg" alt="" width="10" height="10">')),
    ("tanpa width",  *img('<img src="/a.jpg" alt="x" height="10">')),
    ("tanpa height", *img('<img src="/a.jpg" alt="x" width="10">')),
]
# Kontrol positif: gambar yang sah harus lolos DAN terhitung. Tanpa ini, penjaga
# yang menolak segalanya atau tidak membaca apa pun akan tampak "bagus".
SAH = ("gambar sah (kontrol positif)", *img('<img src="/a.jpg" alt="x" width="10" height="10">'))

def jalankan():
    r = subprocess.run([sys.executable, GERBANG, WORK], capture_output=True, text=True)
    baris = r.stdout.strip().splitlines()
    return r.returncode, (baris[-1] if baris else "(kosong)")

def salin():
    if os.path.exists(WORK):
        shutil.rmtree(WORK)
    shutil.copytree(BASE, WORK)

def mutasi_img(nama, berkas, dari, ke):
    salin()
    p = os.path.join(WORK, berkas)
    s = io.open(p, encoding="utf-8").read()
    s2 = s.replace(dari, ke, 1)
    if s2 == s:
        return None, "MUTASI TIDAK MENDARAT, pola tidak cocok"
    io.open(p, "w", encoding="utf-8", newline="").write(s2)
    # buktikan dari disk, bukan dari memori
    di_disk = io.open(p, encoding="utf-8").read()
    if di_disk == s or ke not in di_disk:
        return None, "berkas di disk tidak berubah"
    return jalankan(), None

hasil = []
def lapor(nama, wajib_merah, kode, akhir):
    merah = kode != 0 and not akhir.startswith("check_foto: 0 masalah")
    benar = merah if wajib_merah else (not merah and ", 1 gambar diperiksa" in akhir)
    print(f"  {'bagus ' if benar else 'LOLOS '} {nama} -> {akhir}")
    hasil.append(benar)

for nama, berkas, dari, ke in KASUS:
    r, galat = mutasi_img(nama, berkas, dari, ke)
    if galat:
        print(f"  ??     {nama}: {galat}"); hasil.append(False); continue
    lapor(nama, True, *r)

r, galat = mutasi_img(*SAH)
if galat:
    print(f"  ??     {SAH[0]}: {galat}"); hasil.append(False)
else:
    lapor(SAH[0], False, *r)

# berkas 600 KB
salin()
dirfoto = os.path.join(WORK, "assets", "foto")
os.makedirs(dirfoto, exist_ok=True)
besar = os.path.join(dirfoto, "besar.jpg")
with open(besar, "wb") as f:
    f.write(b"\0" * (600 * 1024))
if not os.path.exists(besar) or os.path.getsize(besar) != 600 * 1024:
    print("  ??     berkas 600 KB: berkas di disk tidak sesuai"); hasil.append(False)
else:
    lapor("berkas 600 KB", True, *jalankan())

if os.path.exists(WORK):
    shutil.rmtree(WORK)
tangkap = sum(hasil)
print(f"mutasi_check_foto: {tangkap} dari {len(hasil)} sesuai harapan")
sys.exit(0 if all(hasil) else 1)
