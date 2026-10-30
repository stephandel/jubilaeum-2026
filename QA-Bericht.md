# QA-Bericht – Jubiläums-Guide 27. Jahrestag (Sa 31.10.2026)

Stand: Do 29.10.2026, ca. 15:30 Uhr. Leitung Fable 5.1, Recherche und Bau Opus 5.5 (11 Helfer), zweite Meinung Opus 5.5.
Online-Fassung: https://claude.ai/artifact/NYQ6hy697MfdBb33hrDXKP (privat, nur per Freigabe).

## 1. Was geprüft wurde

### Seiten im Browser (Chrome, lokaler Server 127.0.0.1:8765)
- index.html, nachmittag.html, cafes.html geöffnet (1280 px und 400 px Breite, Dark Mode): kein horizontales Überlaufen (scrollWidth = innerWidth bei 400 px), Übersichtstabelle, Schnelllinks, Karten und Likes sichtbar.
- Automatischer Klicktest des Bau-Helfers (Chrome headless): Sortierung Bewertung/Preis/Entfernung/Status, „online kein Tisch“ immer am Ende, Filter „nur Favoriten“, Likes für S und B gespeichert und in Übersicht + Karte gleich angezeigt, keine doppelten IDs, keine toten Sprunglinks.
- `node --check` für script.js, likestore.js, likestore-online.js, data.js: ohne Fehler. `python3 build-data.py` zweimal mit gleicher Prüfsumme.
- Alle 80 Bildverweise in data.js zeigen auf vorhandene Dateien in `img/`.

### Links (curl, HEAD/GET, 269 URLs ohne Google-Maps-Links)
- 231 × HTTP 200.
- 38 nicht 200, davon **nur 2 echte Fehler** (Tippfehler mit Semikolon: mary-jane.space/contact; und /faq; → korrigiert, danach 200). Rest ist Bot-Schutz oder Weiterleitung: Parkopedia/Parkinglist/TheFork/Falstaff/Reservix (403), Michelin (202), OpenTable/Eventim (Zeitüberschreitung bei curl), kuma.art (401), park4night (404, Link entfernt sich nicht automatisch – siehe offen). OpenTable, TheFork und gastronovi wurden im echten Browser erfolgreich geöffnet.

### Entfernungen (Google Maps im Browser, 29.10. ca. 13:30 Uhr, aktueller Verkehr)
- Alle 14 Restaurants, 7 Cafés, 12 Nachmittagsoptionen einzeln abgefragt. Stichprobe erneut: Ziegler 23 Min./18,1 km, Atelier 17 Min./7,5 km, bistronauten 24 Min./17,6 km – identisch zur ersten Abfrage.

### Google-Bewertungen (Google Maps im Browser, live)
- Alle 14 Restaurants und 7 Cafés abgelesen (siehe `data/bewertungen.json`).

### Reservierungs-Widgets (im Browser, nur bis zur Zeitfenster-Anzeige bzw. bis vor die Dateneingabe, nichts eingegeben, nichts abgeschickt)
- OpenTable: Rieds (keine Tische), Philosoph (18:15–19:30), Tourist Trap (nur 18:00), Kurfürstenstube (18:30–19:45).
- TheFork: Grenzhof (18:00, 18:30, 19:30).
- gastronovi: Dobler's 19:00 nicht verfügbar; Turmrestaurant 19:00 nicht verfügbar (Bereich Turmrestaurant); Atable 19:00 frei (bis zur Dateneingabe).
- Mary Jane: Buchungsschnittstelle meldet 17 freie Plätze (Helfer, curl).
- Spinne: Anfrageformular, keine Live-Verfügbarkeit.

### Preisbeispiele
- Alle 42 Summen in 13 Restaurant-Dateien per Skript aus den Positionen nachgerechnet: 0,00 € Abweichung (zweite Meinung).
- Stichprobe an der Speisekarte: Das Atelier (dasatelierma.de, Stand 27.10.), Der Philosoph (menukarte.pdf), Grenzhof (Karte gültig ab August 2026) – Positionspreise bestätigt.

## 2. Abweichungen von Stephans Ursprungsangaben

