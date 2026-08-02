#!/usr/bin/env python3
"""Genera la cartella famiglia/ a partire dai file principali.

Stesso contenuto identico, ma senza i link alle mappe: l'app dei familiari
resta una lettura, senza tasti che aprono Google Maps.

Fonte unica: index.html + dati.js. Questo script NON scrive contenuti,
li copia soltanto — cosi' non esistono due verita' da tenere allineate.

Si lancia da dentro la cartella app/:   python3 crea-versione-famiglia.py
"""

import pathlib, re, shutil, json

QUI = pathlib.Path(__file__).parent
FAM = QUI / "famiglia"
FAM.mkdir(exist_ok=True)

# ---- index.html: unica differenza, l'interruttore SENZA_LINK ----------------
html = (QUI / "index.html").read_text(encoding="utf-8")
nuovo, n = re.subn(r"var SENZA_LINK = false;", "var SENZA_LINK = true;", html)
assert n == 1, "interruttore SENZA_LINK non trovato in index.html"
# il manifest e il service worker sono i suoi, non quelli del piano di sopra
nuovo = nuovo.replace('href="manifest.webmanifest"', 'href="manifest.webmanifest"')
(FAM / "index.html").write_text(nuovo, encoding="utf-8")

# ---- dati.js: identico ------------------------------------------------------
shutil.copy2(QUI / "dati.js", FAM / "dati.js")

# ---- service worker: identico, ma con la sua cache -------------------------
sw = (QUI / "sw.js").read_text(encoding="utf-8")
sw = sw.replace('var CACHE = "polonia-2026";', 'var CACHE = "polonia-2026-famiglia";')
(FAM / "sw.js").write_text(sw, encoding="utf-8")

# ---- manifest: stessa app, avvio dalla sua cartella ------------------------
man = json.loads((QUI / "manifest.webmanifest").read_text(encoding="utf-8"))
man["description"] = "Itinerario giorno per giorno del viaggio in Polonia, 4-11 agosto 2026."
(FAM / "manifest.webmanifest").write_text(
    json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# ---- icone e resto ----------------------------------------------------------
for f in QUI.glob("icon-*.png"):
    shutil.copy2(f, FAM / f.name)
for f in ("robots.txt", ".nojekyll"):
    if (QUI / f).exists():
        shutil.copy2(QUI / f, FAM / f)

# ---- controllo: nessun link alle mappe deve sopravvivere --------------------
testo = (FAM / "index.html").read_text(encoding="utf-8")
assert "var SENZA_LINK = true;" in testo
print("famiglia/ rigenerata:", ", ".join(sorted(p.name for p in FAM.iterdir())))
