# Anleitung für Recherche-Helfer (gilt für alle Agenten)

Projektordner: `/Users/stephanhandel/KI Projekte/27. Jubiläum/jubilaeum-guide/` (Daten in `data/`, Bilder in `img/`). Schema: `data/SCHEMA.md` – zuerst lesen.

Heute ist Donnerstag, 29.10.2026. Zieltag: **Samstag, 31.10.2026**, Abendessen für 2 Personen zwischen 17 und 20 Uhr. Sonntag, 1.11., ist Allerheiligen (Feiertag in BW und RLP) – falls das Öffnungszeiten am Samstag beeinflusst, vermerken.

## Werkzeuge
- WebFetch (Seiten lesen), WebSearch (suchen), Bash mit `curl` (PDFs, JSON-Schnittstellen, Bilder laden). PDFs mit `curl -L -o` in den Scratchpad laden und mit `pdftotext` (falls vorhanden) oder dem Read-Tool lesen.
- **Kein Chrome-Browser** – die Erweiterung ist nicht verbunden. Keine `mcp__claude-in-chrome__*`-Werkzeuge aufrufen.
- Reservierungssysteme (OpenTable, Quandoo, resmio, gastronovi, Teburio, aleno, Formitable, SevenRooms …) nur **lesend** abfragen: Widget-Seite oder deren Verfügbarkeits-Endpunkt per GET, z. B. die JSON-Schnittstelle, die das Widget selbst nutzt (Netzwerkaufrufe im Quelltext des Widgets nachsehen). Nie ein Formular abschicken, nie eine Buchung, Anfrage oder Warteliste anlegen, keine persönlichen Daten eingeben.

## Regeln
1. **Nichts erfinden.** Jede Zahl (Preis, Bewertung, Uhrzeit, Entfernung) braucht eine Quelle. Was nicht belegbar ist: `null` plus Eintrag in `nicht_geprueft`.
2. Preise nur aus der aktuellen Speisekarte (Website/PDF). Ist nur eine Mittagskarte oder eine ältere Karte online, das klar vermerken.
3. Google-Bewertung: ohne Browser nicht live ablesbar. Versuche über WebSearch-Snippets („<Name> <Ort> Google Bewertung") oder die Restaurant-Website eine aktuelle Zahl zu finden; sonst Stephans Tabellenwert übernehmen und `google_quelle` = „Stephans Tabelle (nicht live geprüft)".
4. Bilder: mit `curl -L -A "Mozilla/5.0" -o <ziel>` laden, dann `file <ziel>` prüfen (muss JPEG/PNG/WebP sein) und Größe > 20 KB. Dateiendung passend setzen. Mindestens 2 pro Eintrag (1 Location/Gastraum, 1 Gericht/Produkt). Quellen: Website des Betriebs, Wikimedia Commons, Presse-/Tourismus-Seiten. Keine Google-Fotos, keine Instagram-CDN-Links.
5. Entfernungen **nicht** berechnen – das erledigt die Leitung zentral aus der Adresse. Adresse muss vollständig und korrekt sein (Straße, Hausnummer, PLZ, Ort).
6. Texte auf Deutsch, knapp. Beschreibung 2–3 Sätze, sachlich, keine Werbesprache.
7. Zeitbudget: etwa 30–40 Minuten. Lieber einen Punkt als „nicht geprüft" markieren als lange suchen.
8. Abschlussbericht an die Leitung (kurz, Deutsch): Pfad(e) der JSON-Dateien, Zahl der geladenen Bilder, die 3 wichtigsten Befunde (z. B. „Ruhetag", „Preis weicht ab", „ausgebucht"), offene Punkte.
