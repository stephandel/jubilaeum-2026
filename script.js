// Jubiläums-Guide – baut alle Seiten aus window.GUIDE_DATA (data.js) auf.
(function () {
  "use strict";

  var D = window.GUIDE_DATA || { meta: {}, restaurants: [], cafes: [], nachmittag: [], veranstaltungen: [] };
  var STAND = (D.meta && D.meta.stand) || "29.10.2026";
  var START = "Dirschauer Weg, 68307 Mannheim";
  var NAMEN = { S: "Stephan", B: "Bilgen" };
  var NG = "nicht geprüft";

  var likes = {};
  var likesGeaendert = 0; // Zeitpunkt der letzten eigenen Stimme (damit das Nachsehen sie nicht gleich überschreibt)
  var ich = null;
  var zustand = { sort: "auswahl", status: "alle", ort: "alle", maxMin: 0, nurFav: false, suche: "" };

  // ---------- Hilfen ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sicherUrl(u) {
    if (!u || typeof u !== "string") return null;
    u = u.trim();
    return /^(https?:|tel:|mailto:)/i.test(u) ? u : null;
  }
  function link(u, text, cls) {
    var s = sicherUrl(u);
    if (!s) return "";
    var extern = /^https?:/i.test(s);
    return '<a' + (cls ? ' class="' + cls + '"' : "") + ' href="' + esc(s) + '"' +
      (extern ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + text + "</a>";
  }
  function euro(n) {
    if (n == null || isNaN(n)) return null;
    return Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }
  function zahl(n, stellen) {
    return Number(n).toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
  }
  function telLink(tel) {
    if (!tel) return null;
    var nr = String(tel).replace(/[^\d+]/g, "");
    return nr ? '<a class="tel" href="tel:' + esc(nr) + '">' + esc(tel) + "</a>" : esc(tel);
  }
  function routeUrl(adresse) {
    if (!adresse) return null;
    return "https://www.google.com/maps/dir/?api=1&origin=Dirschauer+Weg,+68307+Mannheim&destination=" + encodeURIComponent(adresse);
  }
  function oderNG(v) {
    return v == null || v === "" ? '<span class="ng">' + NG + "</span>" : esc(v);
  }
  function initialen(name) {
    return String(name || "?").replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "?";
  }
  function slugify(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }
  function toast(text) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = text;
    t.classList.add("sichtbar");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("sichtbar"); }, 3200);
  }
  // Suchtext vereinheitlichen: klein, ohne Akzente (Café = cafe), ß = ss
  function norm(s) {
    return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");
  }
  function passtZurSuche(teile) {
    if (!zustand.suche) return true;
    var heu = norm(teile.join(" "));
    return zustand.suche.split(" ").every(function (w) { return heu.indexOf(w) >= 0; });
  }
  function sucheFeld() {
    return '<div class="steuer-zeile suche"><label class="suche-feld"><span class="sr">Suchen nach Name, Ort, Küche oder Beschreibung</span>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<input type="search" id="f-suche" placeholder="Suchen: Name, Ort, Küche …" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>' +
      '<span class="hinweis" id="such-info" role="status"></span></div>';
  }
  function sucheInfo(n) {
    var el = document.getElementById("such-info");
    if (el) el.textContent = zustand.suche ? (n ? n + " Treffer" : "Keine Treffer") : "";
  }
  function sucheVerdrahten(zeichnen) {
    var el = document.getElementById("f-suche");
    if (!el) return;
    el.addEventListener("input", function () {
      zustand.suche = norm(el.value).replace(/\s+/g, " ").trim();
      zeichnen();
    });
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privat-Modus: egal */ } }

  // ---------- Bausteine ----------
  function bilder(e) {
    var bs = (e.bilder || []).filter(function (b) { return b && b.datei && b.vorhanden !== false; });
    var name = e.name || e.titel;
    var platz = '<div class="platzhalter" aria-hidden="true"><span>' + esc(initialen(name)) + "</span></div>";
    if (!bs.length) return '<div class="bild">' + platz + "</div>";
    var h = '<div class="bild' + (bs[1] ? " zwei" : "") + '">' + platz +
      '<img class="b1" src="' + esc(bs[0].datei) + '" alt="' + esc(bs[0].beschreibung || name) + '" data-quelle="' + esc(bs[0].quelle_url || "") + '" data-art="' + esc(bs[0].art || "") + '" loading="lazy" decoding="async">';
    if (bs[1]) {
      h += '<img class="b2" src="' + esc(bs[1].datei) + '" alt="' + esc(bs[1].beschreibung || name) + '" data-quelle="' + esc(bs[1].quelle_url || "") + '" data-art="' + esc(bs[1].art || "") + '" loading="lazy" decoding="async">';
    }
    h += '<button type="button" class="bild-gross" aria-label="Bild vergrößern: ' + esc(name) + '"></button>';
    if (bs[1]) {
      h += '<button type="button" class="bild-wechsel" aria-label="Zweites Bild zeigen" aria-pressed="false">' +
        '<img src="' + esc(bs[1].datei) + '" alt="" loading="lazy" decoding="async"></button>';
    }
    return h + "</div>";
  }

  function bewertungHtml(e) {
    if (e.google_bewertung == null) return '<span class="ng">Bewertung ' + NG + "</span>";
    return '<span class="sterne" title="' + esc(e.google_quelle || "") + '"><span aria-hidden="true">★</span> ' +
      zahl(e.google_bewertung, 1) + (e.google_anzahl != null ? ' <span class="anz">(' + Number(e.google_anzahl).toLocaleString("de-DE") + ")</span>" : "") +
      '<span class="sr"> von 5 Sternen bei Google</span></span>';
  }

  function entfHtml(e, kurz) {
    var x = e.entfernung;
    if (!x || x.km == null) return '<span class="ng">Entfernung: ' + NG + "</span>";
    return '<span class="zahlen">' + zahl(x.km, 1) + " km · " + (kurz ? "" : "ca. ") + esc(String(x.min)) + " Min.</span>";
  }

  function statusHtml(r, kompakt) {
    var res = r.reservierung || {};
    var tel = telLink(r.telefon);
    if (r.status === "ja") {
      var z = (res.freie_zeiten || []).join(", ");
      return '<span class="status ja"><span class="punkt" aria-hidden="true">●</span> Plätze frei' + (z ? ": " + esc(z) : "") + "</span>";
    }
    if (r.status === "nein") {
      return '<span class="status nein"><span class="punkt" aria-hidden="true">✕</span> online kein Tisch</span>' + (tel ? ' <span class="status-tel">' + tel + "</span>" : "");
    }
    return '<span class="status unbekannt"><span class="punkt" aria-hidden="true">?</span> ' + (kompakt ? "anrufen" : "nicht online prüfbar – anrufen") + "</span>" +
      (tel ? ' <span class="status-tel">' + tel + "</span>" : ' <span class="ng">Telefon ' + NG + "</span>");
  }

  function likeBar(key, label) {
    return '<div class="likes" data-key="' + esc(key) + '" data-label="' + esc(label) + '">' + likeInnen(key, label) + "</div>";
  }
  function likeInnen(key, label) {
    var v = likes[key] || {};
    var meine = ich ? v[ich] : null;
    var h = '<button type="button" class="like hoch" data-wert="hoch" aria-pressed="' + (meine === "hoch") + '" aria-label="' +
      esc(label) + ' gefällt ' + (ich ? NAMEN[ich] : "mir") + '"><span aria-hidden="true">👍</span></button>' +
      '<button type="button" class="like runter" data-wert="runter" aria-pressed="' + (meine === "runter") + '" aria-label="' +
      esc(label) + ' gefällt ' + (ich ? NAMEN[ich] : "mir") + ' nicht"><span aria-hidden="true">👎</span></button>';
    h += '<span class="stimmen">';
    ["S", "B"].forEach(function (p) {
      var w = v[p];
      var txt = w === "hoch" ? "👍" : w === "runter" ? "👎" : "–";
      var lang = NAMEN[p] + ": " + (w === "hoch" ? "gefällt" : w === "runter" ? "gefällt nicht" : "noch keine Stimme");
      h += '<span class="chip-person ' + (w || "leer") + '" title="' + lang + '"><b aria-hidden="true">' + p + '</b><span aria-hidden="true">' + txt +
        '</span><span class="sr">' + lang + "</span></span>";
    });
    return h + "</span>";
  }
  function istFavorit(key) {
    var v = likes[key] || {};
    return v.S === "hoch" || v.B === "hoch";
  }
  function likesAktualisieren() {
    document.querySelectorAll(".likes").forEach(function (el) {
      el.innerHTML = likeInnen(el.dataset.key, el.dataset.label);
    });
  }

  // ---------- Kommentare ----------
  var kommentare = {};
  var kommOffen = {};     // Liste aufgeklappt je Eintrag
  var kommSchreiben = {}; // Eingabefeld offen je Eintrag
  function kommentarBar(key) {
    return '<div class="komm" data-key="' + esc(key) + '">' + kommentarInnen(key) + "</div>";
  }
  function datumKurz(ms) {
    var d = new Date(Number(ms));
    if (isNaN(d)) return "";
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + ", " +
      d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  function kommentarInnen(key) {
    var liste = kommentare[window.KommentarStore ? window.KommentarStore.schluessel(key) : key] || [];
    var h = '<div class="komm-leiste"><button type="button" class="komm-knopf" data-komm="schreiben" aria-expanded="' + !!kommSchreiben[key] + '">' +
      '<span aria-hidden="true">💬</span> Kommentieren</button>';
    if (liste.length) {
      h += '<button type="button" class="komm-mehr" data-komm="mehr" aria-expanded="' + !!kommOffen[key] + '">' +
        (kommOffen[key] ? "weniger anzeigen" : liste.length + (liste.length === 1 ? " Kommentar" : " Kommentare") + " · mehr anzeigen") + "</button>";
    }
    h += "</div>";
    if (liste.length && kommOffen[key]) {
      h += '<ul class="komm-liste">' + liste.map(function (k) {
        return '<li><span class="komm-kopf"><b>' + esc(NAMEN[k.by] || k.by) + "</b> · " + esc(datumKurz(k.at)) + "</span>" +
          '<span class="komm-text">' + esc(k.text) + "</span>" +
          (k.by === ich ? '<button type="button" class="komm-weg" data-komm="loeschen" data-id="' + esc(String(k.id)) + '">Löschen</button>' : "") +
          "</li>";
      }).join("") + "</ul>";
    }
    if (kommSchreiben[key]) {
      h += '<div class="komm-form"><label class="sr" for="kt-' + esc(key) + '">Kommentar</label>' +
        '<textarea id="kt-' + esc(key) + '" maxlength="500" rows="2" placeholder="Was meinst du dazu?"></textarea>' +
        '<div class="komm-knoepfe"><button type="button" class="komm-senden" data-komm="senden">Speichern</button>' +
        '<button type="button" class="komm-abbrechen" data-komm="abbrechen">Abbrechen</button></div></div>';
    }
    return h;
  }
  function kommentareAktualisieren() {
    document.querySelectorAll(".komm").forEach(function (el) {
      if (kommSchreiben[el.dataset.key]) return; // nicht unter den Fingern wegzeichnen, während geschrieben wird
      el.innerHTML = kommentarInnen(el.dataset.key);
    });
  }
  function kommEinsZeichnen(el) {
    el.innerHTML = kommentarInnen(el.dataset.key);
    var ta = el.querySelector("textarea");
    if (ta) ta.focus();
  }

  function nichtGeprueftKasten(liste) {
    if (!liste || !liste.length) return "";
    return '<div class="ng-kasten"><h4>Nicht geprüft</h4><ul>' +
      liste.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
  }

  function linkLeiste(e, adresse) {
    var teile = [
      link(e.website, "Website ↗"),
      link(e.speisekarte_url, "Speisekarte ↗"),
      link(e.maps_url, "Google Maps ↗"),
      link(routeUrl(adresse || e.adresse), "Autoroute ↗")
    ].filter(Boolean);
    return teile.length ? '<p class="linkleiste">' + teile.join('<span aria-hidden="true"> · </span>') + "</p>" : "";
  }

  function quellenBlock(e, extra) {
    var h = '<details class="quellen"><summary>Quellen, Bilder &amp; ursprüngliche Angaben</summary><div class="quellen-innen">';
    h += extra || "";
    var bs = (e.bilder || []).filter(function (b) { return b && b.quelle_url; });
    if (bs.length) {
      h += "<p><b>Bildnachweis:</b></p><ul>" + bs.map(function (b, i) {
        return "<li>Bild " + (i + 1) + (b.art ? " (" + esc(b.art) + ")" : "") + ": " + (link(b.quelle_url, esc(b.quelle_url)) || esc(b.quelle_url)) + "</li>";
      }).join("") + "</ul>";
    }
    var qs = e.quellen || [];
    if (qs.length) {
      h += "<p><b>Quellen:</b></p><ul>" + qs.map(function (q) { return "<li>" + (link(q, esc(q)) || esc(q)) + "</li>"; }).join("") + "</ul>";
    }
    return h + "</div></details>";
  }

  function standZeile(e, quelle) {
    return '<p class="stand">Stand ' + STAND + " · Quelle: " + esc(quelle) + "</p>";
  }

  function feld(titel, inhalt) {
    return '<div class="feld"><h4>' + titel + "</h4>" + inhalt + "</div>";
  }

  // ---------- Restaurants ----------
  function beispielA(r) {
    var pb = (r.preisbeispiele || [])[0];
    if (!pb || pb.summe == null) return null;
    return pb;
  }
  function beispielAHtml(r) {
    var pb = beispielA(r);
    if (!pb) return '<span class="ng">' + NG + "</span>";
    return '<span class="zahlen">' + (pb.unvollstaendig ? "ca. " : "") + euro(pb.summe) + "</span>";
  }

  function preisZeile(r) {
    var neu = r.preis_pro_person_korrigiert;
    var alt = r.stephans_preisangabe;
    var h = '<div class="preis">';
    if (r.preis_abweichung && alt) {
      h += '<span class="preis-alt" title="' + esc(r.preis_abweichung) + '"><s>' + esc(alt) + '</s><span class="sr"> (ursprüngliche Angabe)</span></span> <span aria-hidden="true">→</span> ';
    }
    h += neu ? '<span class="preis-neu">' + esc(neu) + "</span>" : '<span class="ng">Preis ' + NG + "</span>";
    if (r.preis_abweichung) h += '<p class="preis-abw">' + esc(r.preis_abweichung) + "</p>";
    return h + "</div>";
  }

  function preisbeispieleHtml(r) {
    var pbs = r.preisbeispiele || [];
    if (!pbs.length) {
      return feld("Preisbeispiele", "<p>" + (r.preisbeispiele_hinweis ? esc(r.preisbeispiele_hinweis) : '<span class="ng">Keine Preisbeispiele – ' + NG + "</span>") + "</p>");
    }
    var fuss = [];
    var rows = pbs.map(function (pb, i) {
      var pos = (pb.positionen || []).map(function (p) {
        var anz = p.anzahl && p.anzahl > 1 ? p.anzahl + "× " : "";
        return esc(anz + p.text) + " " + (p.preis == null ? '<span class="ng">– nicht online</span>' : '<span class="zahlen">' + euro(p.preis) + "</span>");
      }).join('<span class="trenn" aria-hidden="true"> · </span>');
      var hin = pb.summe_hinweis || pb.hinweis;
      var mark = "";
      if (hin) { fuss.push(hin); mark = "<sup>" + fuss.length + "</sup>"; }
      var ca = pb.unvollstaendig ? "ca. " : "";
      var pp = pb.summe == null ? '<span class="ng">' + NG + "</span>" : ca + euro(pb.summe / 2);
      var zw = pb.summe == null ? '<span class="ng">' + NG + "</span>" : ca + euro(pb.summe) + mark;
      return "<tr><th scope=\"row\"><span class=\"pb-titel\">" + String.fromCharCode(65 + i) + " · " + esc(pb.titel) + '</span><span class="pb-pos">' + pos + "</span></th>" +
        '<td class="zahlen">' + pp + '</td><td class="zahlen">' + zw + "</td></tr>";
    }).join("");
    var h = '<div class="tabelle-wrap"><table class="pb"><caption class="sr">Preisbeispiele ' + esc(r.name) + '</caption><thead><tr><th scope="col">Beispiel</th><th scope="col">pro Person</th><th scope="col">zu zweit</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
    if (fuss.length || r.preisbeispiele_hinweis) {
      h += '<ol class="fussnoten">' + fuss.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ol>";
      if (r.preisbeispiele_hinweis) h += '<p class="fussnote">' + esc(r.preisbeispiele_hinweis) + "</p>";
    }
    h += '<p class="fussnote">„ca.“ = mindestens ein Preis fehlt online; Summe ohne diese Posten.</p>';
    return feld("Preisbeispiele", h);
  }

  function reservierungHtml(r) {
    var res = r.reservierung;
    if (!res) return feld("Reservierung", '<p class="ng">' + NG + "</p>");
    var h = '<dl class="dl">' +
      "<dt>Art</dt><dd>" + oderNG(res.art) + "</dd>" +
      "<dt>System</dt><dd>" + oderNG(res.tool) + "</dd>" +
      "<dt>Link</dt><dd>" + (link(res.url, "Reservierung öffnen ↗") || '<span class="ng">' + NG + "</span>") + "</dd>" +
      "<dt>Freie Zeiten</dt><dd>" + (res.freie_zeiten && res.freie_zeiten.length ? esc(res.freie_zeiten.join(", ")) : '<span class="ng">keine Einzelzeiten bekannt</span>') + "</dd>" +
      "<dt>Telefon</dt><dd>" + (telLink(r.telefon) || '<span class="ng">' + NG + "</span>") + "</dd>" +
      "</dl>";
    if (res.hinweis) h += '<p class="hinweis">' + esc(res.hinweis) + "</p>";
    if (res.stand) h += '<p class="fussnote">Stand ' + esc(res.stand.split("-").reverse().join(".")) + "</p>";
    return feld("Reservierung", h);
  }

  function oeffnungHtml(e, feldName) {
    var h = "<p><b>Samstag:</b> " + oderNG(e[feldName || "oeffnung_samstag"]) + "</p>";
    if (e.oeffnung_hinweis) h += '<p class="hinweis">' + esc(e.oeffnung_hinweis) + "</p>";
    if (e.oeffnung_quelle) h += '<p class="fussnote">Quelle: ' + (link(e.oeffnung_quelle, "Öffnungszeiten-Quelle ↗") || esc(e.oeffnung_quelle)) + "</p>";
    return feld("Öffnungszeiten", h);
  }

  function parkenHtml(p) {
    if (!p) return feld("Parken", '<p class="ng">' + NG + "</p>");
    var h = "<p>" + oderNG(p.text) + "</p>";
    var pl = link(p.parkopedia_url, "Parkopedia ↗");
    if (pl) h += "<p>" + pl + "</p>";
    if (p.quelle) h += '<p class="fussnote">Quelle: ' + esc(p.quelle) + "</p>";
    return feld("Parken", h);
  }

  function kontaktHtml(e) {
    var extra = [];
    if (e.getraenkekarte_url) extra.push(link(e.getraenkekarte_url, "Getränkekarte ↗"));
    if (e.weinkarte_url) extra.push(link(e.weinkarte_url, "Weinkarte ↗"));
    (e.speisekarte_pdfs || []).forEach(function (u, i) { extra.push(link(u, "Speisekarte PDF " + (i + 1) + " ↗")); });
    var h = '<dl class="dl">' +
      "<dt>Adresse</dt><dd>" + oderNG(e.adresse) + "</dd>" +
      "<dt>Telefon</dt><dd>" + (telLink(e.telefon) || '<span class="ng">' + NG + "</span>") + "</dd>" +
      "<dt>E-Mail</dt><dd>" + (e.email ? link("mailto:" + e.email, esc(e.email)) : '<span class="ng">' + NG + "</span>") + "</dd>" +
      "</dl>";
    extra = extra.filter(Boolean);
    if (extra.length) h += '<p class="linkleiste">' + extra.join('<span aria-hidden="true"> · </span>') + "</p>";
    if (e.speisekarte_hinweis) h += '<p class="hinweis">' + esc(e.speisekarte_hinweis) + "</p>";
    if (e.speisekarte_stand) h += '<p class="fussnote">Speisekarte: ' + esc(e.speisekarte_stand) + "</p>";
    return feld("Adresse &amp; Kontakt", h);
  }

  function restaurantKarte(r) {
    var key = "r:" + r.slug;
    var nr = String(r._nr).padStart(2, "0");
    var bewQuelle = r.google_live ? "Google Maps (live 29.10.2026)" : (r.google_quelle || "Google");
    var urspr = "<p><b>Ursprüngliche Angaben" + (r.zusatz ? " (Vorrecherche)" : " (Stephans Tabelle)") + ":</b></p><ul>" +
      "<li>Bewertung: " + (r.bewertung_original && r.bewertung_original.wert != null ? zahl(r.bewertung_original.wert, 1) +
        (r.bewertung_original.anzahl != null ? " (" + esc(String(r.bewertung_original.anzahl)) + ")" : "") : NG) +
      (r.bewertung_original && r.bewertung_original.quelle ? " – " + esc(r.bewertung_original.quelle) : "") + "</li>" +
      "<li>Preisangabe: " + oderNG(r.stephans_preisangabe) + "</li></ul>";
    return '<article class="karte" id="r-' + esc(r.slug) + '" data-status="' + r.status + '">' +
      bilder(r) +
      '<div class="karte-kopf">' +
      '<p class="kicker"><span class="zahlen">' + nr + "</span> / " + esc((r.ort_kicker || r.ort || "").toUpperCase()) +
      (r.zusatz ? ' <span class="tag zusatz">Zusatz</span>' : "") + "</p>" +
      "<h3>" + esc(r.name) + "</h3>" +
      '<p class="kueche">' + oderNG(r.kueche) + "</p>" +
      '<p class="fakten">' + bewertungHtml(r) + '<span class="trenn" aria-hidden="true">·</span>' + entfHtml(r) + "</p>" +
      preisZeile(r) +
      '<div class="status-zeile">' + statusHtml(r) + "</div>" +
      likeBar(key, r.name) + kommentarBar(key) +
      linkLeiste(r) +
      "</div>" +
      '<details class="mehr"><summary>Details, Preisbeispiele &amp; Reservierung</summary><div class="mehr-innen">' +
      (r.beschreibung ? '<p class="beschreibung">' + esc(r.beschreibung) + "</p>" : "") +
      preisbeispieleHtml(r) +
      oeffnungHtml(r) +
      reservierungHtml(r) +
      parkenHtml(r.parken) +
      kontaktHtml(r) +
      nichtGeprueftKasten(r.nicht_geprueft) +
      "</div></details>" +
      quellenBlock(r, urspr) +
      '<p class="fussnote karte-fuss">Ohne Trinkgeld und Parken.</p>' +
      standZeile(r, "Website des Restaurants; Bewertung: " + bewQuelle + "; Fahrzeit: Google Maps") +
      "</article>";
  }

  var STATUS_RANG = { ja: 0, unbekannt: 1, nein: 2 };
  function sortiere(liste) {
    var s = zustand.sort;
    var kopie = liste.slice();
    kopie.sort(function (a, b) {
      // Ausgebuchte immer ans Ende, egal welche Sortierung
      var na = a.status === "nein" ? 1 : 0, nb = b.status === "nein" ? 1 : 0;
      if (na !== nb) return na - nb;
      var d = 0;
      if (s === "bewertung") d = (b.google_bewertung || 0) - (a.google_bewertung || 0) || (b.google_anzahl || 0) - (a.google_anzahl || 0);
      else if (s === "preis") {
        var pa = beispielA(a), pb = beispielA(b);
        d = (pa ? pa.summe : Infinity) - (pb ? pb.summe : Infinity);
        if (isNaN(d)) d = 0;
      } else if (s === "entfernung") {
        var ea = a.entfernung && a.entfernung.min != null ? a.entfernung.min : Infinity;
        var eb = b.entfernung && b.entfernung.min != null ? b.entfernung.min : Infinity;
        d = ea - eb;
        if (isNaN(d)) d = 0;
      } else if (s === "status") d = STATUS_RANG[a.status] - STATUS_RANG[b.status];
      return d || a._nr - b._nr;
    });
    return kopie;
  }
  function filtere(liste) {
    return liste.filter(function (r) {
      if (zustand.status === "ja" && r.status !== "ja") return false;
      if (zustand.status === "unbekannt" && r.status !== "unbekannt") return false;
      if (zustand.ort !== "alle" && r.ort_basis !== zustand.ort) return false;
      if (zustand.maxMin && !(r.entfernung && r.entfernung.min != null && r.entfernung.min <= zustand.maxMin)) return false;
      if (zustand.nurFav && !istFavorit("r:" + r.slug)) return false;
      if (!passtZurSuche([r.name, r.ort, r.ort_basis, r.ort_kicker, r.kueche, r.beschreibung])) return false;
      return true;
    });
  }

  function seiteRestaurants(app) {
    var rs = D.restaurants || [];
    rs.forEach(function (r, i) { r._nr = i + 1; });
    var auswahl = rs.filter(function (r) { return !r.zusatz; });
    var orte = Array.from(new Set(rs.map(function (r) { return r.ort_basis; }).filter(Boolean))).sort();

    var h = '<section class="hero">' +
      '<div class="hero-27" aria-hidden="true">27</div>' +
      '<p class="hero-label">Unsere persönliche Auswahl · 2026</p>' +
      "<h1>27 Jahre wir.</h1>" +
      '<p class="hero-unter">Ein Abend. Nur für uns.</p>' +
      '<p class="hero-satz">' + (auswahl.length === 9 ? "Neun" : auswahl.length) + " Restaurants, die ich selbst für uns ausgesucht habe. Zum Anschauen, Vorfreuen und gemeinsamen Entscheiden.</p>" +
      '<p class="hero-datum">Samstag, 31. Oktober 2026 · Für zwei Personen</p>' +
      "</section>" +
      kopfzeile() +
      '<p class="hinweiszeile">Recherchestand: ' + STAND + ". Freie Tische sind Momentaufnahmen für den 31.10., zwei Personen. Angeboten bedeutet noch nicht reserviert.</p>";

    h += '<section class="block" aria-labelledby="ueb-titel"><h2 id="ueb-titel">Übersicht</h2>' +
      '<div class="steuer glas-leicht">' +
      sucheFeld() +
      '<div class="steuer-zeile" role="group" aria-label="Sortieren nach"><span class="steuer-label">Sortieren</span>' +
      [["auswahl", "Auswahl"], ["bewertung", "Bewertung"], ["preis", "Preis"], ["entfernung", "Entfernung"], ["status", "Status"]].map(function (x) {
        return '<button type="button" class="chip sort" data-sort="' + x[0] + '" aria-pressed="' + (zustand.sort === x[0]) + '">' + x[1] + "</button>";
      }).join("") + "</div>" +
      '<div class="steuer-zeile filter">' +
      '<label>Status <select id="f-status"><option value="alle">alle</option><option value="ja">Plätze frei</option><option value="unbekannt">unbekannt</option></select></label>' +
      '<label>Ort <select id="f-ort"><option value="alle">alle</option>' + orte.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + "</option>"; }).join("") + "</select></label>" +
      '<label>max. Fahrzeit <select id="f-min"><option value="0">egal</option><option value="20">20 Min.</option><option value="25">25 Min.</option><option value="30">30 Min.</option><option value="40">40 Min.</option></select></label>' +
      '<label class="check"><input type="checkbox" id="f-fav"> nur Favoriten</label>' +
      "</div></div>" +
      '<div id="uebersicht"></div>' +
      '<nav class="schnelllinks" aria-label="Schnelllinks zu den Restaurants">' +
      rs.map(function (r) {
        return (r.zusatz && r === rs.filter(function (x) { return x.zusatz; })[0] ? '<span class="schnell-trenner">Zusatz:</span>' : "") +
          '<a class="chip" href="#r-' + esc(r.slug) + '">' + esc(r.name) + "</a>";
      }).join("") +
      "</nav></section>";

    h += '<section class="block" aria-labelledby="aus-titel"><h2 id="aus-titel">Unsere Auswahl</h2><div class="karten" id="karten-auswahl"></div></section>';
    h += '<section class="block" aria-labelledby="zus-titel"><h2 id="zus-titel">Weitere Empfehlungen aus der Vorrecherche</h2>' +
      '<p class="unterzeile">Nicht von uns ausgesucht, aber in der Recherche aufgefallen.</p><div class="karten" id="karten-zusatz"></div></section>';
    h += erklaerung();
    app.innerHTML = h;

    function zeichnen() {
      var gefiltert = sortiere(filtere(rs));
      var tab = '<div class="tabelle-wrap"><table class="uebersicht"><caption class="sr">Übersicht aller Restaurants</caption><thead><tr>' +
        '<th scope="col">Restaurant</th><th scope="col">Autofahrt</th><th scope="col">Beispiel A zu zweit</th><th scope="col">Bewertung</th><th scope="col">Status</th><th scope="col">Likes</th>' +
        "</tr></thead><tbody>";
      tab += gefiltert.map(function (r) {
        return '<tr data-status="' + r.status + '">' +
          '<th scope="row"><a href="#r-' + esc(r.slug) + '">' + esc(r.name) + "</a>" + (r.zusatz ? ' <span class="tag zusatz">Zusatz</span>' : "") +
          '<span class="ort">' + esc(r.ort || "") + "</span></th>" +
          '<td data-label="Autofahrt">' + entfHtml(r, true) + "</td>" +
          '<td data-label="Beispiel A zu zweit">' + beispielAHtml(r) + "</td>" +
          '<td data-label="Bewertung">' + bewertungHtml(r) + "</td>" +
          '<td data-label="Status" class="td-status">' + statusHtml(r, true) + "</td>" +
          '<td data-label="Likes">' + likeBar("r:" + r.slug, r.name) + "</td></tr>";
      }).join("");
      tab += "</tbody></table></div>";
      sucheInfo(gefiltert.length);
      if (!gefiltert.length) tab = leer(zustand.suche ? "Keine Treffer für diese Suche und Filter." : "Kein Restaurant passt zu diesen Filtern.");
      document.getElementById("uebersicht").innerHTML = tab;
      var ka = gefiltert.filter(function (r) { return !r.zusatz; });
      var kz = gefiltert.filter(function (r) { return r.zusatz; });
      document.getElementById("karten-auswahl").innerHTML = ka.length ? ka.map(restaurantKarte).join("") : leer("Keine Treffer in unserer Auswahl.");
      document.getElementById("karten-zusatz").innerHTML = kz.length ? kz.map(restaurantKarte).join("") : leer("Keine Treffer bei den Zusatz-Empfehlungen.");
    }
    zeichnen();
    seiteRestaurants.zeichnen = zeichnen;

    app.addEventListener("click", function (ev) {
      var b = ev.target.closest(".sort");
      if (!b) return;
      zustand.sort = b.dataset.sort;
      app.querySelectorAll(".sort").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      zeichnen();
    });
    document.getElementById("f-status").addEventListener("change", function (e) { zustand.status = e.target.value; zeichnen(); });
    document.getElementById("f-ort").addEventListener("change", function (e) { zustand.ort = e.target.value; zeichnen(); });
    document.getElementById("f-min").addEventListener("change", function (e) { zustand.maxMin = Number(e.target.value); zeichnen(); });
    document.getElementById("f-fav").addEventListener("change", function (e) { zustand.nurFav = e.target.checked; zeichnen(); });
    sucheVerdrahten(zeichnen);
  }

  function leer(text) {
    return '<div class="leer"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p>' + esc(text) + "</p></div>";
  }

  function kopfzeile() {
    return '<p class="kopfzeile">27. Jahrestag · Samstag, 31. Oktober 2026 · Start: Dirschauer Weg, Mannheim</p>';
  }

  function erklaerung() {
    return '<section class="block erklaerung" aria-labelledby="erk-titel"><h2 id="erk-titel">So sind die Angaben zu verstehen</h2>' +
      '<div class="erk-grid"><div class="kachel"><h3>So sind die Fahrdaten zu verstehen</h3>' +
      "<p>Kilometer und Minuten stammen aus dem Google-Maps-Routenplaner, abgefragt am Donnerstag, 29.10.2026, mittags, ab Dirschauer Weg, 68307 Mannheim (schnellste Route). " +
      "Das ist eine Momentaufnahme des damaligen Verkehrs – am Samstagabend kann es anders aussehen. Der Fußweg vom Parkplatz zum Restaurant kommt noch hinzu.</p></div>" +
      '<div class="kachel"><h3>Preise &amp; Reservierungen</h3>' +
      "<p>Preise stammen aus den online veröffentlichten Karten (Stand 29.10.2026). Fehlt ein Preis online, steht „– nicht online“ und die Summe trägt ein „ca.“. Alle Summen ohne Trinkgeld und Parken. " +
      "Freie Plätze wurden nur lesend abgefragt – es wurde nichts gebucht, angefragt oder reserviert.</p></div></div></section>";
  }

  // ---------- Nachmittag ----------
  var REGIONEN = ["Mannheim", "Heidelberg", "Schwetzingen", "Weinheim", "Ludwigshafen"];

  function cafeBlock(c, hinweisTitel) {
    if (!c) return "";
    var h = "<p><b>" + esc(c.name) + "</b>" + (c.adresse ? "<br>" + esc(c.adresse) : "") + "</p>";
    if (c.oeffnung_samstag) h += "<p>Samstag: " + esc(c.oeffnung_samstag) + "</p>";
    if (c.google) h += "<p>Google: " + esc(c.google) + "</p>";
    if (c.reservierung) h += "<p>Reservierung: " + (/@/.test(c.reservierung) ? link("mailto:" + c.reservierung, esc(c.reservierung)) : esc(c.reservierung)) + "</p>";
    if (c.hinweis) h += '<p class="hinweis">' + esc(c.hinweis) + "</p>";
    var l = [link(c.website, "Website ↗"), link(c.maps_url, "Google Maps ↗")].filter(Boolean);
    if (l.length) h += '<p class="linkleiste">' + l.join('<span aria-hidden="true"> · </span>') + "</p>";
    if (c.quelle) h += '<p class="fussnote">Quelle: ' + esc(c.quelle) + "</p>";
    return feld(hinweisTitel, h);
  }

  function nachmittagKarte(n) {
    var key = "n:" + n.slug;
    var weitere = (n.weitere_links || []).map(function (l) { return link(l.url, esc(l.text) + " ↗"); }).filter(Boolean);
    return '<article class="karte" id="n-' + esc(n.slug) + '">' +
      bilder({ bilder: n.bilder, name: n.titel }) +
      '<div class="karte-kopf">' +
      '<p class="kicker">' + esc((n.region || "").toUpperCase()) + "</p>" +
      "<h3>" + esc(n.titel) + "</h3>" +
      '<p class="fakten"><span>Dauer: ' + oderNG(n.dauer) + '</span><span class="trenn" aria-hidden="true">·</span>' + entfHtml(n) + "</p>" +
      '<p class="kosten"><b>Kosten:</b> ' + oderNG(n.kosten) + "</p>" +
      (n.veranstaltung ? '<p class="tag-zeile"><span class="tag event">Veranstaltung</span> ' + esc(n.veranstaltung) + "</p>" : "") +
      likeBar(key, n.titel) + kommentarBar(key) +
      '<p class="linkleiste">' + [link(n.maps_url, "Google Maps ↗"), link(routeUrl(n.start_adresse), "Autoroute ↗")].filter(Boolean).join('<span aria-hidden="true"> · </span>') + "</p>" +
      "</div>" +
      '<details class="mehr"><summary>Ablauf, Café &amp; Details</summary><div class="mehr-innen">' +
      (n.beschreibung ? '<p class="beschreibung">' + esc(n.beschreibung) + "</p>" : "") +
      ((n.ablauf || []).length ? feld("Ablauf", '<ol class="ablauf">' + n.ablauf.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ol>") : "") +
      feld("Start", "<p>" + oderNG(n.start_adresse) + "</p>") +
      feld("Geöffnet am 31.10.", "<p>" + oderNG(n.oeffnung_31_10) + "</p>" + (n.oeffnung_quelle ? '<p class="fussnote">Quelle: ' + (link(n.oeffnung_quelle, "Öffnungszeiten ↗") || esc(n.oeffnung_quelle)) + "</p>" : "")) +
      (n.parken ? parkenHtml(n.parken) : "") +
      cafeBlock(n.cafe, "Café unterwegs") +
      cafeBlock(n.cafe_vorschlag, "Café-Vorschlag") +
      (weitere.length ? feld("Weitere Links", '<p class="linkleiste">' + weitere.join('<span aria-hidden="true"> · </span>') + "</p>") : "") +
      nichtGeprueftKasten(n.nicht_geprueft) +
      "</div></details>" +
      quellenBlock(n, "") +
      standZeile(n, "Websites der Anbieter, Wikimedia Commons (Bilder)") +
      "</article>";
  }

  function veranstaltungZeile(v) {
    var key = "v:" + slugify(v.titel + "-" + v.ort);
    return '<li class="event kachel">' +
      '<p class="event-zeit zahlen">' + oderNG(v.uhrzeit) + "</p>" +
      "<h3>" + esc(v.titel) + "</h3>" +
      '<p class="event-ort">' + oderNG(v.ort) + (v.adresse ? " · " + esc(v.adresse) : "") + "</p>" +
      "<p><b>Preis:</b> " + oderNG(v.preis) + "</p>" +
      (v.beschreibung ? '<p class="beschreibung">' + esc(v.beschreibung) + "</p>" : "") +
      likeBar(key, v.titel) + kommentarBar(key) +
      '<p class="linkleiste">' + [link(v.tickets_url, "Tickets ↗"), link(v.url, "Infos ↗"), link(routeUrl(v.adresse), "Autoroute ↗")].filter(Boolean).join('<span aria-hidden="true"> · </span>') + "</p>" +
      nichtGeprueftKasten(v.nicht_geprueft) +
      '<p class="stand">Stand ' + STAND + " · Quelle: " + (link(v.quelle, "Veranstalter ↗") || esc(v.quelle || NG)) + "</p>" +
      "</li>";
  }

  function seiteNachmittag(app) {
    var ns = D.nachmittag || [];
    var vs = D.veranstaltungen || [];
    var h = '<section class="hero klein"><p class="hero-label">Bevor es zum Essen geht</p><h1>Nachmittag</h1>' +
      '<p class="hero-unter">Ein paar ruhige Stunden zu zweit.</p></section>' + kopfzeile() +
      '<p class="hinweiszeile">Recherchestand: ' + STAND + ". Öffnungszeiten und Preise bitte am Tag selbst kurz prüfen.</p>" +
      '<div class="steuer glas-leicht">' + sucheFeld() + '<div class="steuer-zeile"><label class="check"><input type="checkbox" id="f-fav"> nur Favoriten</label>' +
      '<span class="steuer-label">Springen:</span>' +
      REGIONEN.concat(["Abends"]).map(function (r) { return '<a class="chip" href="#g-' + slugify(r) + '">' + r + "</a>"; }).join("") +
      "</div></div><div id=\"nm-inhalt\"></div>" + erklaerungKurz();
    app.innerHTML = h;

    function zeichnen() {
      var fav = zustand.nurFav;
      var out = "";
      var regionen = REGIONEN.slice();
      ns.forEach(function (n) { if (n.region && regionen.indexOf(n.region) < 0) regionen.push(n.region); });
      var treffer = 0;
      var suchtext = function (n) { return [n.titel, n.region, n.beschreibung, n.start_adresse, n.veranstaltung, (n.ablauf || []).join(" "), n.cafe && n.cafe.name, n.cafe_vorschlag && n.cafe_vorschlag.name]; };
      var vsuch = function (v) { return [v.titel, v.ort, v.adresse, v.beschreibung]; };
      regionen.forEach(function (reg) {
        var liste = ns.filter(function (n) { return n.region === reg && (!fav || istFavorit("n:" + n.slug)) && passtZurSuche(suchtext(n)); });
        treffer += liste.length;
        if (zustand.suche && !liste.length) return;
        out += '<section class="block" id="g-' + slugify(reg) + '" aria-labelledby="h-' + slugify(reg) + '"><h2 id="h-' + slugify(reg) + '">' + esc(reg) + "</h2>" +
          (liste.length ? '<div class="karten">' + liste.map(nachmittagKarte).join("") + "</div>" : leer(fav ? "Hier ist noch nichts favorisiert." : "Für diese Region liegt keine Option vor.")) +
          "</section>";
      });
      var vok = function (v) { return (!fav || istFavorit("v:" + slugify(v.titel + "-" + v.ort))) && passtZurSuche(vsuch(v)); };
      var nach = vs.filter(function (v) { return v.kategorie === "nachmittag" && vok(v); });
      var abends = vs.filter(function (v) { return v.kategorie !== "nachmittag" && vok(v); });
      treffer += nach.length + abends.length;
      if (!zustand.suche || nach.length) {
        out += '<section class="block" aria-labelledby="h-vnm"><h2 id="h-vnm">Veranstaltungen am Nachmittag</h2>' +
          (nach.length ? '<ul class="events">' + nach.map(veranstaltungZeile).join("") + "</ul>" : leer("Keine Einträge.")) + "</section>";
      }
      if (!zustand.suche || abends.length) {
        out += '<section class="block" id="g-abends" aria-labelledby="h-abends"><h2 id="h-abends">Abends</h2>' +
          '<p class="unterzeile">Achtung: Viele Termine überschneiden sich mit dem Abendessen (17–20 Uhr).</p>' +
          (abends.length ? '<ul class="events">' + abends.map(veranstaltungZeile).join("") + "</ul>" : leer("Keine Einträge.")) + "</section>";
      }
      sucheInfo(treffer);
      if (zustand.suche && !treffer) out = leer("Keine Treffer für diese Suche.");
      document.getElementById("nm-inhalt").innerHTML = out;
    }
    zeichnen();
    seiteNachmittag.zeichnen = zeichnen;
    document.getElementById("f-fav").addEventListener("change", function (e) { zustand.nurFav = e.target.checked; zeichnen(); });
    sucheVerdrahten(zeichnen);
  }

  function erklaerungKurz() {
    return '<section class="block erklaerung"><div class="kachel"><h3>So sind die Fahrdaten zu verstehen</h3>' +
      "<p>Fahrzeiten stammen aus Google Maps (Abruf 29.10.2026, mittags, Verkehrs-Momentaufnahme). Wo „Entfernung: nicht geprüft“ steht, liegt noch kein Abruf vor. Fußwege vom Parkplatz kommen hinzu.</p></div></section>";
  }

  // ---------- Cafés ----------
  function cafeKarte(c) {
    var key = "c:" + c.slug;
    var schwelle = "";
    if (c.schwelle === "referenz") schwelle = '<span class="tag warn">Unter 4,7 – nur Stil-Referenz</span>';
    else if (c.schwelle === "grenzfall") schwelle = '<span class="tag grenz">Grenzfall 4,7</span>';
    else if (c.schwelle === "unbekannt") schwelle = '<span class="tag warn">Bewertung ' + NG + "</span>";
    var bewQuelle = c.google_live ? "Google Maps (live 29.10.2026)" : (c.google_quelle || "Google");
    var urspr = "<p><b>Bewertungsquelle:</b> " + esc(c.google_quelle || NG) + "</p>" +
      (c.bewertung_hinweis ? '<p class="hinweis">' + esc(c.bewertung_hinweis) + "</p>" : "");
    return '<article class="karte" id="c-' + esc(c.slug) + '">' +
      bilder(c) +
      '<div class="karte-kopf">' +
      '<p class="kicker">' + esc((c.ort_kicker || c.ort || "").toUpperCase()) + "</p>" +
      "<h3>" + esc(c.name) + "</h3>" +
      '<p class="kueche">' + oderNG(c.spezialitaet) + "</p>" +
      '<p class="fakten">' + bewertungHtml(c) + '<span class="trenn" aria-hidden="true">·</span>' + entfHtml(c) + "</p>" +
      (schwelle ? '<p class="tag-zeile">' + schwelle + "</p>" : "") +
      (c.bewertung_hinweis ? '<p class="hinweis klein">' + esc(c.bewertung_hinweis) + "</p>" : "") +
      '<p class="kosten"><b>Preise:</b> ' + oderNG(c.preisniveau) + "</p>" +
      '<p class="kosten"><b>Samstag:</b> ' + oderNG(c.oeffnung_samstag) + "</p>" +
      likeBar(key, c.name) + kommentarBar(key) +
      linkLeiste(c) +
      "</div>" +
      '<details class="mehr"><summary>Details</summary><div class="mehr-innen">' +
      (c.beschreibung ? '<p class="beschreibung">' + esc(c.beschreibung) + "</p>" : "") +
      oeffnungHtml(c) +
      parkenHtml(c.parken) +
      kontaktHtml(c) +
      nichtGeprueftKasten(c.nicht_geprueft) +
      "</div></details>" +
      quellenBlock(c, urspr) +
      standZeile(c, "Website des Cafés; Bewertung: " + bewQuelle) +
      "</article>";
  }

  function seiteCafes(app) {
    var cs = D.cafes || [];
    var h = '<section class="hero klein"><p class="hero-label">Etwas Süßes vorher</p><h1>Cafés</h1>' +
      '<p class="hero-unter">Pâtisserien und Cafés für den Nachmittag.</p></section>' + kopfzeile() +
      '<p class="hinweiszeile">Recherchestand: ' + STAND + ". Wunsch war eine Google-Bewertung über 4,7 – Ausnahmen sind gekennzeichnet.</p>" +
      '<div class="steuer glas-leicht">' + sucheFeld() + '<div class="steuer-zeile"><label class="check"><input type="checkbox" id="f-fav"> nur Favoriten</label></div></div>' +
      '<section class="block"><div class="karten" id="karten-cafes"></div></section>' + erklaerungKurz();
    app.innerHTML = h;
    function zeichnen() {
      var liste = cs.filter(function (c) {
        return (!zustand.nurFav || istFavorit("c:" + c.slug)) && passtZurSuche([c.name, c.ort, c.ort_kicker, c.spezialitaet, c.beschreibung]);
      });
      sucheInfo(liste.length);
      document.getElementById("karten-cafes").innerHTML = liste.length ? liste.map(cafeKarte).join("") : leer(zustand.suche ? "Keine Treffer für diese Suche." : "Noch keine Favoriten.");
    }
    zeichnen();
    seiteCafes.zeichnen = zeichnen;
    document.getElementById("f-fav").addEventListener("change", function (e) { zustand.nurFav = e.target.checked; zeichnen(); });
    sucheVerdrahten(zeichnen);
  }

  // ---------- Kopfzeile: Ich bin, Thema ----------
  function ichSetzen(p) {
    ich = p === "S" || p === "B" ? p : null;
    if (ich) lsSet("jg-ich", ich);
    document.querySelectorAll(".ichbin .seg").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.person === ich)); });
    likesAktualisieren();
    kommentareAktualisieren();
  }

  var THEMEN = ["auto", "light", "dark"];
  var THEMA_TEXT = { auto: "Auto", light: "Hell", dark: "Dunkel" };
  var THEMA_ICON = {
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
  };
  function themaSetzen(t) {
    var el = document.getElementById("thema");
    if (t === "auto") { delete document.documentElement.dataset.theme; } else { document.documentElement.dataset.theme = t; }
    lsSet("jg-theme", t);
    if (el) {
      el.innerHTML = THEMA_ICON[t] + '<span class="thema-text">' + THEMA_TEXT[t] + "</span>";
      el.setAttribute("aria-label", "Darstellung: " + THEMA_TEXT[t] + " – tippen zum Wechseln");
    }
  }

  // ---------- Ereignisse ----------
  document.addEventListener("click", function (ev) {
    var seg = ev.target.closest(".ichbin .seg");
    if (seg) { ichSetzen(seg.dataset.person); toast("Hallo " + NAMEN[ich] + " – deine Stimmen werden mit " + ich + " markiert."); return; }

    if (ev.target.closest("#thema")) {
      var akt = lsGet("jg-theme") || "auto";
      themaSetzen(THEMEN[(THEMEN.indexOf(akt) + 1) % THEMEN.length]);
      return;
    }

    var bw = ev.target.closest(".bild-wechsel");
    if (bw) {
      var box = bw.closest(".bild");
      var an = !box.classList.contains("zeige2");
      box.classList.toggle("zeige2", an);
      bw.setAttribute("aria-pressed", String(an));
      bw.setAttribute("aria-label", an ? "Erstes Bild zeigen" : "Zweites Bild zeigen");
      return;
    }

    var kb = ev.target.closest("[data-komm]");
    if (kb) {
      var kel = kb.closest(".komm"), kkey = kel.dataset.key, akt2 = kb.dataset.komm;
      if (akt2 === "mehr") { kommOffen[kkey] = !kommOffen[kkey]; kommEinsZeichnen(kel); return; }
      if (akt2 === "abbrechen") { delete kommSchreiben[kkey]; kommEinsZeichnen(kel); return; }
      if (!ich) { toast("Bitte oben zuerst wählen: Ich bin Stephan oder Bilgen."); return; }
      if (akt2 === "schreiben") { kommSchreiben[kkey] = !kommSchreiben[kkey]; kommEinsZeichnen(kel); return; }
      var fertig = function (obj) { kommentare = obj || {}; kommentareAktualisieren(); kommEinsZeichnen(kel); };
      if (akt2 === "senden") {
        var txt = (kel.querySelector("textarea").value || "").trim();
        if (!txt) { toast("Bitte erst etwas schreiben."); return; }
        kb.disabled = true;
        window.KommentarStore.add(kkey, txt, ich).then(function (obj) {
          delete kommSchreiben[kkey]; kommOffen[kkey] = true; fertig(obj);
        }).catch(function () { kb.disabled = false; toast("Speichern hat nicht geklappt – bitte noch einmal versuchen."); });
        return;
      }
      if (akt2 === "loeschen") {
        window.KommentarStore.remove(kkey, Number(kb.dataset.id), ich).then(fertig)
          .catch(function () { toast("Löschen hat nicht geklappt."); });
        return;
      }
    }

    var lb = ev.target.closest(".like");
    if (lb) {
      if (!ich) {
        toast("Bitte oben zuerst wählen: Ich bin Stephan oder Bilgen.");
        var s = document.querySelector(".ichbin .seg");
        if (s) s.focus();
        return;
      }
      var key = lb.closest(".likes").dataset.key;
      var v = likes[key] = likes[key] || {};
      v[ich] = v[ich] === lb.dataset.wert ? undefined : lb.dataset.wert;
      if (!v.S && !v.B) delete likes[key];
      likesAktualisieren();
      if (zustand.nurFav) {
        var f = seiteRestaurants.zeichnen || seiteNachmittag.zeichnen || seiteCafes.zeichnen;
        if (f) f();
      }
      likesGeaendert = Date.now();
      window.LikeStore.save(likes, ich).then(function (vomServer) {
        // Der Speicher kann den gemeinsamen Stand zurückgeben (mit den Stimmen der anderen Person)
        if (vomServer && typeof vomServer === "object") { likes = vomServer; likesAktualisieren(); }
      }).catch(function () { toast("Speichern hat nicht geklappt – Stimme gilt nur bis zum Neuladen."); });
    }
  });

  // Fehlende Bilddateien: Bild ausblenden, Platzhalter mit Initialen bleibt sichtbar
  document.addEventListener("error", function (ev) {
    var t = ev.target;
    if (t && t.tagName === "IMG") {
      t.classList.add("kaputt");
      var bx = t.closest(".bild");
      if (bx && t.classList.contains("b1")) bx.classList.add("ohne-bild");
    }
  }, true);

  // ---------- Schriftgröße ----------
  var SCHRIFT_STUFEN = [90, 100, 110, 120, 130];
  function schriftSetzen(pz, meldung) {
    if (SCHRIFT_STUFEN.indexOf(pz) < 0) pz = 100;
    document.documentElement.style.setProperty("--schrift", String(pz / 100));
    lsSet("jg-schrift", String(pz));
    var kl = document.getElementById("schrift-klein"), gr = document.getElementById("schrift-gross");
    if (kl) kl.disabled = pz <= SCHRIFT_STUFEN[0];
    if (gr) gr.disabled = pz >= SCHRIFT_STUFEN[SCHRIFT_STUFEN.length - 1];
    if (meldung) toast("Schriftgröße " + pz + " %");
    return pz;
  }
  var schriftAkt = 100;
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("#schrift-klein, #schrift-gross");
    if (!b) return;
    var i = SCHRIFT_STUFEN.indexOf(schriftAkt) + (b.id === "schrift-gross" ? 1 : -1);
    i = Math.max(0, Math.min(SCHRIFT_STUFEN.length - 1, i));
    schriftAkt = schriftSetzen(SCHRIFT_STUFEN[i], true);
  });

  // ---------- Bild vergrößern (Lightbox) ----------
  var lbOffen = null; // { el, zurueck }
  function lbBauen() {
    var el = document.createElement("div");
    el.className = "lightbox";
    el.id = "lightbox";
    el.hidden = true;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Bild vergrößert");
    el.innerHTML = '<button type="button" class="lb-zu" aria-label="Bild schließen">✕</button>' +
      '<figure class="lb-fig"><img class="lb-bild" alt=""><figcaption class="lb-text"></figcaption></figure>';
    document.body.appendChild(el);
    return el;
  }
  function lbOeffnen(knopf) {
    var box = knopf.closest(".bild");
    if (!box) return;
    var img = box.classList.contains("zeige2") && box.querySelector("img.b2") ? box.querySelector("img.b2") : box.querySelector("img.b1");
    if (!img || img.classList.contains("kaputt")) return;
    var el = document.getElementById("lightbox") || lbBauen();
    var gross = el.querySelector(".lb-bild");
    gross.src = img.currentSrc || img.src;
    gross.alt = img.alt;
    var text = '<span>' + esc(img.alt) + "</span>";
    var q = sicherUrl(img.dataset.quelle);
    if (q) {
      var host = q.replace(/^https?:\/\//i, "").split("/")[0];
      text += ' · Quelle: <a href="' + esc(q) + '" target="_blank" rel="noopener noreferrer">' + esc(host) + " ↗</a>";
    }
    el.querySelector(".lb-text").innerHTML = text;
    el.hidden = false;
    document.body.classList.add("lb-offen");
    lbOffen = { el: el, zurueck: knopf };
    el.querySelector(".lb-zu").focus();
  }
  function lbSchliessen() {
    if (!lbOffen) return;
    var o = lbOffen;
    lbOffen = null;
    o.el.hidden = true;
    o.el.querySelector(".lb-bild").removeAttribute("src");
    document.body.classList.remove("lb-offen");
    if (o.zurueck && document.contains(o.zurueck)) o.zurueck.focus();
  }
  document.addEventListener("click", function (ev) {
    var k = ev.target.closest(".bild-gross");
    if (k) { lbOeffnen(k); return; }
    if (!lbOffen) return;
    // X oder Klick neben dem Bild schließt; Klick auf Bild oder Quellenlink nicht
    if (ev.target.closest(".lb-zu") || ev.target === lbOffen.el || ev.target.classList.contains("lb-fig")) lbSchliessen();
  });
  document.addEventListener("keydown", function (ev) {
    if (!lbOffen) return;
    if (ev.key === "Escape") { ev.preventDefault(); lbSchliessen(); return; }
    if (ev.key === "Tab") {
      var fo = Array.prototype.slice.call(lbOffen.el.querySelectorAll("button, a[href]"));
      if (!fo.length) return;
      var i = fo.indexOf(document.activeElement);
      ev.preventDefault();
      fo[(i + (ev.shiftKey ? -1 : 1) + fo.length) % fo.length].focus();
    }
  });

  // ---------- Start ----------
  themaSetzen(lsGet("jg-theme") || "auto");
  schriftAkt = schriftSetzen(Number(lsGet("jg-schrift")) || 100, false);
  ich = lsGet("jg-ich");
  ichSetzen(ich);

  var app = document.getElementById("app");
  var seite = document.body.dataset.seite;
  if (seite === "nachmittag") seiteNachmittag(app);
  else if (seite === "cafes") seiteCafes(app);
  else seiteRestaurants(app);

  // Fehler sichtbar machen statt still zu scheitern
  window.addEventListener("error", function (ev) { toast("Fehler: " + (ev.message || "unbekannt")); });
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev.reason; toast("Fehler: " + ((r && r.message) || r || "unbekannt"));
  });

  // Likes asynchron laden (LikeStore kann später online sein)
  document.body.classList.add("likes-laden");
  Promise.resolve()
    .then(function () { return window.LikeStore.load(); })
    .then(function (obj) {
      // Kopie, damit das Objekt beschreibbar ist; Stimmen, die vor dem Laden abgegeben wurden, bleiben erhalten
      var geladen = obj && typeof obj === "object" ? JSON.parse(JSON.stringify(obj)) : {};
      var vorher = likes;
      Object.keys(vorher).forEach(function (k) { geladen[k] = Object.assign(geladen[k] || {}, vorher[k]); });
      likes = geladen;
      if (Object.keys(vorher).length) window.LikeStore.save(likes, ich).catch(function () {});
    })
    .catch(function () { toast("Likes konnten nicht geladen werden."); })
    .then(function () {
      document.body.classList.remove("likes-laden");
      likesAktualisieren();
      var kommLaden = function () {
        if (!window.KommentarStore) return;
        window.KommentarStore.load().then(function (obj) {
          if (obj && JSON.stringify(obj) !== JSON.stringify(kommentare)) { kommentare = obj; kommentareAktualisieren(); }
        }).catch(function () {});
      };
      kommLaden();
      // Gemeinsamer Stand: alle 20 s nachsehen, ob die andere Person abgestimmt hat (nur bei sichtbarer Seite)
      if (window.LikeStore.online) {
        setInterval(function () { if (!document.hidden) kommLaden(); }, 20000);
        var nachsehen = function () {
          if (document.hidden || Date.now() - likesGeaendert < 8000) return;
          window.LikeStore.load().then(function (obj) {
            if (!obj || typeof obj !== "object" || Date.now() - likesGeaendert < 8000) return;
            if (JSON.stringify(obj) !== JSON.stringify(likes)) {
              likes = obj; likesAktualisieren();
              if (zustand.nurFav) { var f = seiteRestaurants.zeichnen || seiteNachmittag.zeichnen || seiteCafes.zeichnen; if (f) f(); }
            }
          }).catch(function () {});
        };
        setInterval(nachsehen, 20000);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) nachsehen(); });
      }
      // Sprungmarke erneut anfahren, falls sich die Höhe beim Aufbau geändert hat
      if (location.hash) { var z = document.getElementById(location.hash.slice(1)); if (z) z.scrollIntoView(); }
    });
})();
