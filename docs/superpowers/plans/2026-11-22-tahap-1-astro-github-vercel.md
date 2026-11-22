# Tahap 1: Port ke Astro, Repo GitHub, Deploy Vercel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memindahkan situs DH Makeup Studio dari 7 berkas HTML statis menjadi project Astro berkomponen di repo GitHub yang terbit otomatis lewat Vercel, tanpa satu pun perubahan tampilan.

**Architecture:** Astro statis (tanpa adapter SSR). Tujuh halaman menjadi `src/pages/*.astro` di atas satu `Base.astro`. Masthead, nav sheet, dan footer yang sekarang disalin 7 kali menjadi komponen tunggal. Seluruh nilai yang berulang (kontak, paket, area layanan) pindah ke `src/data/site.ts` lewat fungsi `getSite()` yang **async sejak awal**, supaya Tahap 2 cukup mengganti isi fungsi itu tanpa menyunting halaman mana pun. CSS dan JS dipindah apa adanya, tidak disunting.

**Tech Stack:** Astro, Node 24.15.0, npm 11.12.1, git 2.56, Python + Playwright (untuk gerbang verifikasi), Vercel (deploy), GitHub (repo).

## Global Constraints

- Repo: `https://github.com/mihitz21-dot/dhmakeupwebsite.git`. Sudah ada, **PUBLIK**, kosong, branch utama `main`.
- Lokasi project baru: `D:\Imam\Projects\dhmakeupwebsite` (path bash: `/d/Imam/Projects/dhmakeupwebsite`).
- Lokasi project lama: `D:\Imam\Claude\Website\Dh Makeup New`. **Tidak dihapus** sampai Tahap 1 lulus.
- Seluruh konfigurasi git memakai `--local`. Konfigurasi global di device ini hanya berisi `core.editor` dan tidak boleh disentuh, karena ada repo lain di komputer yang sama.
- `user.email` wajib memakai alamat `...@users.noreply.github.com`. Repo publik, dan email di riwayat commit tidak bisa dicabut tanpa menulis ulang riwayat.
- Token GitHub: **fine-grained**, dibatasi ke repo `dhmakeupwebsite` saja, izin `Contents: Read and write`. **Perintah penyimpanan kredensial dijalankan sendiri oleh pemilik repo di terminalnya.** Nilai token tidak boleh muncul di output perintah mana pun, tidak boleh ditulis ke berkas yang di-commit, dan tidak boleh diminta lewat percakapan.
- `gh` CLI **tidak terpasang**. Semua urusan GitHub lewat `git` biasa dan web.
- Vercel CLI tidak terkonfirmasi terpasang. Penyambungan dilakukan lewat dashboard Vercel.
- Tidak ada perubahan tampilan. CSS (`assets/site.css`, 893 baris) dan JS (`assets/site.js`, 299 baris) dipindah **apa adanya**, byte per byte.
- Tidak ada em dash (`—`) di berkas mana pun yang dihasilkan.
- Tujuh folder sisa Stitch tidak ikut pindah: `about_lun_a_makeup_artist`, `contact_lun_a_makeup_artist`, `lun_a_makeup_artist_official_website`, `packages_lun_a_makeup_artist`, `portfolio_lun_a_makeup_artist`, `services_lun_a_makeup_artist`, `testimonials_lun_a_makeup_artist`.

### Invarian yang diukur dari versi sekarang

Setiap angka di bawah ini wajib sama persis setelah port. Diukur pada 2026-11-22.

| Halaman | `<h1>` | `<section>` | bingkai `.ph` | `href=` | kata terbaca |
|---|---|---|---|---|---|
| index | 1 | 6 | 10 | 41 | 642 |
| kontak | 1 | 4 | 0 | 29 | 484 |
| layanan | 1 | 5 | 0 | 30 | 704 |
| paket | 1 | 5 | 0 | 32 | 614 |
| portofolio | 1 | 3 | 9 | 29 | 310 |
| tentang | 1 | 5 | 1 | 30 | 518 |
| ulasan | 1 | 4 | 0 | 31 | 343 |
| **total** | 7 | 32 | 20 | 222 | **3615** |

Jumlah `href=` boleh berubah **hanya** karena perubahan bentuk alamat (`kontak.html` menjadi `/kontak`), bukan karena tautan hilang atau bertambah. Jumlah kata terbaca tidak boleh berubah sama sekali.

---

## Struktur Berkas

| Berkas | Tanggung jawab |
|---|---|
| `package.json` | Dependensi dan skrip npm |
| `astro.config.mjs` | Konfigurasi Astro |
| `.gitignore` | Mencegah node_modules, dist, dan kredensial masuk repo |
| `src/styles/site.css` | Seluruh gaya. Salinan persis, tidak disunting |
| `src/scripts/site.js` | Reveal, menu ponsel, filter galeri, formulir. Salinan persis |
| `src/data/site.ts` | `getSite()`. Satu-satunya sumber nilai yang berulang |
| `src/layouts/Base.astro` | Kerangka html, head, masthead, nav sheet, footer |
| `src/components/Masthead.astro` | Bilah atas dan navigasi desktop |
| `src/components/NavSheet.astro` | Lembar navigasi ponsel |
| `src/components/Footer.astro` | Footer |
| `src/components/Plate.astro` | Motif nomor plat |
| `src/components/PhotoSlot.astro` | Bingkai foto kosong atau `<img>`. Jembatan ke Tahap 2b |
| `src/components/Kontak.astro` | Cip placeholder atau tautan kontak sungguhan |
| `src/pages/*.astro` | Tujuh halaman. Hanya naskah dan susunan bagian |
| `public/foto/` | Foto asli, plus panduan pengisian |
| `tools/verify/check_static.py` | Tautan mati, heading, em dash, invarian jumlah |
| `tools/verify/check_browser.py` | Kontras, target sentuh, overflow |
| `tools/verify/check_interactions.py` | Formulir, filter galeri, menu ponsel |
| `tools/verify/snapshot.py` | Rekam teks terbaca dan tangkapan layar |
| `tools/verify/compare.py` | Bandingkan dua hasil rekaman |
| `tools/verify/README.md` | Cara memasang dan menjalankan |
| `docs/DESIGN.md` | Arah desain, dipindah dari `bridal_beauty_atelier/` |
| `docs/superpowers/specs/` | Spec |
| `docs/superpowers/plans/` | Rencana ini |

---

## Task 1: Project baru, repo git, commit pertama

**Files:**
- Create: `/d/Imam/Projects/dhmakeupwebsite/` beserta isinya
- Create: `/d/Imam/Projects/dhmakeupwebsite/.gitignore`
- Create: `/d/Imam/Projects/_dhmakeup-baseline/` (di luar repo, tidak di-commit)

**Interfaces:**
- Consumes: berkas dari `D:\Imam\Claude\Website\Dh Makeup New`
- Produces: repo git di `/d/Imam/Projects/dhmakeupwebsite` dengan commit pertama berisi situs HTML apa adanya, sudah terhubung ke `origin`

- [ ] **Step 1: Buat folder tujuan dan salinan baseline**

Baseline dipakai sebagai pembanding "sebelum" dan sengaja ditaruh di luar repo supaya tidak ikut ter-commit.

```bash
mkdir -p /d/Imam/Projects/dhmakeupwebsite
mkdir -p /d/Imam/Projects/_dhmakeup-baseline
cd "/d/Imam/Claude/Website/Dh Makeup New"
cp *.html /d/Imam/Projects/_dhmakeup-baseline/
cp -r assets /d/Imam/Projects/_dhmakeup-baseline/
ls -1 /d/Imam/Projects/_dhmakeup-baseline/
```

Expected: 7 berkas `.html` dan folder `assets`.

- [ ] **Step 2: Salin berkas yang ikut pindah ke repo baru**