| Restaurant | Stephans Angabe | Befund |
|---|---|---|
| Das Atelier | 30–40 € | nur Hauptgang; mit Dessert + Getränken 40–70 € p. P. (Hauptgerichte 19,50–32,90 €) |
| Mary Jane | >100 € | stimmt: 129 € (5 Gänge, 19:00) / 159 € (7 Gänge, 18:30), Vorkasse, Getränke extra |
| Rieds | 30–60 € | nur ohne Getränke; Hauptgang 27–36 €, 3 Gänge 60–80 € ohne Getränke |
| Der Philosoph | >100 € | Menü 79/99/119 € p. P. + Weinbegleitung 31/37/44 €; à la carte auch unter 100 € möglich |
| Dobler's | <100 € | falsch: Abendmenü 138 € (4 G.) / 158 € (5 G.), Hauptgänge 53–58 €; Einlass abends 18:30–20:00 |
| The Tourist Trap | <100 € | falsch für Sa: Main Season 7 Gänge 130 € (veg.) / 170 €; daneben Munchies-Karte |
| Grenzhof | 40–80 € | zu niedrig: Hauptgänge 31–54 €, Menü 89–119 € |
| Turmrestaurant | 20–40 € | nur Hauptgang; mit Getränken 43–76 € p. P. |
| Minoh | 10–20 € | Hauptgerichte 11,90–27,80 € (Presse 10/2025); keine Karte online |
| Bewertungen | laut Tabelle | alle bestätigt; nur Minoh jetzt 440 statt 432 Bewertungen |
| Cafés | Vorrecherche 13.09. | CØR live 4,8 (131); Chocami 4,8 (164); Pastry Poets 4,9 (67); Mousse Mousse 5,0 (70); YagiYa 5,0 (177); Schafheutle 4,7 (2.099); Macaronnerie 4,7 (834) |

## 3. Funde der zweiten Meinung und was daraus wurde
1. Schloss + Königstuhl 8 € zu teuer gerechnet (Panoramaticket 17 € p. P.) → **behoben**.
2. Mary Jane: falsche Startzeit „ab 18:30“ aus Drittquelle überschrieb die richtigen Zeiten → **behoben** (19:00 / 18:30 je Menü).
3. Tourist Trap: „samstags nur 7-Gänge-Menü“ nicht belegt (Munchies-Karte ohne Tagesbeschränkung) → **Formulierung korrigiert**.
4. Kaputte Quellen-Links mit mehreren Adressen in einem href (Macaronnerie, Pastry Poets, Mary Jane) → **behoben**.
5. Atelier: Hauptgerichte ab 19,50 € statt 19,90 €, widersprüchliche Spannen → **behoben**; zwei unmaskierte Zahlenwerte in script.js → **maskiert**.
Nicht widerlegt: Philosoph-Preise, Grenzhof-Preise, Mary-Jane-Preise, Enjoy-Jazz-Termin, Schloss-Öffnungszeiten, Sortierlogik, LikeStore-Fehlerbehandlung.

## 4. Was fehlt oder nicht verifizierbar war
- **Getränkepreise** stehen bei Mary Jane, Philosoph, Dobler's, Tourist Trap, Spinne, Atable, Kurfürstenstube, Ziegler, bistronauten nicht (vollständig) online. Summen sind dort mit „ca.“ gekennzeichnet; die Sortierung nach Preis ist deshalb nur grob.
- **Minoh:** keine Website, keine Karte, nur 1 Bild, Telefon und Öffnungszeiten nur aus Drittquellen. Keine Preisbeispiele möglich.
- **Das Atelier:** nur Mobilnummer aus Verzeichnis; Hinweis auf möglichen Betreiberwechsel („Gluck & Verstand“ unter derselben Adresse) – vor dem Anruf klären.
- **Dobler's:** Abendkarte ist laut Website nur „Beispiel“ (Juni 2026); 63-€-Mittagsmenü aus Vorrecherche nicht bestätigt.
- **Turmrestaurant:** Karte wirkt wie Sommerkarte; Bereich „Pfälzer Stube“ nicht geprüft.
- **Parken:** Parkopedia-Links nur teilweise vorhanden (Bot-Schutz verhindert Prüfung); Fußwege geschätzt; Tarife teils von Drittseiten.
- **Cafés:** Preisniveau nur bei Schafheutle und Chocami belegt; Parken nur bei CØR; Telefon fehlt bei Pastry Poets und YagiYa; Macaronnerie hat nur 1 Bild; Chocami Sa nur 10–14 Uhr und eher Laden als Café.
- **Nachmittag:** Kunsthalle (Öffnungszeit/Preis nur Drittquelle), REM-Leonardo-Preis fehlt, Wachenburg-Öffnungszeit unbestätigt, Gehzeiten geschätzt, Kurpfälzisches Museum Preis nur Reiseportal.
- **Veranstaltungen:** Faust (NTM) Preis/Verfügbarkeit nicht abrufbar; Capitol/SAP-Arena/7er-Club-Preise fehlen; Pfalzbau nicht erreichbar.
- **Fahrzeiten:** Verkehrs-Momentaufnahme Donnerstagmittag, nicht Samstagabend.
- **Nicht auf echtem iPhone geprüft**; Tastaturbedienung nur stichprobenartig (Fokusringe vorhanden, nicht komplett durchgespielt).
- **Online-Likes:** gemeinsame Speicherung läuft über die Artefakt-Datenbank; Bilgen muss mit claude.ai-Konto als „Contributor“ eingeladen sein, sonst speichert ihr Gerät nur lokal. Noch nicht zu zweit getestet.

