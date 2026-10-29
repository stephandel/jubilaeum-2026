# Datenschema für die Recherche (Stand 29.10.2026)

Alle Recherche-Agenten schreiben JSON-Dateien in diesen Ordner. Jede Angabe trägt `quelle` (URL oder „Google“/„Reservierungstool“/„Stephans Tabelle“) und `stand` (Datum). Was nicht verifiziert werden konnte, bekommt den Wert `null` und einen Eintrag in `nicht_geprueft` (Liste von Strings). **Nichts erfinden.**

Startadresse für Entfernungen: Dirschauer Weg, 68307 Mannheim (Koordinaten ca. 49.541, 8.464 – Mannheim-Sandhofen).
Anlass: Samstag, 31.10.2026, Abendessen 17–20 Uhr, 2 Personen.
Getränkeprofil für Preisbeispiele: 2 × Wasser (je 0,25–0,5 l oder 1 große Flasche), 1 Glas Wein, 1 Saft/Schorle, dazu 1 Tee und 1 Kaffee. Bei Degustationsmenüs zusätzlich Variante „Weinbegleitung für 1 Person“ ausweisen (eine Person fährt).

## Restaurant (restaurant-<slug>.json)

```json
{
  "slug": "das-atelier",
  "name": "Das Atelier",
  "adresse": "G7 17, 68159 Mannheim",
  "ort": "Mannheim",
  "telefon": "+49 ...",
  "email": null,
  "website": "https://...",
  "speisekarte_url": "https://... (direkter Link, PDF oder Seite)",
  "maps_url": "https://maps.app.goo.gl/...",
  "google_bewertung": 4.7, "google_anzahl": 147,
  "google_quelle": "Stephans Tabelle (nicht live geprüft)" ,
  "kueche": "moderne französische Küche",
  "beschreibung": "2–3 Sätze.",
  "stephans_preisangabe": "30–40 €",
  "preis_pro_person_korrigiert": "35–55 € Hauptgang+Dessert" ,
  "preis_abweichung": "Beschreibung, falls Stephans Angabe nicht stimmt, sonst null",
  "preisbeispiele": [
    {"titel": "Beispiel 1: Hauptgang + Dessert + Getränke (2 Pers.)",
     "positionen": [{"text": "Rinderfilet", "preis": 38.0, "anzahl": 1}, ...],
     "summe": 123.5}
  ],
  "oeffnung_samstag": "18:00–23:00, Küche bis 21:30",
  "oeffnung_hinweis": "z. B. nur Abendservice / Betriebsferien / Ruhetag / Feiertagshinweis oder null",
  "oeffnung_quelle": "https://...",
  "reservierung": {
    "art": "online | telefon | email | formular",
    "tool": "OpenTable | Quandoo | resmio | gastronovi | eigenes Formular | null",
    "url": "https://...",
    "verfuegbar_31_10": "ja | nein | unbekannt",
    "freie_zeiten": ["18:00", "19:30"],
    "hinweis": "wie geprüft, z. B. 'OpenTable-Widget, 2 Personen, 31.10., Zeiten 17–20 Uhr abgefragt' oder 'online nicht prüfbar – bitte anrufen'",
    "stand": "2026-10-29"
  },
  "parken": {"text": "Parkhaus N2, ca. 300 m zu Fuß, 2 €/h", "parkopedia_url": "https://...", "quelle": "..."},
  "bilder": [
    {"datei": "img/das-atelier-1.jpg", "art": "location", "quelle_url": "https://..."},
    {"datei": "img/das-atelier-2.jpg", "art": "gericht", "quelle_url": "https://..."}
  ],
  "quellen": ["https://...", "..."],
  "nicht_geprueft": ["Abendkarte nicht online, Preise aus Mittagskarte"],
  "stand": "2026-10-29"
}
```

Bilder: mit `curl -L -o` nach `jubilaeum-guide/img/<slug>-<n>.jpg|png|webp` laden, danach mit `file` prüfen, dass es wirklich ein Bild ist und > 20 KB hat. Mindestens 2 pro Eintrag (1 Location, 1 Gericht). Quelle: Website des Restaurants, Instagram-Vorschaubilder sind nicht zuverlässig; Wikimedia ist erlaubt. Keine Google-Fotos-Links.

## Nachmittagsoption (nachmittag.json, Liste)

```json
{"slug": "hd-philosophenweg", "titel": "...", "region": "Heidelberg", "ablauf": ["12:00 ...", "14:00 ..."],
 "dauer": "ca. 3 h", "start_adresse": "...", "maps_url": "...", "weitere_links": [{"text": "...", "url": "..."}],
 "oeffnung_31_10": "...", "kosten": "...", "veranstaltung": null, "bilder": [...], "quellen": [...], "nicht_geprueft": [], "stand": "2026-10-29"}
```

Veranstaltungen (veranstaltungen.json, Liste): `{"titel","ort","adresse","uhrzeit","datum":"2026-10-31","preis","tickets_url","url","kategorie":"nachmittag|abends","beschreibung","quelle","stand"}`

## Café (cafe-<slug>.json)

Wie Restaurant, zusätzlich `spezialitaet`, `preisniveau` (z. B. „Tortenstück 5–7 €, Kaffee 3,50 €“), ohne `preisbeispiele`/`reservierung`. Google-Bewertung muss > 4,7 sein; Quelle angeben.