```bash
cd "/d/Imam/Claude/Website/Dh Makeup New"
R=/d/Imam/Projects/dhmakeupwebsite
mkdir -p "$R/src/styles" "$R/src/scripts" "$R/public/foto" "$R/docs/superpowers/specs" "$R/docs/superpowers/plans"
cp assets/site.css "$R/src/styles/site.css"
cp assets/site.js  "$R/src/scripts/site.js"
cp assets/foto/LETAKKAN-FOTO-DI-SINI.txt "$R/public/foto/"
cp bridal_beauty_atelier/DESIGN.md "$R/docs/DESIGN.md"
cp docs/superpowers/specs/*.md "$R/docs/superpowers/specs/"
cp docs/superpowers/plans/*.md "$R/docs/superpowers/plans/"
mkdir -p "$R/_lama" && cp *.html "$R/_lama/"
```

`_lama/` menampung HTML asli sementara sebagai acuan saat porting. Dihapus di Task 9.

- [ ] **Step 3: Verifikasi CSS dan JS tersalin tanpa berubah**

```bash
cd "/d/Imam/Claude/Website/Dh Makeup New"
R=/d/Imam/Projects/dhmakeupwebsite
diff assets/site.css "$R/src/styles/site.css" && echo "CSS identik"
diff assets/site.js  "$R/src/scripts/site.js"  && echo "JS identik"
```

Expected: dua baris "identik", tanpa output diff.

- [ ] **Step 4: Tulis `.gitignore`**

File: `/d/Imam/Projects/dhmakeupwebsite/.gitignore`

```gitignore
node_modules/
dist/
.astro/
.vercel/
.env
.env.*
*.local

# kredensial, tidak pernah masuk repo
.git-credentials
dh-credentials

# keluaran verifikasi
tools/verify/out/
```

- [ ] **Step 5: Inisialisasi git, seluruhnya `--local`**

Ganti `<NAMA>` dan `<EMAIL-NOREPLY>` dengan nilai sebenarnya. Alamat noreply diambil dari GitHub: **Settings → Emails → Keep my email addresses private**.

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git init
git config --local user.name  "<NAMA>"
git config --local user.email "<EMAIL-NOREPLY>"
git branch -M main
git remote add origin https://github.com/mihitz21-dot/dhmakeupwebsite.git
```

- [ ] **Step 6: Pastikan tidak ada konfigurasi global yang tersentuh**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
echo "--- lokal ---"; git config --local --list
echo "--- global ---"; git config --global --list
```

Expected: blok lokal memuat `user.name`, `user.email`, `remote.origin.url`. Blok global **hanya** memuat `core.editor`. Jika global memuat `user.*`, hentikan dan laporkan, karena berarti ada yang menulis ke global.

- [ ] **Step 7: Commit pertama**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git add -A
git commit -m "chore: bawa situs statis, spec, dan rencana Tahap 1 ke repo baru"
git log --oneline -1
```

- [ ] **Step 8: Pemilik repo menyimpan token sendiri**

**Langkah ini dijalankan oleh pemilik repo di terminalnya sendiri, bukan oleh agen.** Tujuannya supaya nilai token tidak pernah masuk ke transkrip percakapan.

Buat token dulu di GitHub: Settings → Developer settings → Personal access tokens → **Fine-grained tokens**. Repository access: **Only select repositories → dhmakeupwebsite**. Permissions: **Contents → Read and write**.

Lalu di terminal, pada folder repo:

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git config --local credential.helper "store --file=.git/dh-credentials"
git config --local credential.useHttpPath true
printf 'https://mihitz21-dot:%s@github.com\n' "TEMPEL_TOKEN_DI_SINI" > .git/dh-credentials
chmod 600 .git/dh-credentials 2>/dev/null || true
```

Berkas itu ada di dalam `.git/`, yang tidak pernah ikut ter-commit.

- [ ] **Step 9: Push dan verifikasi**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git push -u origin main
git ls-remote --heads origin main
```

Expected: push berhasil, `ls-remote` menampilkan satu baris `refs/heads/main`.

- [ ] **Step 10: Pastikan token tidak bocor ke repo**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git ls-files | grep -iE "credential|token|\.env" && echo "BAHAYA: ada berkas kredensial ter-commit" || echo "aman: tidak ada kredensial ter-commit"
git log -p --all | grep -ciE "github_pat_|ghp_" | grep -q '^0$' && echo "aman: tidak ada pola token di riwayat" || echo "BAHAYA: ada pola token di riwayat"
```

Expected: dua baris "aman". Jika salah satu "BAHAYA", **cabut token di GitHub segera**, bersihkan, dan buat token baru.

---

## Task 2: Perkakas verifikasi dan rekaman baseline

**Files:**
- Create: `tools/verify/check_static.py`
- Create: `tools/verify/check_browser.py`
- Create: `tools/verify/check_interactions.py`
- Create: `tools/verify/snapshot.py`
- Create: `tools/verify/compare.py`
- Create: `tools/verify/README.md`

**Interfaces:**
- Produces: lima skrip yang dipanggil tiap task berikutnya. `snapshot.py <base-url> <out-dir>` menghasilkan `<out-dir>/text/<halaman>.txt` dan `<out-dir>/shot/<halaman>-<lebar>.png`. `compare.py <dir-a> <dir-b>` keluar dengan kode 0 jika teks identik.

Perkakas ditulis **sebelum** porting supaya tiap langkah porting bisa langsung diuji. Baseline direkam dari situs lama, jadi ada pembanding yang sah.

- [ ] **Step 1: Tulis `tools/verify/README.md`**

```markdown
# Perkakas verifikasi

Butuh Python dan Playwright:

    pip install playwright
    python -m playwright install chromium

## Menjalankan

Situs lama (baseline):

    cd /d/Imam/Projects/_dhmakeup-baseline && python -m http.server 8788

Situs hasil build:

    cd /d/Imam/Projects/dhmakeupwebsite && npm run build
    cd dist && python -m http.server 8777

Lalu:

    python tools/verify/check_static.py dist
    python tools/verify/check_browser.py http://127.0.0.1:8777
    python tools/verify/check_interactions.py http://127.0.0.1:8777
    python tools/verify/snapshot.py http://127.0.0.1:8777 tools/verify/out/baru
    python tools/verify/compare.py tools/verify/out/lama tools/verify/out/baru

Semua skrip keluar dengan kode 0 kalau lulus, selain 0 kalau gagal.
```

- [ ] **Step 2: Tulis `tools/verify/check_static.py`**

```python
"""Pemeriksaan statis atas berkas HTML hasil build."""
import sys, re, os, glob, html as htmlmod

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]
INVARIAN = {
    "index":      {"h1": 1, "section": 6, "ph": 10, "kata": 642},
    "kontak":     {"h1": 1, "section": 4, "ph": 0,  "kata": 484},
    "layanan":    {"h1": 1, "section": 5, "ph": 0,  "kata": 704},
    "paket":      {"h1": 1, "section": 5, "ph": 0,  "kata": 614},
    "portofolio": {"h1": 1, "section": 3, "ph": 9,  "kata": 310},
    "tentang":    {"h1": 1, "section": 5, "ph": 1,  "kata": 518},
    "ulasan":     {"h1": 1, "section": 4, "ph": 0,  "kata": 343},
}

def teks(s):
    b = s[s.find("<body"):]
    b = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", b, flags=re.S)
    b = re.sub(r"<[^>]+>", " ", b)
    return htmlmod.unescape(b).split()

def cari(root, nama):
    for p in (os.path.join(root, nama, "index.html"),
              os.path.join(root, nama + ".html"),
              os.path.join(root, "index.html") if nama == "index" else ""):
        if p and os.path.exists(p):
            return p
    return None

def main(root):
    gagal = []
    peta = {}
    for nama in HALAMAN:
        p = cari(root, nama)
        if not p:
            gagal.append(f"{nama}: berkas tidak ditemukan di {root}")
            continue
        peta[nama] = (p, open(p, encoding="utf-8").read())

    for nama, (p, s) in peta.items():
        inv = INVARIAN[nama]
        aktual = {
            "h1": len(re.findall(r"<h1", s)),
            "section": len(re.findall(r"<section", s)),
            "ph": len(re.findall(r'class="ph[ "]', s)),
            "kata": len(teks(s)),
        }
        for k, v in inv.items():
            if aktual[k] != v:
                gagal.append(f"{nama}: {k} seharusnya {v}, dapat {aktual[k]}")

        if "\u2014" in s:
            gagal.append(f"{nama}: ada em dash")
        if "<html lang=" not in s:
            gagal.append(f"{nama}: tidak ada atribut lang")
        if "user-scalable=no" in s or "maximum-scale" in s:
            gagal.append(f"{nama}: zoom diblokir")
        for perlu in ["<title>", "<header", "<nav", "<main", "<footer", "skip-link"]:
            if perlu not in s:
                gagal.append(f"{nama}: tidak ada {perlu}")

        prev = 0
        for lv in [int(x) for x in re.findall(r"<h([1-4])", s)]:
            if prev and lv > prev + 1:
                gagal.append(f"{nama}: lompatan heading h{prev} ke h{lv}")
            prev = lv

        for href in re.findall(r'href="([^"]+)"', s):
            if href.startswith(("http", "mailto:", "tel:", "#")):
                if href.startswith("#") and f'id="{href[1:]}"' not in s:
                    gagal.append(f"{nama}: anchor mati {href}")
                continue
            jalur, _, frag = href.partition("#")
            tujuan = jalur.strip("/") or "index"
            if tujuan not in peta:
                gagal.append(f"{nama}: tautan mati {href}")
            elif frag and f'id="{frag}"' not in peta[tujuan][1]:
                gagal.append(f"{nama}: anchor mati {href}")

    for g in gagal:
        print("GAGAL", g)
    print(f"check_static: {len(gagal)} masalah")
    return 1 if gagal else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "dist"))
```

