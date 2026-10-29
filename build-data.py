#!/usr/bin/env python3
"""Liest alle JSON-Dateien aus data/, führt Überschreibungen zusammen und schreibt data.js.

Aufruf (beliebig oft wiederholbar):  python3 build-data.py
Nur Standardbibliothek. Ändert nichts in data/.
"""
import glob
import json
import os
import re

HIER = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HIER, "data")

# Reihenfolge der 9 von Stephan vorausgewählten Restaurants, danach die 5 Zusatz-Empfehlungen
AUSWAHL = ["das-atelier", "mary-jane", "rieds", "der-philosoph", "doblers",
           "tourist-trap", "grenzhof", "turmrestaurant", "minoh"]
ZUSATZ = ["spinne", "atable", "kurfuerstenstube", "ziegler", "bistronauten"]
CAFE_SCHWELLE = 4.7
STAND = "29.10.2026"
START = "Dirschauer Weg, 68307 Mannheim"


def lade(name, standard=None):
    pfad = os.path.join(DATA, name)
    if not os.path.exists(pfad):
        return standard
    with open(pfad, encoding="utf-8") as f:
        return json.load(f)


def bilder_pruefen(eintrag, fehlend):
    for b in eintrag.get("bilder") or []:
        datei = b.get("datei")
        ok = bool(datei) and os.path.isfile(os.path.join(HIER, datei))
        b["vorhanden"] = ok
        if not ok:
            fehlend.append(f"{eintrag.get('slug')}: {datei}")


def ort_basis(ort):
    # "Mannheim (Quadrate)" -> Mannheim, "Heidelberg-Grenzhof" -> Heidelberg
    if not ort:
        return None
    return ort.split(" (")[0].split("-")[0].strip()


def ort_kicker(ort):
    # "Mannheim (Quadrate)" -> "Mannheim · Quadrate"; Viertel nur, wenn es in den Daten steht
    if not ort:
        return None
    m = re.match(r"^(.*?)\s*\((.*)\)$", ort)
    if m:
        return f"{m.group(1)} · {m.group(2)}"
    if "-" in ort:
        teil = ort.split("-", 1)
        return f"{teil[0]} · {teil[1]}"
    return ort


def entfernung(slug_liste, entf):
    for s in slug_liste:
        if s in entf and isinstance(entf[s], dict):
            e = dict(entf[s])
            e["quelle"] = entf.get("_quelle")
            return e
    return None


def bewertung_ueberschreiben(e, keys, bew):
    e["bewertung_original"] = {"wert": e.get("google_bewertung"), "anzahl": e.get("google_anzahl"),
                               "quelle": e.get("google_quelle")}
    for k in keys:
        if k in bew and isinstance(bew[k], dict):
            e["google_bewertung"] = bew[k].get("bewertung")
            e["google_anzahl"] = bew[k].get("anzahl")
            e["google_quelle"] = "Google Maps, live 29.10.2026"
            e["google_live"] = True
            return
    e["google_live"] = False


def beispiel_info(pb, allg_hinweis):
    # Summe gilt als "ca.", wenn ein Preis fehlt oder ein Hinweis (fehlende Getränkepreise o. Ä.) existiert
    fehlt = any(p.get("preis") is None for p in pb.get("positionen") or [])
    hinweis = pb.get("summe_hinweis") or pb.get("hinweis")
    pb["unvollstaendig"] = bool(fehlt or hinweis or allg_hinweis)
    return pb


def restaurants(bew, entf, fehlend):
    liste = []
    for slug in AUSWAHL + ZUSATZ:
        r = lade(f"restaurant-{slug}.json")
        if r is None:
            print(f"WARNUNG: restaurant-{slug}.json fehlt")
            continue
        r["zusatz"] = slug in ZUSATZ
        v = lade(f"verf-{slug}.json")
        if v:
            # Verfügbarkeitsprüfung überschreibt Reservierung, Telefon, Öffnungszeiten (nur wenn Wert vorhanden)
            for k in ["reservierung", "telefon"] + [k for k in v if k.startswith("oeffnung_")]:
                if v.get(k) is not None:
                    r[k] = v[k]
            ng = list(r.get("nicht_geprueft") or [])
            for x in v.get("nicht_geprueft") or []:
                if x not in ng:
                    ng.append(x)
            r["nicht_geprueft"] = ng
            r["verf_geprueft"] = True
        bewertung_ueberschreiben(r, [slug], bew)
        res = r.get("reservierung") or {}
        st = (res.get("verfuegbar_31_10") or "unbekannt").strip().lower()
        r["status"] = st if st in ("ja", "nein") else "unbekannt"
        r["entfernung"] = entfernung([slug], entf)
        r["ort_basis"] = ort_basis(r.get("ort"))
        r["ort_kicker"] = ort_kicker(r.get("ort"))
        r["preisbeispiele"] = [beispiel_info(p, r.get("preisbeispiele_hinweis")) for p in r.get("preisbeispiele") or []]
        bilder_pruefen(r, fehlend)
        liste.append(r)
    return liste


