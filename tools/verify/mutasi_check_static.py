import io, os, shutil, subprocess, sys
BASE, WORK = sys.argv[1], sys.argv[2]
KASUS = [
    ("hapus satu <section>",   "index.html",        "<section", "<div"),
    ("hapus satu bingkai foto","index.html",        'class="ph', 'class="xx'),
    ("tambah <h1> kedua",      "kontak/index.html", "</body>",  "<h1>dua</h1></body>"),
    ("sisipkan em dash",       "ulasan/index.html", "</body>",  "<p>teks\u2014teks</p></body>"),
    ("hapus atribut lang",     "tentang/index.html",'<html lang="id"', "<html"),
    ("blokir zoom",            "paket/index.html",  "</head>",  '<meta name="viewport" content="user-scalable=no"></head>'),
    ("tautan mati",            "layanan/index.html","</body>",  '<a href="/tidak-ada-sama-sekali">x</a></body>'),
]
for nama, berkas, dari, ke in KASUS:
    if os.path.exists(WORK): shutil.rmtree(WORK)
    shutil.copytree(BASE, WORK)
    p = os.path.join(WORK, berkas)
    s = io.open(p, encoding='utf-8').read()
    s2 = s.replace(dari, ke, 1)
    if s2 == s:
        print(f"  ??     {nama}: MUTASI TIDAK MENDARAT, pola tidak cocok"); continue
    io.open(p, 'w', encoding='utf-8', newline='').write(s2)
    # buktikan dari disk, bukan dari memori
    if io.open(p, encoding='utf-8').read() == s:
        print(f"  ??     {nama}: berkas di disk tidak berubah"); continue
    r = subprocess.run([sys.executable, 'tools/verify/check_static.py', WORK],
                       capture_output=True, text=True)
    akhir = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else '(kosong)'
    tag = "LOLOS " if akhir.endswith("0 masalah") else "bagus "
    print(f"  {tag} {nama} -> {akhir}")
if os.path.exists(WORK): shutil.rmtree(WORK)