- [ ] **Step 3: Jalankan `check_static.py` terhadap situs lama untuk membuktikan angkanya benar**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
python tools/verify/check_static.py /d/Imam/Projects/_dhmakeup-baseline
```

Expected: `check_static: 0 masalah`. Kalau tidak 0, **angka invarian di skrip yang salah**, bukan situsnya. Perbaiki angkanya agar cocok dengan keadaan sekarang, lalu ulangi.

- [ ] **Step 4: Tulis `tools/verify/check_browser.py`**

```python
"""Kontras WCAG AA, target sentuh, dan overflow horizontal."""
import sys
from playwright.sync_api import sync_playwright

HALAMAN = ["", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]

TAP = """() => [...document.querySelectorAll('a[href],button,input,select,textarea,summary')]
  .filter(e => {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const p = e.closest('p, blockquote, .faq__body, .hero__caption');
    if (e.tagName === 'A' && p && getComputedStyle(e).display === 'inline') return false;
    if (e.type === 'checkbox') {
      const lab = document.querySelector('label[for="' + e.id + '"]');
      if (lab && lab.getBoundingClientRect().height >= 44) return false;
    }
    return r.height < 44;
  })
  .map(e => e.tagName + ':' + (e.textContent || e.type || '').trim().slice(0, 22)
            + '/' + Math.round(e.getBoundingClientRect().height))"""

CONTRAST = """() => {
  const lum = c => {
    const [r,g,b] = c.match(/\\d+(\\.\\d+)?/g).slice(0,3).map(Number).map(v => {
      v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const bgOf = el => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
      n = n.parentElement;
    }
    return 'rgb(255,255,255)';
  };
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
    const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5;
    const l1 = lum(cs.color), l2 = lum(bgOf(el));
    const ratio = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
    if (ratio < need) bad.push({t: el.textContent.trim().slice(0,34),
      size: Math.round(size), color: cs.color, bg: bgOf(el),
      ratio: +ratio.toFixed(2), need});
  }
  return bad;
}"""

def main(base):
    gagal = []
    with sync_playwright() as p:
        b = p.chromium.launch()

        m = b.new_context(viewport={"width": 360, "height": 740}, is_mobile=True, has_touch=True)
        mp = m.new_page()
        for h in HALAMAN:
            mp.goto(f"{base}/{h}", wait_until="networkidle")
            kecil = mp.evaluate(TAP)
            if kecil:
                gagal.append(f"/{h}: target sentuh di bawah 44px: {kecil}")
        mp.set_viewport_size({"width": 320, "height": 700})
        for h in HALAMAN:
            mp.goto(f"{base}/{h}", wait_until="networkidle")
            ow = mp.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if ow > 0:
                gagal.append(f"/{h}: overflow horizontal {ow}px pada 320px")
        m.close()

        d = b.new_context(viewport={"width": 1440, "height": 1000})
        dp = d.new_page()
        for h in HALAMAN:
            dp.goto(f"{base}/{h}", wait_until="networkidle")
            dp.evaluate("() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'))")
            dp.wait_for_timeout(1200)
            buruk = dp.evaluate(CONTRAST)
            if buruk:
                gagal.append(f"/{h}: kontras di bawah AA: {buruk}")
        d.close()
        b.close()

    for g in gagal:
        print("GAGAL", g)
    print(f"check_browser: {len(gagal)} masalah")
    return 1 if gagal else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/")))
```

Catatan: `wait_for_timeout(1200)` ada supaya transisi 200ms benar-benar selesai. Tanpa itu, pengukuran bisa mengambil frame di tengah transisi dan melaporkan kegagalan palsu, seperti yang pernah terjadi pada tombol filter.

- [ ] **Step 5: Buktikan `check_browser.py` lulus terhadap situs lama**

```bash
cd /d/Imam/Projects/_dhmakeup-baseline && (python -m http.server 8788 >/dev/null 2>&1 &) && sleep 2
cd /d/Imam/Projects/dhmakeupwebsite
python tools/verify/check_browser.py http://127.0.0.1:8788
```

Catatan: situs lama memakai `.html`, jadi untuk baseline jalankan dengan `HALAMAN` versi `.html`. Tambahkan dukungan itu di skrip:

```python
HALAMAN = ["", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]
EXT = ".html" if "--html" in sys.argv else ""
# lalu: mp.goto(f"{base}/{h + EXT if h else 'index.html' if EXT else ''}", ...)
```

Jalankan baseline dengan `--html`:

```bash
python tools/verify/check_browser.py http://127.0.0.1:8788 --html
```

Expected: `check_browser: 0 masalah`.

- [ ] **Step 6: Tulis `tools/verify/check_interactions.py`**

```python
"""Klik-tayang: formulir 4 state, filter galeri, menu ponsel."""
import sys
from playwright.sync_api import sync_playwright