## 5. Nachtrag 29.10., 20:40 Uhr – Fehler „Likes gehen nicht“ (von Stephan gemeldet)
- **Symptom:** Auf der Nachmittagsseite (und nach Prüfung auch auf allen anderen Seiten) bewirkte ein Klick auf 👍/👎 nichts; die ersten vier Restaurant-Likes hatten noch funktioniert.
- **Ursache (im Browser nachgestellt):** Das Objekt, das die Artefakt-Datenbank zurückgibt, ist schreibgeschützt (eingefroren). Solange die Datenbank leer war, wurde ein frisches Objekt verwendet – daher gingen die ersten Likes. Sobald ein Datensatz existierte, warf jede Änderung im Strict Mode einen Fehler, bevor die Anzeige aktualisiert wurde; sichtbar war nichts.
- **Behebung (Artefakt Version 3):** `likestore-online.js` und `script.js` legen jetzt eine Kopie des geladenen Objekts an. Stimmen, die vor dem Laden abgegeben werden, bleiben erhalten und werden nachgespeichert. Fehler erscheinen künftig als Hinweis unten auf der Seite („Fehler: …“) statt still zu verschwinden.
- **Geprüft:** Online Like beim Schlossgarten Schwetzingen gesetzt → in der Datenbank angekommen (Version 5), wieder zurückgenommen → Datenbank ohne Eintrag. Lokale Fassung (localStorage) war nicht betroffen, die Änderung gilt dort ebenfalls (`node --check` ohne Fehler).
- `data/linkcheck.json` enthält das vollständige Linkprotokoll.

## 6. Ausbau in der Nacht 29./30.10. (Startseite, Planer, Bilder, zweite Prüfrunde)
- **Neu:** Startseite (Wer schaut?, Unser Tag geteilt, To-dos, Heute-Modus, Wetter + Fuerte-Meteogramm, 3 Top-Tipps, Favoriten), Planer (Karte mit OSRM-Route, Zeitplan mit Wetter je Station, Reihenfolge ziehen, Würfel, Mitnehmen, Preisrahmen), Suche 🔍, Einstellungen ⚙️, Galerie mit Luftbild (Esri-Satellitenkacheln) und Stecknadel, Kommentare.
- **Opus-Faktenprüfung (Restaurants, Nachmittag, Cafés):** Preise und alle 45 Summen bestätigt. Korrigiert: „Asiawochen“ am 31.10. gestrichen (erst 7.11.), Wischnewski-Ausstellung in der Rudolf-Scharpf-Galerie, Kurpfälzisches Museum 8 €, Bergbahn-Ablauf (Kaffee vor 17 Uhr), Café Wolfsbau (Mittagstisch nur sonntags), Macaronnerie-PLZ, Disney-Ticketlink, Atelier (eigene Website, Mo Ruhetag), Atable nur 19:00 als geprüft frei.
- **Opus-Bedienungstests (zwei Runden):** behoben u. a. Veranstaltungs-Schild als Kachel, verlorener Kommentar-Entwurf, unsichtbare Filter, Speicher-Reihenfolge der Likes, Kontrast im Dunkelmodus, Zeitplan ohne Warnung bei Nachmittag nach dem Essen/nach Einlass, Einlass als Beginn gelesen, „fest“/Startzeit/Reihenfolge gingen beim Speichern verloren, sechs ungenaue Koordinaten.
- **Live geprüft:** Kommentare und „Unser Tag“ über den Worker gespeichert und wieder entfernt; Likes und Fuerte-Daten unberührt.
- **Offen:** Außenfotos fehlen bei Philosoph, Mary Jane, Rieds, Ziegler und mehreren Cafés; Grenzhof-Gericht ist ein Symbolbild; Minoh-Fotos sind Gäste-Collagen. Echtes iPhone (Ziehen per Finger, Safari) nicht geprüft, nur Simulator. Worker-Grenze 150 Einträge je Art gilt für Likes und Tag zusammen.

