// Planer: Tag zusammenstellen (Nachmittag → Café → Restaurant → Abend), Karte mit Route, Zeitplan, Warnungen, Preisrahmen
(function () {
  "use strict";
  window.JG_SEITEN = window.JG_SEITEN || {};

  var SONNENUNTERGANG = "17:05"; // 31.10.2026 Mannheim/Heidelberg (nachgerechnet, Abweichung ±2 Min.)
  var ENTWURF = "jg-planer-entwurf";

  function abstandKm(a, b) {
    if (!a || !b) return Infinity;
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function dauerStunden(t) {
    var m = /(\d+(?:,\d+)?)/.exec(t || "");
    return m ? Number(m[1].replace(",", ".")) : 3;
  }
  // Erster Satzteil, höchstens ~80 Zeichen, sauber am Wortende gekürzt
  function kurzSatz(t) {
    t = String(t || "").split(/;|\. /)[0];
    if (t.length <= 80) return t;
    return t.slice(0, 78).replace(/\s+\S*$/, "") + " …";
  }
  function schlussZeit(oeffnung) {
    var m = /(\d{1,2})(?::(\d{2}))?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?/.exec(oeffnung || "");
    if (!m) return null;
    var h = Number(m[3]);
    if (h <= 4) h += 24; // bis 1 Uhr nachts
    return h * 60 + Number(m[4] || 0);
  }

  window.JG_SEITEN.planer = function (app, JG) {
    var H = window.JGH, esc = JG.esc, K = H.katalog(JG), KO = JG.D.koordinaten || {};
    var nurLikes = false;
    var plan = { start: "13:00" };
    var karte = null, routenLayer = null, markerLayer = null, letzteRoute = null, routeNr = 0;

    function ko(key) { return KO[key] || (K[key] && K[key].vorschlagZu ? null : null); }
    function gemocht(key) { var v = (JG.likes() || {})[key] || {}; return v.S === "hoch" || v.B === "hoch"; }
    function likeMarke(key) {
      var v = (JG.likes() || {})[key] || {}, t = "";
      if (v.S === "hoch") t += "S👍"; if (v.B === "hoch") t += (t ? " " : "") + "B👍";
      return t ? '<span class="opt-like">' + t + "</span>" : "";
    }

    app.innerHTML =
      '<section class="hero klein"><p class="hero-label">Euer Tag in vier Schritten</p><h1>Planer</h1>' +
      '<p class="hero-unter">Auswählen, auf der Karte ansehen, gemeinsam speichern.</p></section>' +
      '<div class="planer-vorlagen" id="vorlagen"></div>' +
      '<div class="planer-raster">' +
      '<div class="planer-links">' +
      '<div class="steuer glas-leicht planer-steuer"><label class="check"><input type="checkbox" id="p-likes"> nur Gemochtes zeigen</label>' +
      '<label class="p-start">Start <select id="p-start">' + ["11:00", "12:00", "12:30", "13:00", "13:30", "14:00", "15:00"].map(function (z) { return "<option" + (z === "13:00" ? " selected" : "") + ">" + z + "</option>"; }).join("") + "</select></label></div>" +
      schrittHtml("n", "1", "Nachmittag", "Spaziergang, Museum oder Garten") +
      schrittHtml("c", "2", "Kaffee & Kuchen", "sortiert nach Nähe zum Nachmittag") +
      schrittHtml("r", "3", "Abendessen", "freie Tische zuerst, dann Nähe") +
      schrittHtml("v", "4", "Danach (optional)", "Konzert, Theater, Führung") +
      "</div>" +
      '<div class="planer-rechts">' +
      '<div class="karte-box glas-leicht"><div id="planer-karte" role="region" aria-label="Karte mit eurer Route"></div></div>' +
      '<div id="planer-ergebnis"></div>' +
      "</div></div>";

    function schrittHtml(art, nr, titel, unter) {
      return '<section class="schritt glas-leicht" data-art="' + art + '"><header class="schritt-kopf"><span class="schritt-nr">' + nr + '</span><div><h2>' + titel + '</h2><p class="hinweis">' + unter + '</p></div></header><div class="optionen" id="opt-' + art + '"></div></section>';
    }

    // ---------- Vorlagen (Top-Tipps) ----------
    document.getElementById("vorlagen").innerHTML = '<span class="steuer-label">Schnellstart:</span>' +
      (JG.D.toptipps || []).map(function (t) { return '<button type="button" class="chip" data-vorlage="' + esc(t.id) + '">' + esc(t.titel) + "</button>"; }).join("") +
      '<button type="button" class="chip" data-vorlage="wuerfel">🎲 Überrasch uns</button>' +
      '<button type="button" class="chip" data-vorlage="leer">Neu beginnen</button>';

    function vorlageAnwenden(id) {
      if (id === "leer") { plan = { start: plan.start || "13:00" }; return; }
      if (id === "wuerfel") { wuerfeln(); return; }
      var t = (JG.D.toptipps || []).filter(function (x) { return x.id === id; })[0];
      if (!t) return;
      plan = { start: t.start || ((t.ablauf[0] || "").slice(0, 5).match(/\d\d:\d\d/) ? t.ablauf[0].slice(0, 5) : "13:00"), n: "n:" + t.n, c: H.cafeKey(t.c, K), r: "r:" + t.r, zeit: t.zeit, folge: t.folge };
    }

    // ---------- Optionen ----------
    function optionen(art) {
      var liste = Object.keys(K).map(function (k) { return K[k]; }).filter(function (e) { return e.art === art; });
      if (art === "v") liste = liste.filter(function (e) { return e.obj.kategorie !== "nachmittag"; });
      if (nurLikes) liste = liste.filter(function (e) { return gemocht(e.key) || plan[art] === e.key; });
      var bezug = art === "c" ? KO[plan.n] : art === "r" ? (KO[plan.c] || KO[plan.n]) : art === "v" ? KO[plan.r] : KO.start;
      liste.forEach(function (e) { e._km = abstandKm(bezug || KO.start, KO[e.key]); });
      liste.sort(function (a, b) {
        if (art === "r") {
          var ra = { ja: 0, unbekannt: 1, nein: 2 }[a.obj.status], rb = { ja: 0, unbekannt: 1, nein: 2 }[b.obj.status];
          if (ra !== rb) return ra - rb;
        }
        if (art === "c" && plan.n) {
          var va = a.vorschlagZu === plan.n.slice(2) ? 0 : 1, vb = b.vorschlagZu === plan.n.slice(2) ? 0 : 1;
          if (va !== vb) return va - vb;
        }
        if (gemocht(a.key) !== gemocht(b.key)) return gemocht(a.key) ? -1 : 1;
        return a._km - b._km;
      });
      return liste;
    }
    function optionHtml(e, art) {
      var o = e.obj, unter = [];
      if (art === "n") unter.push(o.dauer || "", o.entfernung ? o.entfernung.min + " Min. ab zuhause" : "");
      if (art === "c") unter.push(e.oeffnung ? "Sa " + e.oeffnung : "", isFinite(e._km) && plan.n ? e._km.toFixed(1).replace(".", ",") + " km vom Nachmittag" : "");
      if (art === "r") {
        var rahmen = H.preisRahmen(o);
        unter.push(o.status === "ja" ? "✅ frei" : o.status === "nein" ? "⛔ ausgebucht" : "📞 anrufen", rahmen ? "ca. " + JG.euro(rahmen[0]) + (rahmen[1] > rahmen[0] ? "–" + JG.euro(rahmen[1]) : "") : "");
      }
      if (art === "v") unter.push(o.uhrzeit || "", o.ort || "");
      var gewaehlt = plan[art] === e.key;
      return '<button type="button" class="opt' + (gewaehlt ? " gewaehlt" : "") + (art === "r" && o.status === "nein" ? " gedimmt" : "") + '" data-art="' + art + '" data-key="' + esc(e.key) + '" aria-pressed="' + gewaehlt + '">' +
        '<span class="opt-name">' + esc(e.name) + likeMarke(e.key) + '</span><span class="opt-unter">' + esc(unter.filter(Boolean).join(" · ")) + "</span></button>";
    }
    function optionenZeichnen() {
      ["n", "c", "r", "v"].forEach(function (art) {
        var liste = optionen(art);
        var el = document.getElementById("opt-" + art);
        var mehr = el.dataset.alle === "1";
        var zeigen = mehr ? liste : liste.slice(0, art === "v" ? 4 : 6);
        if (plan[art] && zeigen.indexOf(K[plan[art]]) < 0 && K[plan[art]]) zeigen = [K[plan[art]]].concat(zeigen.slice(0, zeigen.length - 1));
        var h = liste.length ? zeigen.map(function (e) { return optionHtml(e, art); }).join("") : '<p class="hinweis">Nichts gemocht in diesem Schritt – Häkchen „nur Gemochtes“ entfernen.</p>';
        if (liste.length > zeigen.length || mehr) h += '<button type="button" class="opt-mehr" data-mehr="' + art + '">' + (mehr ? "weniger anzeigen" : "alle " + liste.length + " anzeigen") + "</button>";
        if (art === "r" && plan.r && K[plan.r]) {
          var r = K[plan.r].obj, zeiten = (r.reservierung && r.reservierung.freie_zeiten) || [];
          h += '<div class="zeiten"><span class="steuer-label">Uhrzeit:</span>' +
            (zeiten.length ? zeiten : ["18:00", "18:30", "19:00", "19:30"]).map(function (z) {
              var zz = (z.match(/\d\d:\d\d/) || [z])[0];
              return '<button type="button" class="chip" data-zeit="' + esc(zz) + '" aria-pressed="' + (plan.zeit === zz) + '">' + esc(z) + "</button>";
            }).join("") + (zeiten.length ? '<span class="hinweis">online frei gesehen</span>' : '<span class="hinweis">keine Zeiten bestätigt</span>') + "</div>";
        }
        if (plan[art]) h += '<button type="button" class="opt-weg" data-weg="' + art + '">Auswahl entfernen</button>';
        el.innerHTML = h;
      });
    }

    // ---------- Ergebnis: Zeitplan, Route, Preis, Warnungen ----------
    var ICON = { n: "🍂", c: "☕", r: "🍽️", v: "✨" };
    var ART_TEXT = { n: "Nachmittag", c: "Kaffee", r: "Abendessen", v: "Danach" };
    var wetterDaten = null;
    function folge() {
      var f = (plan.folge || []).filter(function (a) { return "ncrv".indexOf(a) >= 0; });
      ["n", "c", "r", "v"].forEach(function (a) { if (f.indexOf(a) < 0) f.push(a); });
      return f.filter(function (a) { return plan[a] && K[plan[a]] && KO[plan[a]]; });
    }
    function stationen() {
      var s = [{ key: "start", name: "Zuhause", icon: "🏠" }];
      folge().forEach(function (a) { s.push({ key: plan[a], art: a, name: K[plan[a]].name, icon: ICON[a] }); });
      s.push({ key: "start", name: "Zuhause", icon: "🏠" });
      return s.filter(function (x) { return KO[x.key]; });
    }

    function routeHolen(st) {
      var pkt = st.map(function (x) { return KO[x.key].lon + "," + KO[x.key].lat; }).join(";");
      var url = "https://router.project-osrm.org/route/v1/driving/" + pkt + "?overview=full&geometries=geojson";
      return fetch(url).then(function (r) { if (!r.ok) throw new Error("Route " + r.status); return r.json(); })
        .then(function (d) { if (!d.routes || !d.routes[0]) throw new Error("keine Route"); return d.routes[0]; });
    }

    function ablaufHtml(f) {
      if (f.length < 2) return "";
      return '<div class="ablauf-box"><p class="steuer-label">Reihenfolge – am Griff ziehen oder Pfeile nutzen</p><ol class="ablauf-liste" id="ablauf-liste">' +
        f.map(function (a, i) {
          return '<li class="ab-item" data-art="' + a + '"><span class="ab-griff" aria-hidden="true">⠿</span><span class="ab-icon" aria-hidden="true">' + ICON[a] + '</span><span class="ab-name"><small>' + ART_TEXT[a] + "</small>" + esc(K[plan[a]].name) + "</span>" +
            '<button type="button" class="ab-pfeil" data-schieb="' + a + '" data-richtung="-1" aria-label="' + ART_TEXT[a] + ' früher"' + (i ? "" : " disabled") + ">↑</button>" +
            '<button type="button" class="ab-pfeil" data-schieb="' + a + '" data-richtung="1" aria-label="' + ART_TEXT[a] + ' später"' + (i < f.length - 1 ? "" : " disabled") + ">↓</button></li>";
        }).join("") + "</ol></div>";
    }

    function ergebnisZeichnen(route) {
      var st = stationen(), el = document.getElementById("planer-ergebnis");
      if (st.length <= 2) { el.innerHTML = '<div class="glas-leicht ergebnis-leer"><p>Wählt mindestens einen Schritt – oder tippt oben auf „🎲 Überrasch uns“. Dann erscheinen hier Route, Zeitplan und Preisrahmen.</p></div>'; return; }
      if (!wetterDaten && H.wetter) H.wetter().then(function (d) { wetterDaten = d; ergebnisZeichnen(letzteRoute); }).catch(function () {});
      var legs = route ? route.legs : null;
      var fahrMin = legs ? legs.reduce(function (a, l) { return a + l.duration; }, 0) / 60 : null;
      var fahrKm = legs ? legs.reduce(function (a, l) { return a + l.distance; }, 0) / 1000 : null;
      var f = folge(), pos = {};
      st.forEach(function (s, i) { if (s.art && pos[s.art] == null) pos[s.art] = i; });
      var leg = function (i) { var l = legs && legs[i]; return { min: l ? Math.round(l.duration / 60 * 1.15) : 25, km: l ? l.distance / 1000 : null }; };
      var legZu = function (art) { return pos[art] ? leg(pos[art] - 1) : { min: 0, km: null }; };
      var wetterBei = function (m) {
        var w = wetterDaten && H.wetterUm ? H.wetterUm(wetterDaten, m) : null;
        return w ? '<span class="zp-wetter" title="Vorhersage">' + w.symbol + " " + Math.round(w.t) + "°" + (w.p >= 20 ? " · ☔ " + w.p + " %" : "") + "</span>" : "";
      };
      var fahrZeile = function (x) { return '<li class="zp-fahrt">🚗 ' + x.min + " Min." + (x.km != null ? " · " + x.km.toFixed(1).replace(".", ",") + " km" : "") + "</li>"; };
      var z = function (zeit, icon, text, extra) { return '<li><span class="zp-zeit">' + H.uhr(zeit) + '</span><span class="zp-icon" aria-hidden="true">' + icon + "</span><span>" + text + wetterBei(zeit) + (extra ? "<small>" + extra + "</small>" : "") + "</span></li>"; };

      var t = H.minuten(plan.start) || 13 * 60, warn = [], zeilen = [], zeiten = {}, regenMax = 0, tempMin = 99;
      var c = plan.c && K[plan.c] ? K[plan.c] : null, schluss = c ? schlussZeit(c.oeffnung) : null;
      var cafeNah = plan.n && c && f.indexOf("c") === f.indexOf("n") + 1 && abstandKm(KO[plan.n], KO[plan.c]) <= 3;
      var soll = plan.r && K[plan.r] ? H.minuten(plan.zeit) : null;
      zeilen.push(z(t, "🏠", "Abfahrt zuhause"));
      f.forEach(function (art, k) {
        if (art === "c" && cafeNah) return; // liegt schon im Nachmittag
        var x = legZu(art); zeilen.push(fahrZeile(x)); t += x.min;
        if (art === "n") {
          var n = K[plan.n].obj, nStart = t, nEnde = t + dauerStunden(n.dauer) * 60;
          var ri = f.indexOf("r");
          if (soll != null && ri > k) {
            var rest = 15;
            for (var j = k + 1; j <= ri; j++) {
              rest += legZu(f[j]).min;
              if (j < ri) rest += f[j] === "c" ? (cafeNah && j === k + 1 ? -legZu("c").min : 60) : 90;
            }
            nEnde = Math.min(nEnde, soll - rest);
          }
          var zuN = schlussZeit(n.oeffnung_31_10);
          if (zuN != null && zuN > nStart + 30 && nEnde > zuN) nEnde = zuN; // nicht länger als geöffnet
          if (nEnde - nStart < 90) warn.push(["warn", "⏳ Für den Nachmittag bleiben nur " + Math.max(0, Math.round((nEnde - nStart) / 6) / 10).toString().replace(".", ",") + " Stunden – früher losfahren (oben „Start“) oder später essen."]);
          zeilen.push(z(nStart, "🍂", esc(K[plan.n].name), "bis ca. " + H.uhr(nEnde) + (n.oeffnung_31_10 ? " · " + esc(kurzSatz(n.oeffnung_31_10)) : "")));
          zeiten.n = nStart;
          if (cafeNah) {
            var cafeAn = nStart + Math.min(90, Math.max(0, (nEnde - nStart - 60) / 2));
            if (schluss != null && cafeAn + 60 > schluss) cafeAn = Math.max(nStart, schluss - 75);
            var km = abstandKm(KO[plan.n], KO[plan.c]);
            zeilen.push(z(cafeAn, "☕", esc(c.name), "mitten im Nachmittag, " + (km < 1.2 ? "zu Fuß" : km.toFixed(1).replace(".", ",") + " km entfernt") + (c.oeffnung ? " · Samstag " + esc(c.oeffnung) : "")));
            zeiten.c = cafeAn;
            if (!c.oeffnung && cafeAn >= 17 * 60) warn.push(["warn", "☕ " + c.name + " um " + H.uhr(cafeAn) + " – Öffnungszeit am Abend nicht geprüft, wahrscheinlich geschlossen."]);
            if (schluss != null && schluss - nStart < 60) warn.push(["warn", "☕ " + c.name + " schließt schon um " + H.uhr(schluss) + " – früher starten oder anderes Café wählen."]);
          }
          var su = H.minuten(SONNENUNTERGANG);
          if (nStart < su && nEnde > su - 30) warn.push(["info", "🌇 Sonnenuntergang um ca. " + SONNENUNTERGANG + " Uhr – Aussichtspunkte vorher einplanen."]);
          if (nStart >= su - 15) warn.push(["warn", "🌙 " + K[plan.n].name + " läge erst ab " + H.uhr(nStart) + " – dann ist es dunkel und vieles geschlossen. Den Nachmittag vor das Essen legen."]);
          var oe = String(n.oeffnung_31_10 || ""), einlass = /letzter einlass\D{0,8}(\d{1,2}[:.]\d{2})/i.exec(oe), zu = schlussZeit(oe);
          var grenze = einlass ? H.minuten(einlass[1]) : zu;
          if (grenze != null && grenze > 9 * 60 && nStart > grenze - 30) warn.push(["warn", "🚪 " + K[plan.n].name + ": " + (einlass ? "letzter Einlass " : "geöffnet bis ") + H.uhr(grenze) + " – ihr kämt erst um " + H.uhr(nStart) + " an."]);
          t = nEnde;
        } else if (art === "c") {
          zeilen.push(z(t, "☕", esc(c.name), c.oeffnung ? "Samstag " + esc(c.oeffnung) : ""));
          zeiten.c = t;
          if (schluss == null && t >= 17 * 60) warn.push(["warn", "☕ " + c.name + " um " + H.uhr(t) + " – Öffnungszeit am Abend nicht geprüft, wahrscheinlich geschlossen."]);
          if (schluss != null && t + 30 > schluss) warn.push(["warn", "☕ " + c.name + " schließt um " + H.uhr(schluss) + " – ihr kämt erst gegen " + H.uhr(t) + " an. Früher starten, Reihenfolge ändern oder Café tauschen."]);
          t += 60;
        } else if (art === "r") {
          var r = K[plan.r].obj, an = t;
          if (soll != null && an > soll + 5) warn.push(["warn", "⏰ Ihr kämt erst gegen " + H.uhr(an) + " am Restaurant an – " + plan.zeit + " wird knapp."]);
          if (soll != null && soll - an > 75) warn.push(["info", "🕰️ Vor dem Abendessen bleiben gut " + (Math.round((soll - an) / 6) / 10).toString().replace(".", ",") + " Stunden – Zeit zum Umziehen oder für einen Abstecher."]);
          t = soll != null ? Math.max(soll, an) : an;
          zeilen.push(z(t, "🍽️", esc(K[plan.r].name) + (soll == null ? " (Uhrzeit wählen)" : ""), r.telefon ? "Reservieren: " + JG.telLink(r.telefon) : ""));
          zeiten.r = t;
          if (r.status === "nein") warn.push(["warn", "⛔ " + r.name + " war online für Samstag ausgebucht – nur mit Glück per Telefon."]);
          else if (r.status !== "ja") warn.push(["info", "📞 " + r.name + ": freie Tische nicht online prüfbar – vorher anrufen."]);
          if (/vorkasse/i.test(JSON.stringify(r.reservierung || {}) + (r.preis_pro_person_korrigiert || ""))) warn.push(["info", "💳 " + r.name + ": Menü wird vorab bezahlt (Vorkasse)."]);
          t += 150;
        } else if (art === "v") {
          var v = K[plan.v].obj, vStart = H.beginn(v.uhrzeit);
          if (vStart != null && t > vStart) warn.push(["warn", "✨ " + v.titel + " beginnt um " + H.uhr(vStart) + " – in dieser Reihenfolge nicht zu schaffen. Reihenfolge ändern oder weglassen."]);
          t = vStart != null ? Math.max(vStart, t) : t;
          zeilen.push(z(t, "✨", esc(v.titel), esc(v.ort || "")));
          zeiten.v = t;
          t += 120;
        }
      });
      var heim = leg(st.length - 2); zeilen.push(fahrZeile(heim)); t += heim.min;
      zeilen.push(z(t, "🏠", "Wieder zuhause (ungefähr)"));
      if (fahrMin != null && fahrMin > 120) warn.push(["info", "🚗 Insgesamt rund " + Math.round(fahrMin) + " Minuten im Auto – vielleicht Orte näher zusammenlegen."]);

      // Wetter über den Tag
      if (wetterDaten && H.wetterUm) Object.keys(zeiten).forEach(function (a) {
        var w = H.wetterUm(wetterDaten, zeiten[a]);
        if (w) { regenMax = Math.max(regenMax, w.p); tempMin = Math.min(tempMin, w.t); }
      });
      if (regenMax >= 40 && zeiten.n != null) warn.push(["info", "☔ Regen bis " + regenMax + " % möglich – für den Nachmittag lieber Museum oder Café-Plan B im Kopf haben."]);

      // Mitnehmen
      var mit = [];
      if (regenMax >= 25) mit.push("Schirm");
      if (tempMin < 11 || zeiten.n != null) mit.push("warme Jacke – abends um die " + (tempMin < 99 ? Math.round(tempMin) : 8) + " °C");
      if (plan.n && /steil|aufstieg|wander|wald|treppen|garten|park/i.test(JSON.stringify(K[plan.n].obj))) mit.push("bequeme Schuhe");
      if (plan.r && /nur ec|nur ec-karte/i.test(JSON.stringify(K[plan.r].obj))) mit.push("EC-Karte (" + K[plan.r].name + " nimmt nur EC)");
      if (plan.r && /vorkasse/i.test(JSON.stringify(K[plan.r].obj))) mit.push("Buchungsbestätigung (Vorkasse)");
      if (plan.v && K[plan.v] && K[plan.v].obj.tickets_url) mit.push("Tickets für " + K[plan.v].name);
      mit.push("Parkticket nicht im Auto lassen");

      // Preisrahmen
      var lo = 0, hi = 0, posten = [];
      if (c) { lo += 20; hi += 30; posten.push("Café ca. 20–30 € (Schätzung)"); }
      if (plan.r && K[plan.r]) {
        var rr = H.preisRahmen(K[plan.r].obj);
        if (rr) { lo += rr[0]; hi += rr[1]; posten.push(K[plan.r].name + " " + JG.euro(rr[0]) + (rr[1] > rr[0] ? "–" + JG.euro(rr[1]) : "") + " (Preisbeispiele)"); }
        else posten.push(K[plan.r].name + ": Preis nicht geprüft");
      }
      lo += 5; hi += 20; posten.push("Parken ca. 5–20 € (Schätzung)");
      var texte = [];
      if (plan.n && K[plan.n] && K[plan.n].obj.kosten) texte.push("Nachmittag: " + K[plan.n].obj.kosten);
      if (plan.v && K[plan.v] && K[plan.v].obj.preis) texte.push("Abend: " + K[plan.v].obj.preis);
      var euroRund = function (x) { return Math.round(x).toLocaleString("de-DE") + " €"; };

      el.innerHTML =
        '<div class="ergebnis glas-leicht">' +
        '<div class="ergebnis-zahlen">' +
        kenn("🚗", fahrKm != null ? fahrKm.toFixed(0) + " km" : "–", fahrMin != null ? "ca. " + Math.round(fahrMin * 1.15) + " Min. Fahrt" : "Route lädt …") +
        kenn("💶", Math.round(lo) + "–" + euroRund(hi), "zu zweit, ohne Eintritte") +
        kenn("🕐", plan.start || "13:00", zeiten.r != null ? "losfahren · Tisch " + H.uhr(zeiten.r) : "losfahren") + "</div>" +
        ablaufHtml(f) +
        (warn.length ? '<ul class="warnungen">' + warn.map(function (w) { return '<li class="' + w[0] + '">' + esc(w[1]) + "</li>"; }).join("") + "</ul>" : "") +
        '<h3 class="zp-titel">Zeitplan (Schätzung)</h3><ol class="zeitplan">' + zeilen.join("") + "</ol>" +
        '<details class="mehr"><summary>Mitnehmen</summary><div class="mehr-innen"><ul class="mitnehmen">' + mit.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div></details>" +
        '<details class="mehr"><summary>Preisrahmen im Detail</summary><div class="mehr-innen"><ul>' + posten.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
        texte.map(function (x) { return '<p class="hinweis">' + esc(x) + "</p>"; }).join("") +
        '<p class="fussnote">Restaurant = Spanne der Preisbeispiele inkl. Getränke (wo online). Trinkgeld nicht enthalten. Fahrzeiten aus OpenStreetMap-Routen plus 15 % Puffer, ohne aktuellen Verkehr. Wetter: Open-Meteo.</p></div></details>' +
        '<div class="tag-knoepfe">' +
        '<button type="button" class="knopf-primaer" data-aktion="speichern">Als unseren Tag speichern</button>' +
        '<a class="knopf-sekundaer" target="_blank" rel="noopener" href="' + googleRoute(st) + '">Route in Google Maps ↗</a>' +
        '<button type="button" class="knopf-sekundaer" data-aktion="text">Als Text kopieren</button>' +
        "</div></div>";
      function kenn(icon, gross, klein) { return '<div class="kenn"><span aria-hidden="true">' + icon + "</span><b>" + esc(gross) + "</b><small>" + esc(klein) + "</small></div>"; }
    }

    // ---------- Reihenfolge ziehen (Maus und Finger) ----------
    var zug = null;
    app.addEventListener("pointerdown", function (ev) {
      var g = ev.target.closest(".ab-griff");
      if (!g) return;
      var item = g.closest(".ab-item");
      zug = { item: item, liste: item.parentNode, id: ev.pointerId };
      item.classList.add("zieht");
      g.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    app.addEventListener("pointermove", function (ev) {
      if (!zug || ev.pointerId !== zug.id) return;
      var unter = document.elementFromPoint(ev.clientX, ev.clientY);
      var ziel = unter && unter.closest(".ab-item");
      if (!ziel || ziel === zug.item || ziel.parentNode !== zug.liste) return;
      var r = ziel.getBoundingClientRect();
      zug.liste.insertBefore(zug.item, ev.clientY < r.top + r.height / 2 ? ziel : ziel.nextSibling);
    });
    function zugEnde(ev) {
      if (!zug || ev.pointerId !== zug.id) return;
      var neu = Array.prototype.map.call(zug.liste.querySelectorAll(".ab-item"), function (li) { return li.dataset.art; });
      zug.item.classList.remove("zieht"); zug = null;
      plan.folge = neu; alles(true);
    }
    app.addEventListener("pointerup", zugEnde);
    app.addEventListener("pointercancel", zugEnde);

    // ---------- Würfel: Zufallsvorschlag aus Gemochtem und freien Tischen ----------
    function wuerfeln() {
      var zufall = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
      var ns = Object.keys(K).filter(function (k) { return K[k].art === "n"; });
      var nsLike = ns.filter(gemocht);
      var n = zufall(nsLike.length ? nsLike : ns);
      var nObj = K[n].obj, cv = nObj.cafe_vorschlag || nObj.cafe;
      var c = cv && cv.name ? H.cafeKey("cv:" + JG.slugify(cv.name), K) : null;
      var rs = Object.keys(K).filter(function (k) { return K[k].art === "r" && K[k].obj.status === "ja"; });
      var rsLike = rs.filter(gemocht);
      var basis = rsLike.length ? rsLike : rs;
      basis.sort(function (a, b) { return abstandKm(KO[n], KO[a]) - abstandKm(KO[n], KO[b]); });
      var r = zufall(basis.slice(0, 3));
      var fz = (K[r].obj.reservierung && K[r].obj.reservierung.freie_zeiten) || [];
      var zeit = (fz.filter(function (z) { return /^1[89]:/.test(z); })[0] || fz[0] || "19:00").match(/\d\d:\d\d/)[0];
      plan = { start: plan.start || "13:00", n: n, c: c && K[c] ? c : undefined, r: r, zeit: zeit };
      JG.toast("🎲 " + K[n].name + " → " + K[r].name + " um " + zeit);
    }

    function googleRoute(st) {
      return "https://www.google.com/maps/dir/" + st.map(function (x) {
        var a = x.key === "start" ? "Dirschauer Weg, 68307 Mannheim" : (K[x.key] && K[x.key].adresse) || (KO[x.key].lat + "," + KO[x.key].lon);
        return encodeURIComponent(String(a).replace(/\s*\(.*?\)/g, ""));
      }).join("/");
    }

    function alsText() {
      var z = ["Unser 27. Jahrestag – Samstag, 31.10.2026", "", "🏠 Abfahrt " + (plan.start || "13:00")];
      folge().forEach(function (a) {
        var e = K[plan[a]], extra = "";
        if (a === "r") extra = (plan.zeit ? " um " + plan.zeit : "") + (e.obj.telefon ? " · Tel. " + e.obj.telefon : "");
        if (a === "v" && e.obj.uhrzeit) extra = " (" + e.obj.uhrzeit + ")";
        z.push(ICON[a] + " " + ART_TEXT[a] + ": " + e.name + extra);
      });
      z.push("", "Route: " + googleRoute(stationen()));
      return z.join("\n");
    }

    // ---------- Karte ----------
    function karteZeichnen() {
      if (!window.L) { document.getElementById("planer-karte").innerHTML = '<p class="hinweis" style="padding:16px">Karte konnte nicht geladen werden (keine Verbindung?).</p>'; return; }
      if (!karte) {
        karte = L.map("planer-karte", { scrollWheelZoom: false, zoomControl: true }).setView([KO.start.lat, KO.start.lon], 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(karte);
        markerLayer = L.layerGroup().addTo(karte);
      }
      markerLayer.clearLayers();
      if (routenLayer) { karte.removeLayer(routenLayer); routenLayer = null; }
      var st = stationen(), punkte = [];
      st.forEach(function (s, i) {
        if (i === st.length - 1 && i > 0) return;
        var p = [KO[s.key].lat, KO[s.key].lon]; punkte.push(p);
        L.marker(p, { icon: L.divIcon({ className: "pl-pin", html: "<span>" + s.icon + "</span>", iconSize: [36, 36], iconAnchor: [18, 18] }) })
          .bindTooltip(s.name).addTo(markerLayer);
      });
      if (punkte.length > 1) karte.fitBounds(punkte, { padding: [30, 30] });
      if (st.length <= 2) { ergebnisZeichnen(null); return; }
      var nr = ++routeNr;
      ergebnisZeichnen(null);
      routeHolen(st).then(function (route) {
        if (nr !== routeNr) return;
        letzteRoute = route;
        routenLayer = L.geoJSON(route.geometry, { style: { color: "#0047AB", weight: 5, opacity: .8 } }).addTo(karte);
        karte.fitBounds(routenLayer.getBounds(), { padding: [30, 30] });
        ergebnisZeichnen(route);
      }).catch(function () {
        if (nr !== routeNr) return;
        routenLayer = L.polyline(st.map(function (s) { return [KO[s.key].lat, KO[s.key].lon]; }), { color: "#0047AB", weight: 3, dashArray: "6 8" }).addTo(karte);
        ergebnisZeichnen(null);
        JG.toast("Route konnte nicht berechnet werden – Luftlinie gezeigt.");
      });
    }

    function startFeld() {
      var sel = document.getElementById("p-start"), z = plan.start || "13:00";
      if (!Array.prototype.some.call(sel.options, function (o) { return o.value === z; })) {
        var o = document.createElement("option"); o.value = o.textContent = z;
        var vor = Array.prototype.filter.call(sel.options, function (x) { return x.value > z; })[0];
        sel.insertBefore(o, vor || null);
      }
      sel.value = z;
    }
    function alles(vomNutzer) {
      if (vomNutzer) plan._t = Date.now();
      startFeld();
      try { localStorage.setItem(ENTWURF, JSON.stringify(plan)); } catch (e) {}
      optionenZeichnen();
      karteZeichnen();
    }

    // ---------- Ereignisse ----------
    app.addEventListener("click", function (ev) {
      var o = ev.target.closest(".opt");
      if (o) {
        var art = o.dataset.art, key = o.dataset.key;
        plan[art] = plan[art] === key ? undefined : key;
        if (art === "n" && plan[art]) {
          // Café-Vorschlag des Nachmittags gleich mit auswählen, wenn noch kein Café gewählt ist
          var n = K[key].obj, cv = n.cafe_vorschlag || n.cafe;
          if (cv && cv.name && !plan.c) plan.c = H.cafeKey("cv:" + JG.slugify(cv.name), K);
        }
        if (art === "r") { var fz = (K[key] && K[key].obj.reservierung && K[key].obj.reservierung.freie_zeiten) || []; plan.zeit = fz.length ? (fz[0].match(/\d\d:\d\d/) || [undefined])[0] : undefined; }
        alles(true); return;
      }
      var sb = ev.target.closest("[data-schieb]");
      if (sb) {
        var fo = folge(), i = fo.indexOf(sb.dataset.schieb), j = i + Number(sb.dataset.richtung);
        if (i >= 0 && j >= 0 && j < fo.length) { var tmp = fo[i]; fo[i] = fo[j]; fo[j] = tmp; plan.folge = fo; alles(true); }
        return;
      }
      var zb = ev.target.closest("[data-zeit]");
      if (zb) { plan.zeit = zb.dataset.zeit; alles(true); return; }
      var m = ev.target.closest("[data-mehr]");
      if (m) { var el = document.getElementById("opt-" + m.dataset.mehr); el.dataset.alle = el.dataset.alle === "1" ? "0" : "1"; optionenZeichnen(); return; }
      var w = ev.target.closest("[data-weg]");
      if (w) { plan[w.dataset.weg] = undefined; if (w.dataset.weg === "r") plan.zeit = undefined; alles(true); return; }
      var vl = ev.target.closest("[data-vorlage]");
      if (vl) { vorlageAnwenden(vl.dataset.vorlage); alles(true); if (vl.dataset.vorlage !== "wuerfel") JG.toast(vl.dataset.vorlage === "leer" ? "Neu beginnen" : "Vorlage übernommen – nach Belieben anpassen."); return; }
      var a = ev.target.closest("[data-aktion]");
      if (a && a.dataset.aktion === "speichern") {
        if (!JG.ich()) { JG.toast("Bitte oben erst wählen: Stephan oder Bilgen."); return; }
        var KS = window.KommentarStore;
        var zuSpeichern = { n: plan.n, c: plan.c, r: plan.r, zeit: plan.zeit, v: plan.v && KS ? KS.schluessel(plan.v) : plan.v, start: plan.start, folge: folge().join(",") };
        a.disabled = true;
        window.TagStore.load().then(function (alt) { if (alt && alt.erledigt) zuSpeichern.erledigt = alt.erledigt; if (alt && alt.fest) zuSpeichern.fest = true; return window.TagStore.save(zuSpeichern, JG.ich()); }).then(function () { a.disabled = false; JG.toast("Gespeichert – steht jetzt auf der Startseite für euch beide."); })
          .catch(function () { a.disabled = false; JG.toast("Speichern hat nicht geklappt – bitte noch einmal."); });
        return;
      }
      if (a && a.dataset.aktion === "text") {
        var text = alsText();
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { JG.toast("Text kopiert – z. B. in WhatsApp einfügen."); })
          .catch(function () { window.prompt("Zum Kopieren:", text); });
      }
    });
    document.getElementById("p-likes").addEventListener("change", function (e) { nurLikes = e.target.checked; optionenZeichnen(); });
    document.getElementById("p-start").addEventListener("change", function (e) { plan.start = e.target.value; plan._t = Date.now(); ergebnisZeichnen(letzteRoute); try { localStorage.setItem(ENTWURF, JSON.stringify(plan)); } catch (x) {} });

    // ---------- Start: Vorlage aus der Adresse, sonst gespeicherter Tag, sonst Entwurf ----------
    var tippId = new URLSearchParams(location.search).get("tipp");
    JG.beimAktualisieren = function () { optionenZeichnen(); };
    if (tippId) { vorlageAnwenden(tippId); alles(true); return; }
    try { var e = JSON.parse(localStorage.getItem(ENTWURF)); if (e) plan = e; } catch (x) {}
    alles();
    if (window.TagStore) window.TagStore.load().then(function (p) {
      if (!p || !(p.n || p.c || p.r)) return;
      // Gemeinsam gespeicherter Tag gewinnt, wenn er neuer ist als der eigene Entwurf
      if ((plan.n || plan.c || plan.r) && plan._t && plan._t > (p.at || 0)) return;
      plan = { start: p.start || plan.start || "13:00", n: p.n, c: H.cafeKey(p.c, K), r: p.r, zeit: p.zeit, v: H.eventKey(p.v, K) || undefined,
        folge: p.folge ? String(p.folge).split(",") : undefined, _t: p.at };
      alles();
      if (p.von) JG.toast("Gemeinsamer Tag geladen (zuletzt von " + (JG.NAMEN[p.von] || p.von) + ").");
    }).catch(function () {});
  };
})();