def main(base, ext=""):
    gagal = []
    konsol = []
    def hal(n):
        if ext:
            return f"{base}/{n}.html" if n != "index" else f"{base}/index.html"
        return f"{base}/" if n == "index" else f"{base}/{n}"

    with sync_playwright() as p:
        b = p.chromium.launch()
        c = b.new_context(viewport={"width": 1440, "height": 1000})
        c.grant_permissions(["clipboard-read", "clipboard-write"])
        pg = c.new_page()
        pg.on("pageerror", lambda e: konsol.append(f"pageerror: {e}"))
        pg.on("console", lambda m: konsol.append(m.text) if m.type == "error" else None)

        # --- filter galeri ---
        pg.goto(hal("portofolio"), wait_until="networkidle")
        semua = pg.locator("figure[data-look]:visible").count()
        if semua != 9:
            gagal.append(f"filter: seharusnya 9 foto, dapat {semua}")
        pg.get_by_role("button", name="Adat").click()
        pg.wait_for_timeout(300)
        if pg.locator("figure[data-look]:visible").count() != 1:
            gagal.append("filter Adat: seharusnya 1 foto")
        if pg.get_by_role("button", name="Adat").get_attribute("aria-pressed") != "true":
            gagal.append("filter Adat: aria-pressed tidak true")
        # kategori kosong
        pg.get_by_role("button", name="Semua").click()
        pg.wait_for_timeout(200)
        pg.evaluate("() => document.querySelector('[data-look=\\"adat\\"]').setAttribute('data-look','natural')")
        pg.get_by_role("button", name="Adat").click()
        pg.wait_for_timeout(300)
        if not pg.locator("#gallery-empty").is_visible():
            gagal.append("filter: kategori kosong tidak memunculkan empty state")

        # --- formulir ---
        pg.goto(hal("kontak"), wait_until="networkidle")
        out = pg.locator("#booking-outcome")
        if out.get_attribute("data-state") != "empty":
            gagal.append("formulir: state awal bukan empty")
        pg.locator("#booking-submit").click()
        pg.wait_for_timeout(400)
        if out.get_attribute("data-state") != "error":
            gagal.append("formulir kosong: state bukan error")
        for f in ["nama", "wa", "tanggal", "consent"]:
            if not pg.locator(f"#err-{f}").inner_text().strip():
                gagal.append(f"formulir: tidak ada pesan error untuk {f}")
        pg.fill("#f-nama", "Rani"); pg.fill("#f-wa", "12345")
        pg.fill("#f-tanggal", "2020-01-01"); pg.check("#f-consent")
        pg.locator("#booking-submit").click(); pg.wait_for_timeout(400)
        if "lewat" not in pg.locator("#err-tanggal").inner_text():
            gagal.append("formulir: tanggal lampau tidak ditolak")
        pg.fill("#f-wa", "081234567890"); pg.fill("#f-tanggal", "2027-06-12")
        pg.locator("#booking-submit").click(); pg.wait_for_timeout(700)
        if out.get_attribute("data-state") != "ready":
            gagal.append("formulir valid: state bukan ready")
        pg.get_by_role("button", name="Salin pesan").click()
        pg.wait_for_timeout(500)
        if "Tersalin" not in pg.locator("#copy-status").inner_text():
            gagal.append("formulir: salin pesan gagal")
        c.close()

        # --- menu ponsel ---
        m = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        mp = m.new_page()
        mp.on("pageerror", lambda e: konsol.append(f"mobile pageerror: {e}"))
        mp.goto(hal("index"), wait_until="networkidle")
        if not mp.locator("#nav-sheet").is_hidden():
            gagal.append("menu: sheet tidak tersembunyi saat muat")
        mp.locator("#nav-open").click(); mp.wait_for_timeout(300)
        if not mp.locator("#nav-sheet").is_visible():
            gagal.append("menu: tidak terbuka")
        if mp.locator("#nav-open").get_attribute("aria-expanded") != "true":
            gagal.append("menu: aria-expanded tidak true")
        mp.keyboard.press("Escape"); mp.wait_for_timeout(300)
        if not mp.locator("#nav-sheet").is_hidden():
            gagal.append("menu: Escape tidak menutup")
        if mp.evaluate("() => document.activeElement.id") != "nav-open":
            gagal.append("menu: fokus tidak kembali ke pemicu")
        m.close()
        b.close()

    for g in gagal:
        print("GAGAL", g)
    for k in konsol:
        print("KONSOL", k)
    print(f"check_interactions: {len(gagal)} masalah, {len(konsol)} error konsol")
    return 1 if (gagal or konsol) else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/"), ".html" if "--html" in sys.argv else ""))
```

- [ ] **Step 7: Buktikan `check_interactions.py` lulus terhadap situs lama**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
python tools/verify/check_interactions.py http://127.0.0.1:8788 --html
```

Expected: `check_interactions: 0 masalah, 0 error konsol`.

- [ ] **Step 8: Tulis `tools/verify/snapshot.py` dan `tools/verify/compare.py`**

`snapshot.py`:

```python
"""Rekam teks terbaca dan tangkapan layar tiap halaman."""
import sys, os, re, html as htmlmod
from playwright.sync_api import sync_playwright

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]
LEBAR = [390, 1440]

def main(base, out, ext=""):
    os.makedirs(f"{out}/text", exist_ok=True)
    os.makedirs(f"{out}/shot", exist_ok=True)
    def url(n):
        if ext:
            return f"{base}/{n}.html"
        return f"{base}/" if n == "index" else f"{base}/{n}"

    with sync_playwright() as p:
        b = p.chromium.launch()
        for w in LEBAR:
            c = b.new_context(viewport={"width": w, "height": 900},
                              is_mobile=(w < 500), device_scale_factor=1)
            pg = c.new_page()
            for n in HALAMAN:
                pg.goto(url(n), wait_until="networkidle")
                pg.evaluate("() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'))")
                pg.wait_for_timeout(900)
                pg.screenshot(path=f"{out}/shot/{n}-{w}.png", full_page=True)
                if w == LEBAR[-1]:
                    t = pg.evaluate("() => document.body.innerText")
                    norm = " ".join(t.split())
                    open(f"{out}/text/{n}.txt", "w", encoding="utf-8").write(norm)
            c.close()
        b.close()
    print(f"snapshot: tersimpan di {out}")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/"), sys.argv[2],
                  ".html" if "--html" in sys.argv else ""))
```

`compare.py`:

```python
"""Bandingkan dua hasil snapshot. Teks wajib identik."""
import sys, os, difflib

HALAMAN = ["index", "kontak", "layanan", "paket", "portofolio", "tentang", "ulasan"]

def main(a, b):
    beda = 0
    for n in HALAMAN:
        fa, fb = f"{a}/text/{n}.txt", f"{b}/text/{n}.txt"
        if not (os.path.exists(fa) and os.path.exists(fb)):
            print("GAGAL", n, "berkas rekaman tidak lengkap"); beda += 1; continue
        ta = open(fa, encoding="utf-8").read().split()
        tb = open(fb, encoding="utf-8").read().split()
        if ta == tb:
            print(f"OK    {n}: teks identik ({len(ta)} kata)")
        else:
            beda += 1
            print(f"GAGAL {n}: teks berbeda ({len(ta)} vs {len(tb)} kata)")
            for baris in list(difflib.unified_diff(ta, tb, lineterm="", n=2))[:40]:
                print("     ", baris)
    print(f"compare: {beda} halaman berbeda")
    return 1 if beda else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")))
```

- [ ] **Step 9: Rekam baseline dan buktikan pembandingnya waras**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
python tools/verify/snapshot.py http://127.0.0.1:8788 tools/verify/out/lama --html
python tools/verify/snapshot.py http://127.0.0.1:8788 tools/verify/out/lama2 --html
python tools/verify/compare.py tools/verify/out/lama tools/verify/out/lama2
```

Expected: tujuh baris `OK`, `compare: 0 halaman berbeda`. Membandingkan baseline dengan dirinya sendiri membuktikan pembandingnya tidak memberi lulus palsu maupun gagal palsu. Jumlah kata total harus 3615.

- [ ] **Step 10: Commit**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
rm -rf tools/verify/out/lama2
git add tools/verify
git commit -m "test: perkakas verifikasi statis, browser, interaksi, dan pembanding snapshot"
```

---

## Task 3: Scaffold Astro dan halaman pertama

**Files:**
- Create: `package.json`, `astro.config.mjs`
- Create: `src/layouts/Base.astro`
- Create: `src/pages/index.astro`

**Interfaces:**
- Consumes: `src/styles/site.css`, `src/scripts/site.js` dari Task 1
- Produces: `Base.astro` dengan props `{ judul: string, deskripsi: string, halaman: string }`. `halaman` berisi path seperti `/` atau `/kontak`.

- [ ] **Step 1: Pasang Astro**

Scaffold manual, bukan `npm create astro`, supaya tidak ada prompt interaktif.

File: `package.json`

```json
{
  "name": "dhmakeupwebsite",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

```bash
cd /d/Imam/Projects/dhmakeupwebsite
npm install astro
node -e "console.log('astro', require('./package.json').dependencies.astro)"
```

Catat versi yang terpasang ke dalam pesan commit. Jangan menebak nomor versi.

- [ ] **Step 2: Tulis `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Keluaran statis murni. Tahap 1 tidak memakai adapter SSR.
  // Format direktori memberi alamat /kontak, bukan /kontak.html.
  build: { format: 'directory' },
});
```

- [ ] **Step 3: Tulis `src/layouts/Base.astro`**

```astro
---
import '../styles/site.css';
import Masthead from '../components/Masthead.astro';
import NavSheet from '../components/NavSheet.astro';
import Footer from '../components/Footer.astro';

interface Props {
  judul: string;
  deskripsi: string;
  halaman: string;
}
const { judul, deskripsi, halaman } = Astro.props;
---
<!DOCTYPE html>
<html lang="id">
<head>
<script is:inline>
/* Reveal menyembunyikan elemen sampai JS mengungkapnya. Kalau site.js gagal
   dimuat, pengaman ini membatalkan penyembunyian supaya konten tidak hilang. */
