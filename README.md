# Jubiläums-Guide – 27. Hochzeitstag (Sa 31.10.2026)

Live: **https://stephandel.github.io/jubilaeum-2026/** (ohne Anmeldung, Likes gemeinsam für Stephan und Bilgen).
Lokal: `index.html` per Doppelklick öffnen (Likes dann nur auf diesem Gerät).

## Aufbau
- `index.html` Restaurants · `nachmittag.html` Nachmittag & Abends · `cafes.html` Cafés
- `data/*.json` → `python3 build-data.py` → `data.js` (Daten für die Seiten; nie `data.js` von Hand ändern)
- `likestore.js` entscheidet am Ort der Seite: auf `stephandel.github.io` gemeinsamer Stand über den
  Cloudflare-Worker `fuerte-sync` (Art `jub`, Quelltext im Fuerte-Repo unter `worker/`), sonst localStorage.
- `likestore-online.js` ist nur für die claude.ai-Artefakt-Fassung (Artefakt-Datenbank).
- `QA-Bericht.md` Prüfprotokoll, Abweichungen, offene Punkte.

## Veröffentlichen (nach Änderungen)
Die Live-Seite ist das Repository `stephandel/jubilaeum-2026` (GitHub Pages, Zweig `main`).
Es wird aus dem Ordner `jubilaeum-guide/` dieses Projekts erzeugt:

```
git add jubilaeum-guide && git commit -m "…"
git branch -D pages-export; git subtree split --prefix=jubilaeum-guide -b pages-export
git push https://github.com/stephandel/jubilaeum-2026.git pages-export:main
```

Nach 30–60 s ist die Änderung online.

## Likes zurücksetzen
Alle Guide-Likes löschen (nur Art `jub`, nichts vom Fuerte-Planer):

```
curl -s -X POST -H "Origin: https://stephandel.github.io" -H "Content-Type: application/json" \
  -d '{"by":"stephan","jub":[]}' https://fuerte-sync.stephanhandel.workers.dev/marks | grep -o '"jub":{[^}]*}'
```