## 7. Ausbau 30.10. (Tagesideen, Wetterdiagramm, Michelin, Likes sichtbarer)
- **Tagesideen (jetzt sechs):** Barockgarten mit Mousse Mousse + Ziegler; Heidelberg mit optionalem Heidelberger Stadtjuwelier (Sa 10–14); neu „Mannheimer Stadtbummel“ (CØR, Pletzsch Sa 10–19, Wenthe Sa 10–18, Troncone Sa 10–17, Atelier) und „Pfalz: Weinberge & Spinne“ (Café Charme Sa 10–17 statt Theodor Landau – 28 statt 47 Min. ab Zuhause; König-Ludwig-Pavillon Gimmeldingen). Öffnungszeiten, Bewertungen, Fahr- und Gehzeiten am 30.10. in Google Maps abgelesen. Jede Idee hat eine eigene Abfahrtszeit (`start`).
- **Wetterdiagramm:** höher, Zeile „Ihr“ mit den Stationen aus dem Planer (Kurzform `zp`, sonst selbst gerechnet), auf dem Handy rechtsbündig.
- **Michelin:** Abzeichen nach Abfrage der Restaurantseiten (dataLayer `distinction`): 1 Stern Dobler's, The Tourist Trap; Bib Gourmand Ziegler; Empfehlung Atable, Bistronauten, Grenzhof, Kurfürstenstube, Philosoph, Spinne. Symbole selbst gezeichnet (keine Original-Logodateien).
- **Likes:** Bilgen sah Stephans Likes nicht. Server und Live-Seite geprüft (25 Likes, in Chrome und frischem Safari sichtbar) → Ursache auf ihrem Gerät nicht geklärt (alter claude.ai-Link? Verbindung?). Neu: gelber Hinweis, wenn der Worker nicht erreichbar ist; Hinweis auf der alten claude.ai-Seite mit neuer Adresse; Karte „💛 Stephan mag … Orte“ oben auf der Startseite und Schild „💛 … mag das“ auf jedem Foto.
- **Zweite Meinung (Sonnet, zum Widerlegen):** behoben – Zeitplan-Kurzform sprang nach Mitternacht auf 00:10 zurück; Nachmittag ohne Dauer erzeugte Balken mit negativer Breite; Schloss-Idee rechnete „Abfahrt 12:40“ für „12:40 Bergbahn“ (jetzt Abfahrt 12:00), Karlstern-Idee Abfahrt 13:20; Juwelier-Bewertung im Text klar zugeordnet; Michelin-Stern: sichtbarer Text jetzt im zugänglichen Namen. Verworfen: „Grenzhof-Michelin-URL unbestätigt“ (im Browser geprüft: Grenzhof, Empfehlung); „Verbindungshinweis verschwindet nicht“ (wird alle 20 s neu geprüft). Bekannt, nicht geändert: Wer im Planer speichert, bevor die Route geladen ist, speichert Fahrten mit 25 Min. Schätzung.
- **Fotos:** Helfer fand für Philosoph, Mary Jane, Rieds, Ziegler und die Cafés keine sicher passende Außenansicht (Websites zeigen nur Innenräume/Gerichte, Commons nichts) → nichts eingebaut. Ergänzt: E-Mail Ziegler (Impressum).
- **Offen:** Telefonate Ziegler/Atelier, Bestätigung Spinne; Parken am Pavillon; Juwelier-Zeiten nur aus Google Maps; echtes iPhone.