document.documentElement.className="js";
setTimeout(function(){if(!window.__revealReady)document.documentElement.className="";},4000);
</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{judul}</title>
<meta name="description" content={deskripsi}>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap">
</head>
<body>
<a class="skip-link" href="#main">Lewati ke konten utama</a>
<Masthead halaman={halaman} />
<NavSheet halaman={halaman} />
<main id="main"><slot /></main>
<Footer />
<script>import '../scripts/site.js';</script>
</body>
</html>
```

Tiga hal yang wajib dipertahankan: skrip pengaman di `<head>` memakai `is:inline` supaya tidak diproses dan jalan seketika; `site.js` dimuat lewat `<script>` biasa sehingga Astro membundelnya sebagai modul yang ter-defer, setara `defer` di versi lama; `<main id="main">` tetap ada karena skip link menunjuk ke sana.

- [ ] **Step 4: Buat `src/pages/index.astro` dengan isi apa adanya**

Salin isi `<main>` dari `_lama/index.html`, yaitu seluruhnya **antara** `<main id="main">` dan `</main>`, tanpa diubah sedikit pun. Belum ada komponen selain Base.

```astro
---
import Base from '../layouts/Base.astro';
---
<Base
  judul="DH Makeup Studio | MUA Bandung, Subang, Cimahi, Jakarta"
  deskripsi="DH Makeup Studio merias soft glam, natural, dan kids makeup untuk wedding, lamaran, pre-wedding, wisuda, dan photoshoot di Bandung, Subang, Cimahi, dan Jakarta."
  halaman="/"
>
  <!-- tempel di sini isi <main> dari _lama/index.html apa adanya -->
</Base>
```

Masthead, nav sheet, dan footer yang ada di `_lama/index.html` **tidak** disalin, karena sudah disediakan `Base`. Tautan di dalam isi halaman masih berbentuk `kontak.html` dan dibiarkan dulu; diperbaiki di Step 6.

- [ ] **Step 5: Buat tiga komponen kerangka sementara**

Agar `Base` bisa dibangun, buat `Masthead.astro`, `NavSheet.astro`, dan `Footer.astro` berisi **salinan persis** blok yang sama dari `_lama/index.html`, dengan satu perubahan: ganti `kontak.html` menjadi `/kontak`, `index.html` menjadi `/`, dan seterusnya. Data belum dipakai, itu Task 4.

- [ ] **Step 6: Ubah seluruh tautan di `index.astro` ke bentuk baru**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
sed -i 's|href="index\.html|href="/|g; s|href="kontak\.html|href="/kontak|g; s|href="layanan\.html|href="/layanan|g; s|href="paket\.html|href="/paket|g; s|href="portofolio\.html|href="/portofolio|g; s|href="tentang\.html|href="/tentang|g; s|href="ulasan\.html|href="/ulasan|g' src/pages/index.astro src/components/*.astro
grep -c '\.html' src/pages/index.astro src/components/*.astro
```

Expected: semua menunjukkan `0`.

- [ ] **Step 7: Build dan jalankan gerbang untuk halaman ini**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
npm run build
ls dist
(cd dist && python -m http.server 8777 >/dev/null 2>&1 &) ; sleep 2
curl -s -o /dev/null -w "index: %{http_code}\n" http://127.0.0.1:8777/
```

Expected: build sukses, `dist/index.html` ada, HTTP 200.

- [ ] **Step 8: Bandingkan teks halaman beranda dengan baseline**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
python - <<'PY'
import re, subprocess
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={"width":1440,"height":900}); pg = c.new_page()
    hasil = {}
    for nama, url in [("lama","http://127.0.0.1:8788/index.html"),
                      ("baru","http://127.0.0.1:8777/")]:
        pg.goto(url, wait_until="networkidle")
        pg.evaluate("() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'))")
        pg.wait_for_timeout(900)
        hasil[nama] = pg.evaluate("() => document.body.innerText").split()
    b.close()
print("lama", len(hasil["lama"]), "kata | baru", len(hasil["baru"]), "kata")
print("IDENTIK" if hasil["lama"] == hasil["baru"] else "BERBEDA")
PY
```

Expected: `642 kata` di kedua sisi, dan `IDENTIK`.

