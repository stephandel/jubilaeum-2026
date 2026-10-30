# Jubiläums-Guide – 27. Hochzeitstag (Sa 31.10.2026)

Live: **https://stephandel.github.io/jubilaeum-2026/** (ohne Anmeldung, Likes gemeinsam für Stephan und Bilgen).
Lokal: `index.html` per Doppelklick öffnen (Likes dann nur auf diesem Gerät).

## Aufbau
- `index.html` Startseite (start.js) · `nachmittag.html` · `cafes.html` · `restaurants.html` · `planer.html` (planer.js, Leaflet, OSRM-Routen)
- `data/koordinaten.json` (OpenStreetMap Nominatim, für Karte, Luftbild und Routen), `data/toptipps.json` (sechs Tagesideen; optional `start` = Abfahrtszeit für den Planer, `folge` = Reihenfolge)
- `wetter/` = Meteogramm-Baustein aus dem Fuerte-Projekt („Wetter Tool“), auf der Startseite ausklappbar
- Gemeinsam über den Worker: Likes (Art `jub`), „Unser Tag“ (Art `jub`, slug `tag|feld|wert`), Kommentare (Notizen `jub|…`)
- „Unser Tag“ speichert seit 30.10. zusätzlich `zp` = Zeitplan-Kurzform aus dem Planer (`1300;1327-1427c;1456-1640n;1700-1930r;2009`, höchstens 70 Zeichen). Fehlt sie, rechnet die Startseite den Zeitplan selbst (`JGH.zeitplanRechnen`, gleiche Regeln wie `planer.js`) und zeichnet ihn ins Wetterdiagramm.
- Restaurants mit `michelin: {auszeichnung: stern1|bib|teller, url}` bekommen ein Abzeichen (selbst gezeichnet, `michelinHtml` in script.js). Auszeichnung auf guide.michelin.com im Browser ablesen: `dataLayer`-Feld `distinction`.
- Ist der Worker nicht erreichbar, zeigt die Seite oben einen gelben Hinweis (`verbindungHinweis`), statt still nur die Likes des Geräts zu zeigen.
- `data/*.json` → `python3 build-data.py` → `data.js` (Daten für die Seiten; nie `data.js` von Hand ändern)
- `likestore.js` entscheidet am Ort der Seite: auf `stephandel.github.io` gemeinsamer Stand über den
  Cloudflare-Worker `fuerte-sync` (Art `jub`, Quelltext im Fuerte-Repo unter `worker/`), sonst localStorage.
- `likestore-online.js` ist nur für die alte claude.ai-Artefakt-Fassung (https://claude.ai/artifact/NYQ6hy697MfdBb33hrDXKP). Diese trägt seit 30.10. oben einen Hinweis auf die neue Adresse; nicht mehr pflegen.
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