def cafes(bew, entf, fehlend):
    liste = []
    for pfad in sorted(glob.glob(os.path.join(DATA, "cafe-*.json"))):
        with open(pfad, encoding="utf-8") as f:
            c = json.load(f)
        slug = c.get("slug") or os.path.basename(pfad)[5:-5]
        bewertung_ueberschreiben(c, [slug, f"cafe-{slug}"], bew)
        g = c.get("google_bewertung")
        if g is None:
            c["schwelle"] = "unbekannt"
        elif g < CAFE_SCHWELLE:
            c["schwelle"] = "referenz"
        elif g == CAFE_SCHWELLE:
            c["schwelle"] = "grenzfall"
        else:
            c["schwelle"] = "ok"
        c["entfernung"] = entfernung([slug, f"cafe-{slug}"], entf)
        c["ort_basis"] = ort_basis(c.get("ort"))
        c["ort_kicker"] = ort_kicker(c.get("ort"))
        bilder_pruefen(c, fehlend)
        liste.append(c)
    liste.sort(key=lambda c: (-(c.get("google_bewertung") or 0), c.get("name") or ""))
    return liste


def nachmittag(entf, fehlend):
    liste = []
    for name in ["nachmittag-ma.json", "nachmittag-hd.json"]:
        for n in lade(name, []) or []:
            n["entfernung"] = entfernung([n.get("slug")], entf)
            bilder_pruefen(n, fehlend)
            liste.append(n)
    return liste


def veranstaltungen():
    liste = []
    for name, region in [("veranstaltungen-ma.json", "Mannheim und Umgebung"),
                         ("veranstaltungen-hd.json", "Heidelberg und Umgebung")]:
        for v in lade(name, []) or []:
            v["datei_region"] = region
            liste.append(v)
    return liste


def main():
    bew = lade("bewertungen.json", {}) or {}
    entf = lade("entfernungen.json", {}) or {}
    fehlend = []
    daten = {
        "meta": {
            "stand": STAND,
            "startadresse": START,
            "bewertung_quelle": bew.get("_quelle"),
            "entfernung_quelle": entf.get("_quelle"),
        },
        "restaurants": restaurants(bew, entf, fehlend),
        "cafes": cafes(bew, entf, fehlend),
        "nachmittag": nachmittag(entf, fehlend),
        "veranstaltungen": veranstaltungen(),
        "koordinaten": {k: v for k, v in (lade("koordinaten.json", {}) or {}).items() if not k.startswith("_")},
        "toptipps": lade("toptipps.json", []) or [],
    }
    daten["meta"]["fehlende_bilder"] = fehlend
    text = ("// Automatisch erzeugt von build-data.py – nicht von Hand bearbeiten.\n"
            "window.GUIDE_DATA = " + json.dumps(daten, ensure_ascii=False, indent=1) + ";\n")
    with open(os.path.join(HIER, "data.js"), "w", encoding="utf-8") as f:
        f.write(text)
    versionsstempel_setzen()
    d = daten
    print(f"data.js geschrieben: {len(d['restaurants'])} Restaurants, {len(d['cafes'])} Cafés, "
          f"{len(d['nachmittag'])} Nachmittagsoptionen, {len(d['veranstaltungen'])} Veranstaltungen")
    print("Status:", {s: sum(1 for r in d["restaurants"] if r["status"] == s) for s in ("ja", "unbekannt", "nein")})
    ohne = [x["slug"] for x in d["cafes"] + d["nachmittag"] if not x.get("entfernung")]
    print(f"Ohne Entfernung ({len(ohne)}):", ", ".join(ohne) or "–")
    print(f"Fehlende Bilder ({len(fehlend)}):", ", ".join(fehlend) or "–")


def versionsstempel_setzen():
    """Hängt an data.js, script.js, likestore.js, style.css und base.css in den HTML-Dateien
    einen Versionsstempel (?v=…) aus dem Inhalt an. So holt der Browser nach jeder Änderung
    die neue Datei statt einer alten Kopie aus dem Zwischenspeicher (GitHub Pages, iPhone)."""
    import hashlib
    import re
    dateien = ["data.js", "script.js", "likestore.js", "style.css", "base.css", "start.js", "planer.js"]
    dateien = [n for n in dateien if os.path.exists(os.path.join(HIER, n))]
    stempel = {}
    for name in dateien:
        with open(os.path.join(HIER, name), "rb") as f:
            stempel[name] = hashlib.md5(f.read()).hexdigest()[:8]
    for html in ["index.html", "restaurants.html", "nachmittag.html", "cafes.html", "planer.html"]:
        if not os.path.exists(os.path.join(HIER, html)):
            continue
        pfad = os.path.join(HIER, html)
        with open(pfad, encoding="utf-8") as f:
            inhalt = f.read()
        neu = inhalt
        for name, v in stempel.items():
            neu = re.sub(r'(["\'])' + re.escape(name) + r'(\?v=[0-9a-f]+)?(["\'])',
                         lambda m: m.group(1) + name + "?v=" + v + m.group(3), neu)
        if neu != inhalt:
            with open(pfad, "w", encoding="utf-8") as f:
                f.write(neu)
            print(f"{html}: Versionsstempel aktualisiert")


if __name__ == "__main__":
    main()