- [ ] **Step 9: Commit**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git add package.json package-lock.json astro.config.mjs src/
git commit -m "feat: scaffold Astro dan port halaman beranda ke Base layout"
```

---

## Task 4: `getSite()` dan komponen Kontak

**Files:**
- Create: `src/data/site.ts`
- Create: `src/components/Kontak.astro`
- Modify: `src/components/Masthead.astro`, `src/components/NavSheet.astro`, `src/components/Footer.astro`

**Interfaces:**
- Produces: `getSite(): Promise<Site>` dengan bentuk yang dipakai seluruh task berikutnya. `Kontak.astro` menerima prop `jenis: 'whatsapp' | 'instagram' | 'email'`.

- [ ] **Step 1: Tulis `src/data/site.ts`**

Nilai `paket` dan `tambahan` disalin apa adanya dari `_lama/paket.html`. Jangan mengarang isi baru.

```ts
export interface Paket {
  slug: string;
  nama: string;
  harga: number;
  untuk: string;
  penanda: string;
  isi: string[];
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
  nav: { href: string; label: string }[];
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
      { href: "/paket",      label: "Paket" },
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
```

- [ ] **Step 2: Tulis `src/components/Kontak.astro`**

```astro
---
import { getSite } from '../data/site';

interface Props { jenis: 'whatsapp' | 'instagram' | 'email'; }
const { jenis } = Astro.props;

const site = await getSite();
const nilai = site.kontak[jenis];

const LABEL = {
  whatsapp: 'NOMOR WHATSAPP',
  instagram: 'USERNAME IG',
  email: 'ALAMAT EMAIL',
} as const;

function tautan(j: string, v: string): string {
  if (j === 'whatsapp') return 'https://wa.me/' + v.replace(/\D/g, '');
  if (j === 'instagram') return 'https://instagram.com/' + v.replace(/^@/, '');
  return 'mailto:' + v;
}
---
{nilai === null
  ? <span class="pending">[{LABEL[jenis]}]</span>
  : <a href={tautan(jenis, nilai)}>{nilai}</a>}
```

Inilah aturan "null berarti belum diisi". Selama `null`, yang tampil cip placeholder dan **bukan** tautan, sehingga tidak ada tombol yang diklik lalu tidak membawa ke mana-mana.

- [ ] **Step 3: Ubah `Footer.astro` memakai data dan komponen**

```astro
---
import { getSite } from '../data/site';
import Kontak from './Kontak.astro';
const site = await getSite();
---
<footer class="foot">
  <span class="ghost-no ghost-no--bl" aria-hidden="true">DH</span>
  <div class="wrap">
    <div class="foot__top">
      <div>
        <p class="foot__name">{site.nama}</p>
        <p class="foot__line">Soft glam, natural look, dan kids makeup. Berbasis di Bandung, Subang, dan Cimahi, rutin ke Jakarta, bisa diajak ke luar kota.</p>
      </div>
      <div>
        <h2>Halaman</h2>
        <ul>
          {site.nav.map((n) => <li><a href={n.href}>{n.label}</a></li>)}
        </ul>
      </div>
      <div>
        <h2>Hubungi</h2>
        <ul>
          <li>WhatsApp <Kontak jenis="whatsapp" /></li>
          <li>Instagram <Kontak jenis="instagram" /></li>
          <li>Email <Kontak jenis="email" /></li>
          <li>{site.area.join(', ')}</li>
        </ul>
      </div>
    </div>
    <div class="foot__bottom">
      <span>&copy; 2026 {site.nama}</span>
      <span>Kontak masih kosong, isi sebelum situs dipublikasikan</span>
    </div>
  </div>
</footer>
```

**Perhatian:** di versi lama, daftar "Halaman" pada footer tiap halaman **tidak memuat halaman itu sendiri**, sehingga isinya 6 item, bukan 7. Agar jumlah kata tidak berubah, `Footer.astro` harus menerima prop `halaman` dan menyaringnya. Ubah baris map menjadi:

```astro
{site.nav.filter((n) => n.href !== halaman).map((n) => <li><a href={n.href}>{n.label}</a></li>)}
```

dan tambahkan `interface Props { halaman: string }` serta teruskan `halaman` dari `Base.astro`.

- [ ] **Step 4: Ubah `Masthead.astro` dan `NavSheet.astro` memakai data**

`Masthead.astro`:

```astro
---
import { getSite } from '../data/site';
interface Props { halaman: string; }
const { halaman } = Astro.props;
const site = await getSite();
const cta = halaman === '/kontak' ? '#booking' : '/kontak#booking';
---
<header class="masthead">
  <div class="wrap masthead__in">
    <a class="mark" href="/" aria-label={site.nama + ', ke beranda'}>
      <span class="mark__glyph" aria-hidden="true">DH</span>
      <span>
        <span class="mark__name">{site.nama}</span>
        <span class="mark__sub" set:html={site.area.join(' &middot; ')} />
      </span>
    </a>
    <nav class="nav" aria-label="Navigasi utama">
      {site.nav.map((n) => (
        <a href={n.href} aria-current={halaman === n.href ? 'page' : undefined}>{n.label}</a>
      ))}
    </nav>
    <a class="btn btn--primary btn-cta" href={cta}>Tanya tanggal</a>
    <button class="menu-btn" id="nav-open" type="button" aria-expanded="false" aria-controls="nav-sheet">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 4h14M1 8h14M1 12h14"/></svg>
      Menu
    </button>
  </div>
</header>
```

`NavSheet.astro` memakai pola sama, dengan nomor urut dua digit dari indeks:

```astro
---
import { getSite } from '../data/site';
interface Props { halaman: string; }
const { halaman } = Astro.props;
const site = await getSite();
const cta = halaman === '/kontak' ? '#booking' : '/kontak#booking';
---
<div class="sheet" id="nav-sheet" hidden>
  <button class="sheet__scrim" type="button" aria-label="Tutup menu"></button>
  <div class="sheet__panel" role="dialog" aria-modal="true" aria-label="Navigasi">
    <div class="sheet__head">
      <span class="mark__sub">Halaman</span>
      <button class="sheet__close" type="button" aria-label="Tutup menu">&times;</button>
    </div>
    <nav class="sheet__nav" aria-label="Navigasi ponsel">
      {site.nav.map((n, i) => (
        <a href={n.href} aria-current={halaman === n.href ? 'page' : undefined}>
          <span>{String(i + 1).padStart(2, '0')}</span>{n.label}
        </a>
      ))}
    </nav>
    <a class="btn btn--gold" href={cta}>Tanya tanggal</a>
  </div>
</div>
```

- [ ] **Step 5: Teruskan `halaman` ke Footer di `Base.astro`**

Ubah baris `<Footer />` menjadi `<Footer halaman={halaman} />`.

- [ ] **Step 6: Build dan bandingkan beranda lagi**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
npm run build
(cd dist && python -m http.server 8777 >/dev/null 2>&1 &) ; sleep 2
python tools/verify/check_static.py dist 2>&1 | tail -5
```

Expected: hanya halaman `index` yang ada, jadi `check_static` akan mengeluh 6 halaman tidak ditemukan. Itu wajar pada tahap ini. Yang **tidak** boleh muncul: keluhan tentang `index` sendiri, misalnya jumlah kata berubah.

- [ ] **Step 7: Commit**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git add src/
git commit -m "feat: getSite() async, komponen Kontak, dan masthead/navsheet/footer berbasis data"
```

---

## Task 5: Komponen Plate dan PhotoSlot

**Files:**
- Create: `src/components/Plate.astro`, `src/components/PhotoSlot.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Produces: `Plate` dengan props `{ no: string, label: string }`. `PhotoSlot` dengan props `{ no: string, label: string, file: string, ada?: boolean, varian?: 'terang' | 'gelap', rasio?: '4:5' | '4:6' | '16:12', alt?: string }`.

- [ ] **Step 1: Tulis `src/components/Plate.astro`**

```astro
---
interface Props { no: string; label: string; }
const { no, label } = Astro.props;
---
<div class="plate">
  <span class="plate__no">{no}</span>
  <span class="plate__label">{label}</span>
  <span class="plate__rule" aria-hidden="true"></span>
</div>
```

- [ ] **Step 2: Tulis `src/components/PhotoSlot.astro`**

```astro
---
interface Props {
  no: string;
  label: string;
  file: string;
  ada?: boolean;
  varian?: 'terang' | 'gelap';
  rasio?: '4:5' | '4:6' | '16:12';
  alt?: string;
}
const {
  no, label, file,
  ada = false,
  varian = 'terang',
  rasio = '4:5',
  alt = '',
} = Astro.props;

// Ukuran intrinsik per rasio, dipakai pada atribut width dan height supaya
// ruangnya dipesan dan tata letak tidak bergeser saat foto dimuat.
const DIM: Record<string, [number, number]> = {
  '4:5':   [800, 1000],
  '4:6':   [700, 1050],
  '16:12': [960, 720],
};
const [w, h] = DIM[rasio];
---
{ada
  ? <img src={'/' + file} alt={alt} width={w} height={h} loading="lazy" decoding="async" />
  : (
    <span class={varian === 'gelap' ? 'ph ph--dark' : 'ph'}>
      <span class="ph__no">{no}</span>
      <span class="ph__label">{label}</span>
      <span class="ph__file">{file}</span>
    </span>
  )}
```

Elemen pembungkus selalu `<span>`, bukan `<div>`, karena pada daftar acara di beranda bingkai ini berada di dalam `<a>` dan `<div>` di sana tidak sah menurut HTML. `.ph` sudah `display: grid` di CSS, jadi `<span>` berperilaku sama.

**Inilah jembatan ke Tahap 2b.** Saat foto dikelola Supabase, hanya berkas ini yang berubah: `ada` dan `src` berasal dari data, bukan dari prop statis.

- [ ] **Step 3: Ganti 10 bingkai di `index.astro`**

Beranda punya 10 bingkai: 1 pada hero (`4:5`, terang), 4 pada galeri arsip, dan 5 pada daftar acara (`4:5`, **gelap**). Ganti tiap blok `<div class="ph">` atau `<span class="ph ph--dark">` dengan `<PhotoSlot />` yang nilainya sama persis dengan yang tertulis sekarang.

Contoh, hero:

```astro
<div class="arch">
  <PhotoSlot no="01" label="Foto utama" file="assets/foto/hero.jpg" rasio="4:5" />
</div>
```

Contoh, daftar acara:

```astro
<span class="occ__thumb">
  <PhotoSlot no="01" label="Wedding" file="assets/foto/acara-01.jpg" varian="gelap" rasio="4:5" />
</span>
```

Rasio galeri beranda: plat 01 `4:6`, plat 02 `16:12`, plat 03 `16:12`, plat 04 `4:6`. Nilai `file` disalin persis dari atribut `.ph__file` yang ada sekarang.

- [ ] **Step 4: Ganti 6 blok plate di `index.astro`**

Beranda punya enam `<div class="plate">`: nomor 02 "Yang dikerjakan", 03 "Jenis acara", 04 "Arsip", 05 "Paket", ditambah yang ada di dalam bagian. Ganti tiap satu dengan `<Plate no=".." label=".." />` sesuai nilai yang tertulis sekarang.

- [ ] **Step 5: Build dan bandingkan jumlah bingkai serta teks**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
npm run build
grep -o 'class="ph[ "]' dist/index.html | wc -l
```

Expected: `10`.

```bash
(cd dist && python -m http.server 8777 >/dev/null 2>&1 &) ; sleep 2
python - <<'PY'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={"width":1440,"height":900}).new_page()
    hasil = {}
    for nama, url in [("lama","http://127.0.0.1:8788/index.html"), ("baru","http://127.0.0.1:8777/")]:
        pg.goto(url, wait_until="networkidle")
        pg.evaluate("() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'))")
        pg.wait_for_timeout(900)
        hasil[nama] = pg.evaluate("() => document.body.innerText").split()
    b.close()
