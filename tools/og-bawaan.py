"""Memotret tools/og-bawaan.html menjadi public/assets/og-bawaan.jpg.

Cara menjalankan, dari akar repo:

    python tools/og-bawaan.py

Memakai Playwright yang sudah dipakai tools/verify/check_browser.py, jadi tidak
ada dependensi baru. Ukurannya 1200x630 karena itu yang dipakai WhatsApp,
Facebook, dan Twitter untuk kartu pratinjau besar. Mutu JPEG 85 adalah
kompromi: di bawah itu gradasi blush mulai berpita, di atas itu berkasnya
membengkak tanpa terlihat lebih baik di ponsel.

Keluarannya dicetak beserta ukuran berkas supaya bisa langsung dibandingkan
dengan batas 300 KB.
"""
import os
import sys

from playwright.sync_api import sync_playwright

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUMBER = os.path.join(AKAR, "tools", "og-bawaan.html")
TUJUAN = os.path.join(AKAR, "public", "assets", "og-bawaan.jpg")
LEBAR, TINGGI = 1200, 630
BATAS_KB = 300


def main() -> int:
    if not os.path.exists(SUMBER):
        print("GAGAL sumber tidak ada:", SUMBER)
        return 1
    os.makedirs(os.path.dirname(TUJUAN), exist_ok=True)

    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": LEBAR, "height": TINGGI},
                        device_scale_factor=1)
        pg.goto("file:///" + SUMBER.replace(os.sep, "/"))
        # Font Google dimuat dari jaringan. Tanpa menunggu, potretnya bisa
        # memakai Georgia dan hasilnya tidak sama dengan situsnya.
        try:
            pg.wait_for_function("document.fonts.ready.then(() => true)",
                                 timeout=15000)
        except Exception as e:  # noqa: BLE001
            print("PERINGATAN font mungkin belum siap:", e)
        pg.wait_for_timeout(400)
        pg.screenshot(path=TUJUAN, type="jpeg", quality=85,
                      clip={"x": 0, "y": 0, "width": LEBAR, "height": TINGGI})
        b.close()

    kb = os.path.getsize(TUJUAN) / 1024
    print(f"{TUJUAN}: {kb:.1f} KB, {LEBAR}x{TINGGI}")
    if kb > BATAS_KB:
        print(f"GAGAL lebih dari {BATAS_KB} KB")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