print(len(hasil["lama"]), len(hasil["baru"]), "IDENTIK" if hasil["lama"]==hasil["baru"] else "BERBEDA")
PY
```

Expected: `642 642 IDENTIK`.

- [ ] **Step 6: Commit**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git add src/
git commit -m "feat: komponen Plate dan PhotoSlot, beranda memakai keduanya"
```

---

## Task 6: Port enam halaman sisanya

**Files:**
- Create: `src/pages/layanan.astro`, `paket.astro`, `portofolio.astro`, `tentang.astro`, `ulasan.astro`, `kontak.astro`

**Interfaces:**
- Consumes: `Base`, `Plate`, `PhotoSlot`, `Kontak`, `getSite`, `rupiah` dari task sebelumnya

Pola tiap halaman sama persis dengan yang sudah terbukti di beranda, jadi kerjakan satu per satu dan uji setelah masing-masing.

- [ ] **Step 1: Port `layanan.astro`**

Salin isi `<main>` dari `_lama/layanan.html`, bungkus dengan `Base`, ganti tiap `<div class="plate">` dengan `<Plate />`, ubah tautan `.html` ke bentuk baru.

```astro
---
import Base from '../layouts/Base.astro';
import Plate from '../components/Plate.astro';
---
<Base
  judul="Layanan rias | DH Makeup Studio"
  deskripsi="Rincian layanan DH Makeup Studio: wedding, lamaran, pre-wedding, wisuda, photoshoot, dan kids makeup di Bandung, Subang, Cimahi, dan Jakarta."
  halaman="/layanan"
>
  <!-- isi <main> dari _lama/layanan.html -->
</Base>
```

- [ ] **Step 2: Uji halaman layanan**

```bash
cd /d/Imam/Projects/dhmakeupwebsite && npm run build
grep -c '<section' dist/layanan/index.html
grep -c '<h1' dist/layanan/index.html
```

Expected: `5` dan `1`.

- [ ] **Step 3: Port `portofolio.astro` dengan 9 PhotoSlot**

Semuanya `varian="terang"`. Atribut `data-look` tetap berada di elemen `<figure>`, bukan di `PhotoSlot`, karena filter JS mencarinya di sana.

Rasio tiap plat sudah diukur dari kelas yang ada sekarang, jadi tidak perlu ditebak:

| Plat | Kelas `<figure>` | `rasio` | `data-look` |
|---|---|---|---|
| 01 | `shot--w2 shot--tall` | `4:6` | `soft-glam` |
| 02 | `shot--w4 shot--wide` | `16:12` | `soft-glam` |
| 03 | `shot--w4 shot--wide shot--drop` | `16:12` | `natural` |
| 04 | `shot--w2 shot--tall` | `4:6` | `adat` |
| 05 | `shot--w2 shot--tall` | `4:6` | `photoshoot` |
| 06 | `shot--w2 shot--tall` | `4:6` | `natural` |
| 07 | `shot--w2 shot--tall` | `4:6` | `anak` |
| 08 | `shot--w4 shot--wide` | `16:12` | `soft-glam` |
| 09 | `shot--w2 shot--tall` | `4:6` | `proses` |

Nilai `file` dan `label` disalin persis dari `.ph__file` dan `.ph__label` yang tertulis sekarang di `_lama/portofolio.html`.

- [ ] **Step 4: Uji halaman portofolio**

```bash
cd /d/Imam/Projects/dhmakeupwebsite && npm run build
grep -o 'class="ph[ "]' dist/portofolio/index.html | wc -l
grep -o 'data-look=' dist/portofolio/index.html | wc -l
```

Expected: `9` dan `9`.

- [ ] **Step 5: Port `tentang.astro` dengan 1 PhotoSlot**

```astro
<div class="arch">
  <PhotoSlot no="02" label="Foto perias" file="assets/foto/perias.jpg" rasio="4:5" />
</div>
```

- [ ] **Step 6: Port `ulasan.astro`**

Halaman ini tanpa PhotoSlot. Pertahankan blok komentar HTML berisi contoh ulasan, karena itu panduan untuk pemilik situs.

- [ ] **Step 7: Port `kontak.astro`, memakai komponen Kontak**

Tiga baris `.channel` yang sekarang memuat cip placeholder diganti `<Kontak jenis="..." />`. Baris keempat, area layanan, memakai `{site.area.join(', ')}`. Dropdown paket diurus di Task 7, jadi untuk sekarang biarkan apa adanya.

- [ ] **Step 8: Jalankan gerbang statis penuh**

```bash
cd /d/Imam/Projects/dhmakeupwebsite && npm run build
python tools/verify/check_static.py dist
```

Expected: `check_static: 0 masalah`. Kalau ada keluhan jumlah kata, bandingkan halaman itu dengan versi lama untuk menemukan naskah yang tertinggal.

- [ ] **Step 9: Commit**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git add src/pages
git commit -m "feat: port enam halaman sisanya ke Astro"
```

---

## Task 7: `site.paket` menggerakkan tiga tempat

**Files:**
- Modify: `src/pages/index.astro`, `src/pages/paket.astro`, `src/pages/kontak.astro`

**Interfaces:**
- Consumes: `getSite()` dan `rupiah()` dari Task 4

Sekarang harga dan isi paket ditulis terpisah di tiga tempat dan bisa berbeda sendiri tanpa ketahuan. Task ini menyatukannya.

- [ ] **Step 1: Ganti kartu paket di `paket.astro` dengan perulangan**

```astro
---
import { getSite, rupiah } from '../data/site';
const site = await getSite();
---
<div class="tiers">
  {site.paket.map((p, i) => (
    <article class={'tier reveal' + (p.slug === 'bridal' ? ' tier--full' : '')} style={`--i:${i}`}>
      <span class="tier__no">{String(i + 1).padStart(2, '0')}</span>
      <h3 class="tier__name">{p.nama}</h3>
      <p class="tier__price">{rupiah(p.harga)}</p>
      <p class="tier__for">{p.untuk}</p>
      <p class="tier__mark">{p.penanda}</p>
      <ul>
        {p.isi.map((baris) => (
          <li>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1.5 6.5 4.5 9.5 10.5 2.5"/></svg>
            <span>{baris}</span>
          </li>
        ))}
      </ul>
      <a class={'btn ' + (p.slug === 'bridal' ? 'btn--gold' : 'btn--line')} href="/kontak#booking">
        Tanya tanggal untuk {p.nama}
      </a>
    </article>
  ))}
</div>
```

- [ ] **Step 2: Ganti daftar tambahan di `paket.astro`**

```astro
<div class="addons reveal">
  {site.tambahan.map((t) => (
    <div class="addon">
      <p class="addon__name">{t.nama}</p>
      <p class="addon__desc">{t.deskripsi}</p>
      <p class="addon__price">{rupiah(t.harga)} <span class="fine">/ {t.satuan}</span></p>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Ganti kartu paket di `index.astro` dengan perulangan yang sama**

Beranda memakai teks `untuk` versi pendek. Agar tidak mengarang data baru, beranda memakai kalimat pertama dari `p.untuk`:

```astro
<p class="tier__for">{p.untuk.split('. ')[0] + '.'}</p>
```

Periksa hasilnya terhadap `_lama/index.html`. Jika ada satu saja yang tidak sama persis, batalkan pendekatan ini dan tambahkan field `untukSingkat` pada tiap paket di `site.ts` berisi kalimat yang tertulis sekarang.

- [ ] **Step 4: Ganti dropdown paket di `kontak.astro`**

```astro
<select id="f-paket" name="paket">
  <option value="">Belum tahu, minta saran</option>
  {site.paket.map((p) => <option>{p.nama}, {rupiah(p.harga)}</option>)}
  <option>Gabungan dengan tambahan</option>
</select>
```

- [ ] **Step 5: Jalankan gerbang statis**

```bash
cd /d/Imam/Projects/dhmakeupwebsite && npm run build
python tools/verify/check_static.py dist
```

Expected: `check_static: 0 masalah`. Jumlah kata `index`, `paket`, dan `kontak` wajib tetap 642, 614, dan 484.

- [ ] **Step 6: Commit**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git add src/pages
git commit -m "refactor: paket dan harga digerakkan satu sumber data"
```

---

## Task 8: Gerbang verifikasi penuh

**Files:**
- Modify: tidak ada, kecuali perbaikan yang muncul dari temuan

- [ ] **Step 1: Build bersih dan jalankan dua server**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
rm -rf dist && npm run build
pkill -f "http.server 8777" 2>/dev/null; pkill -f "http.server 8788" 2>/dev/null
(cd dist && python -m http.server 8777 >/dev/null 2>&1 &)
(cd /d/Imam/Projects/_dhmakeup-baseline && python -m http.server 8788 >/dev/null 2>&1 &)
sleep 3
```

- [ ] **Step 2: Jalankan tiga pemeriksa**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
python tools/verify/check_static.py dist
python tools/verify/check_browser.py http://127.0.0.1:8777
python tools/verify/check_interactions.py http://127.0.0.1:8777
```

Expected: tiga baris berakhir `0 masalah`, dan `0 error konsol`.

- [ ] **Step 3: Rekam snapshot baru dan bandingkan teks**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
python tools/verify/snapshot.py http://127.0.0.1:8777 tools/verify/out/baru
python tools/verify/compare.py tools/verify/out/lama tools/verify/out/baru
```

Expected: tujuh baris `OK`, `compare: 0 halaman berbeda`, total 3615 kata.

- [ ] **Step 4: Periksa tangkapan layar satu per satu**

Buka berpasangan `tools/verify/out/lama/shot/<halaman>-<lebar>.png` dan `tools/verify/out/baru/shot/<halaman>-<lebar>.png` untuk ketujuh halaman pada 390px dan 1440px, 14 pasang seluruhnya.

Satu perbedaan sudah diketahui dan memang disengaja: alamat pada tautan navigasi. Itu tidak terlihat di tangkapan layar, jadi secara visual keduanya harus sama. **Setiap perbedaan visual lain wajib dijelaskan atau diperbaiki.** Jangan meluluskan perbedaan yang tidak bisa dijelaskan.

- [ ] **Step 5: Periksa ukuran keluaran**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
du -sh dist
find dist -name "*.html" | wc -l
```

Expected: 7 berkas HTML. Ukuran wajar di bawah 1 MB karena belum ada foto.

- [ ] **Step 6: Hapus folder acuan sementara dan commit**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
rm -rf _lama
git add -A
git commit -m "test: gerbang verifikasi penuh lulus terhadap hasil build"
git push
```

---

## Task 9: Sambungkan ke Vercel

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: repo GitHub yang sudah berisi project Astro

- [ ] **Step 1: Tulis `README.md`**

```markdown
# DH Makeup Studio

Situs DH Makeup Studio. Astro, keluaran statis, terbit lewat Vercel.

## Menjalankan

    npm install
    npm run dev      # http://localhost:4321
    npm run build    # keluaran ke dist/

## Struktur

- `src/data/site.ts` satu-satunya sumber nilai yang berulang. `getSite()`
  sengaja async supaya Tahap 2 cukup mengganti isinya dengan pengambilan
  dari Supabase, tanpa menyunting halaman mana pun.
- `src/components/PhotoSlot.astro` bingkai foto. Saat foto dikelola Supabase,
  hanya berkas ini yang berubah.
- `src/styles/site.css` dan `src/scripts/site.js` salinan persis dari versi
  statis. Jangan disunting tanpa menjalankan ulang gerbang verifikasi.

## Mengisi kontak

Ubah `kontak` di `src/data/site.ts`. Nilai `null` berarti belum diisi dan
ditampilkan sebagai cip placeholder, bukan tautan. Mengisi satu nilai
memperbarui seluruh tempat yang memakainya.

## Mengisi foto

Lihat `public/foto/LETAKKAN-FOTO-DI-SINI.txt`.

## Verifikasi

Lihat `tools/verify/README.md`. Jalankan sebelum tiap push yang menyentuh
tampilan.
```

- [ ] **Step 2: Commit dan push**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
git add README.md
git commit -m "docs: README"
git push
```

- [ ] **Step 3: Sambungkan repo di dashboard Vercel**

Dikerjakan oleh pemilik repo lewat web, karena `gh` dan Vercel CLI tidak terpasang.

1. Buka vercel.com, masuk dengan akun GitHub.
2. **Add New → Project → Import** repo `mihitz21-dot/dhmakeupwebsite`.
3. Framework Preset harus terdeteksi **Astro**. Build Command `astro build`, Output Directory `dist`. Jangan diubah.
4. Environment Variables: **kosongkan**. Tahap 1 tidak membutuhkannya.
5. Deploy.

- [ ] **Step 4: Verifikasi situs produksi**

Ganti `<URL>` dengan alamat `.vercel.app` yang diberikan Vercel.

```bash
for h in "" kontak layanan paket portofolio tentang ulasan; do
  printf "%-12s %s\n" "/$h" "$(curl -s -o /dev/null -w '%{http_code}' <URL>/$h)"
done
```

Expected: tujuh baris `200`.

- [ ] **Step 5: Jalankan gerbang browser terhadap situs produksi**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
python tools/verify/check_browser.py <URL>
python tools/verify/check_interactions.py <URL>
```

Expected: `0 masalah` dan `0 error konsol`. Ini membuktikan yang lulus bukan cuma di komputer lokal.

- [ ] **Step 6: Buktikan deploy otomatis bekerja**

```bash
cd /d/Imam/Projects/dhmakeupwebsite
printf '\n' >> README.md
git commit -am "chore: uji deploy otomatis"
git push
```

Tunggu Vercel selesai, lalu muat ulang situs. Jika versi baru terbit tanpa campur tangan, jalur deploy terbukti bekerja.

---

## Self-Review

**Cakupan spec.** Tiap bagian spec sudah ada task-nya: struktur repo (Task 1, 3), duplikasi dihilangkan (Task 4, 5, 7), `getSite()` async (Task 4 Step 1), `null` berarti belum diisi (Task 4 Step 2), kontrak komponen (Task 4, 5), perubahan URL (Task 3 Step 6), repo dan token (Task 1 Step 5 sampai 10), kebijakan rahasia (Task 1 Step 10), syarat lulus (Task 8), Vercel (Task 9).

**Catatan yang ditemukan saat menulis rencana ini dan sudah diperbaiki di dalamnya:**

1. Footer pada versi lama **tidak memuat tautan ke halaman itu sendiri**, sehingga daftarnya 6 item, bukan 7. Kalau `Footer.astro` merender seluruh `site.nav`, jumlah kata tiap halaman bertambah dan pembandingan teks gagal. Sudah ditangani di Task 4 Step 3 dengan prop `halaman` dan penyaringan.
2. Tombol CTA di masthead memakai `#booking` pada halaman Kontak, tetapi `/kontak#booking` pada halaman lain. Sudah ditangani lewat variabel `cta`.
3. `PhotoSlot` wajib merender `<span>`, bukan `<div>`, karena pada daftar acara di beranda bingkai itu berada di dalam `<a>`.
4. Teks `tier__for` di beranda lebih pendek daripada di halaman Paket. Task 7 Step 3 memuat pemeriksaan dan jalan keluar jika pemenggalan kalimat tidak menghasilkan teks yang sama persis.
5. `check_browser.py` membutuhkan jeda 1200ms sebelum mengukur kontras, karena pengukuran di tengah transisi 200ms pernah menghasilkan kegagalan palsu pada tombol filter.
6. Skrip verifikasi harus mendukung dua bentuk alamat, `.html` untuk baseline dan tanpa ekstensi untuk hasil build. Ditangani lewat flag `--html`.

**Konsistensi tipe.** `getSite()` mengembalikan `Promise<Site>` di seluruh task. `rupiah(n: number): string` dipakai konsisten di Task 7. Props `PhotoSlot` sama di Task 5, 6, dan README. Props `Footer` menerima `halaman` sejak Task 4 Step 3 dan diteruskan di Step 5.

**Tanpa placeholder.** Tidak ada TBD maupun TODO. Satu-satunya nilai yang sengaja dikosongkan adalah `<NAMA>`, `<EMAIL-NOREPLY>`, `TEMPEL_TOKEN_DI_SINI`, dan `<URL>`, yang memang hanya pemilik repo yang tahu dan sengaja tidak boleh masuk transkrip.
