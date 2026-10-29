// Startseite: Begrüßung (wer schaut?), Unser Tag, Wetter am 31.10., Top-Tipps, gemeinsame Favoriten
(function () {
  "use strict";
  window.JG_SEITEN = window.JG_SEITEN || {};

  var TAG = "2026-10-31";
  var WETTER_ORT = { lat: 49.45, lon: 8.57, name: "Mannheim/Heidelberg" };

  // ---------- gemeinsame Helfer für Start und Planer ----------
  var H = window.JGH = {
    // Alle wählbaren Orte nach Schlüssel: n:… (Nachmittag), c:/cv:… (Café), r:… (Restaurant), v:… (Abend)
    katalog: function (JG) {
      var D = JG.D, k = {};
      (D.nachmittag || []).forEach(function (n) {
        k["n:" + n.slug] = { art: "n", key: "n:" + n.slug, name: n.titel, ort: n.region, obj: n, adresse: n.start_adresse, link: "nachmittag.html#n-" + n.slug };
      });
      (D.cafes || []).forEach(function (c) {
        k["c:" + c.slug] = { art: "c", key: "c:" + c.slug, name: c.name, ort: c.ort_basis || c.ort, obj: c, adresse: c.adresse, oeffnung: c.oeffnung_samstag, link: "cafes.html#c-" + c.slug };
      });
      var cafeSlugs = (D.cafes || []).map(function (c) { return c.slug; });
      (D.nachmittag || []).forEach(function (n) {
        [n.cafe_vorschlag, n.cafe].forEach(function (cv) {
          if (!cv || !cv.name) return;
          var key = "cv:" + JG.slugify(cv.name);
          if (k[key] || cafeSlugs.some(function (s) { return key.indexOf(s) >= 0; })) return;
          k[key] = { art: "c", key: key, name: cv.name, ort: n.region, obj: cv, adresse: cv.adresse, oeffnung: cv.oeffnung_samstag, link: "nachmittag.html#n-" + n.slug, vorschlagZu: n.slug };
        });
      });
      (D.restaurants || []).forEach(function (r) {
        k["r:" + r.slug] = { art: "r", key: "r:" + r.slug, name: r.name, ort: r.ort_basis || r.ort, obj: r, adresse: r.adresse, link: "restaurants.html#r-" + r.slug };
      });
      (D.veranstaltungen || []).forEach(function (v) {
        var key = "v:" + JG.slugify(v.titel + "-" + v.ort);
        k[key] = { art: "v", key: key, name: v.titel, ort: v.ort, obj: v, adresse: v.adresse, link: "nachmittag.html#g-abends" };
      });
      return k;
    },
    // Café-Schlüssel wie im Planer gespeichert (Vorschläge, die es als eigene Café-Karte gibt, zeigen auf die Karte)
    cafeKey: function (key, K) {
      if (!key) return null;
      if (K[key]) return key;
      var m = Object.keys(K).filter(function (k) { return k.indexOf("c:") === 0 && key.indexOf(k.slice(2)) >= 0; });
      return m[0] || key;
    },
    // Event-Schlüssel können gekürzt gespeichert sein
    eventKey: function (kurz, K) {
      if (!kurz) return null;
      if (K[kurz]) return kurz;
      var KS = window.KommentarStore;
      return Object.keys(K).filter(function (k) { return k.indexOf("v:") === 0 && KS && KS.schluessel(k) === kurz; })[0] || null;
    },
    preisRahmen: function (r) {
      var s = (r && r.preisbeispiele || []).map(function (p) { return p.summe; }).filter(function (x) { return typeof x === "number" && x > 0; });
      if (!s.length) return null;
      return [Math.min.apply(null, s), Math.max.apply(null, s)];
    },
    uhr: function (min) {
      min = Math.round(min);
      var h = Math.floor(min / 60) % 24, m = ((min % 60) + 60) % 60;
      return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    },
    minuten: function (hhmm) {
      var m = /(\d{1,2})[:.](\d{2})/.exec(hhmm || "");
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    },
    // Wetter für den 31.10. (einmal laden, 30 Min. merken)
    wetter: function () {
      var jetzt = Date.now();
      if (!H._wetter || jetzt - H._wetterZeit > 30 * 60 * 1000) { H._wetterZeit = jetzt; H._wetter = wetterLaden().catch(function (e) { H._wetter = null; throw e; }); }
      return H._wetter;
    },
    wetterUm: function (d, minuten) {
      if (!d || !d.hourly || minuten == null) return null;
      var std = Math.min(23, Math.max(0, Math.floor(minuten / 60)));
      var i = d.hourly.time.findIndex(function (t) { return Number(t.slice(11, 13)) === std; });
      if (i < 0) return null;
      return { p: d.hourly.precipitation_probability[i] || 0, t: d.hourly.temperature_2m[i], symbol: wmo(d.hourly.weather_code[i])[0] };
    }
  };

  // ---------- Wetter ----------
  var WMO = {
    0: ["☀️", "klar"], 1: ["🌤️", "überwiegend klar"], 2: ["⛅", "teils bewölkt"], 3: ["☁️", "bedeckt"],
    45: ["🌫️", "Nebel"], 48: ["🌫️", "Reifnebel"], 51: ["🌦️", "leichter Niesel"], 53: ["🌦️", "Niesel"], 55: ["🌧️", "starker Niesel"],
    61: ["🌦️", "leichter Regen"], 63: ["🌧️", "Regen"], 65: ["🌧️", "starker Regen"], 71: ["🌨️", "leichter Schnee"], 73: ["🌨️", "Schnee"],
    75: ["❄️", "starker Schnee"], 80: ["🌦️", "Schauer"], 81: ["🌧️", "kräftige Schauer"], 82: ["⛈️", "heftige Schauer"],
    95: ["⛈️", "Gewitter"], 96: ["⛈️", "Gewitter mit Hagel"], 99: ["⛈️", "Gewitter mit Hagel"]
  };
  function wmo(c) { return WMO[c] || WMO[Math.floor(c / 10) * 10] || ["🌡️", "Wetter"]; }

  function wetterLaden() {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + WETTER_ORT.lat + "&longitude=" + WETTER_ORT.lon +
      "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m" +
      "&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&timezone=Europe%2FBerlin&start_date=" + TAG + "&end_date=" + TAG;
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Wetter " + r.status);
      return r.json();
    });
  }

  function meteogramm(d, JG) {
    var h = d.hourly, std = [];
    for (var i = 0; i < h.time.length; i++) {
      var stunde = Number(h.time[i].slice(11, 13));
      if (stunde >= 9 && stunde <= 23) std.push({ s: stunde, t: h.temperature_2m[i], g: h.apparent_temperature[i], p: h.precipitation_probability[i], mm: h.precipitation[i], c: h.weather_code[i], w: h.wind_speed_10m[i] });
    }
    if (!std.length) return '<p class="hinweis">Für den 31.10. liegen noch keine Stundenwerte vor.</p>';
    var W = 680, Hh = 196, L = 58, R = 26, O = 36, U = 54;
    var tMin = Math.floor(Math.min.apply(null, std.map(function (x) { return Math.min(x.t, x.g); })) - 1);
    var tMax = Math.ceil(Math.max.apply(null, std.map(function (x) { return x.t; })) + 1);
    if (tMax - tMin < 6) tMax = tMin + 6;
    var bx = (W - L - R) / (std.length - 1);
    var X = function (i) { return L + i * bx; };
    var Y = function (t) { return O + (Hh - O - U) * (1 - (t - tMin) / (tMax - tMin)); };
    var yBoden = Hh - U;
    var sunset = d.daily && d.daily.sunset ? d.daily.sunset[0].slice(11, 16) : null;
    var sunM = sunset ? JG && H.minuten(sunset) : null;
    var svg = '<svg class="mgk" viewBox="0 0 ' + W + " " + Hh + '" role="img" aria-label="Wetterverlauf am 31. Oktober">';
    // Abend-Bereich (nach Sonnenuntergang dunkler)
    if (sunM != null) {
      var xs = L + ((sunM / 60) - std[0].s) * bx;
      svg += '<rect x="' + xs.toFixed(1) + '" y="' + O + '" width="' + (W - R - xs).toFixed(1) + '" height="' + (yBoden - O) + '" class="mgk-nacht"/>';
      svg += '<text x="' + (xs + 4).toFixed(1) + '" y="' + (O + 12) + '" class="mgk-klein">🌇 ' + sunset + "</text>";
    }
    // Regenbalken (Wahrscheinlichkeit)
    std.forEach(function (x, i) {
      var hh = (yBoden - O) * (x.p || 0) / 100;
      svg += '<rect x="' + (X(i) - bx * 0.32).toFixed(1) + '" y="' + (yBoden - hh).toFixed(1) + '" width="' + (bx * 0.64).toFixed(1) + '" height="' + hh.toFixed(1) + '" class="mgk-regen" rx="3"><title>' + x.s + " Uhr: Regen " + x.p + " %, " + x.mm + " mm</title></rect>";
    });
    // Temperaturlinien
    var pfad = function (f) { return std.map(function (x, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(f(x)).toFixed(1); }).join(" "); };
    svg += '<path d="' + pfad(function (x) { return x.g; }) + '" class="mgk-gefuehlt"/>';
    svg += '<path d="' + pfad(function (x) { return x.t; }) + '" class="mgk-temp"/>';
    std.forEach(function (x, i) {
      if (i % 2) return;
      svg += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(x.t).toFixed(1) + '" r="3" class="mgk-punkt"/>';
      svg += '<text x="' + X(i).toFixed(1) + '" y="' + (Y(x.t) - 8).toFixed(1) + '" class="mgk-wert">' + Math.round(x.t) + "°</text>";
      svg += '<text x="' + X(i).toFixed(1) + '" y="' + (O - 12) + '" class="mgk-symbol">' + wmo(x.c)[0] + "</text>";
      svg += '<text x="' + X(i).toFixed(1) + '" y="' + (Hh - U + 16) + '" class="mgk-achse">' + x.s + "</text>";
      svg += '<text x="' + X(i).toFixed(1) + '" y="' + (Hh - U + 32) + '" class="mgk-klein mgk-mitte">' + (x.p || 0) + " %</text>";
      svg += '<text x="' + X(i).toFixed(1) + '" y="' + (Hh - U + 46) + '" class="mgk-klein mgk-mitte">' + Math.round(x.w) + " km/h</text>";
    });
    svg += '<text x="2" y="' + (Hh - U + 32) + '" class="mgk-klein">Regen</text><text x="2" y="' + (Hh - U + 46) + '" class="mgk-klein">Wind</text>';
    return svg + "</svg>";
  }

  function wetterZusammenfassung(d) {
    var h = d.hourly, tags = [], abends = [];
    for (var i = 0; i < h.time.length; i++) {
      var s = Number(h.time[i].slice(11, 13));
      if (s >= 12 && s <= 17) tags.push(i);
      if (s >= 18 && s <= 22) abends.push(i);
    }
    var max = function (arr, f) { return arr.length ? Math.max.apply(null, arr.map(f)) : null; };
    var pTag = max(tags, function (i) { return h.precipitation_probability[i] || 0; });
    var pAbend = max(abends, function (i) { return h.precipitation_probability[i] || 0; });
    var codeMitte = h.weather_code[tags[Math.floor(tags.length / 2)]] ;
    var tipps = [];
    if (pTag >= 50) tipps.push("☔ Nachmittags eher nass – ein Museum oder Café-Plan B lohnt sich.");
    else if (pTag >= 25) tipps.push("🌂 Schirm einpacken, Regen ist möglich.");
    else tipps.push("🚶 Gutes Fenster für den Spaziergang.");
    if (pAbend >= 40) tipps.push("Abends Regen möglich – Parkhaus nahe am Restaurant wählen.");
    var tmin = d.daily.temperature_2m_min[0], tmax = d.daily.temperature_2m_max[0];
    if (tmax <= 10) tipps.push("🧣 Kühl – warme Jacke und Schal.");
    return {
      zeile: wmo(codeMitte)[0] + " " + wmo(codeMitte)[1] + " · " + Math.round(tmin) + "–" + Math.round(tmax) + " °C · Regen nachmittags bis " + pTag + " %",
      sonne: "☀️ " + d.daily.sunrise[0].slice(11, 16) + " · 🌇 " + d.daily.sunset[0].slice(11, 16),
      tipps: tipps
    };
  }

  // ---------- Seite ----------
  window.JG_SEITEN.start = function (app, JG) {
    var esc = JG.esc, K = H.katalog(JG);
    var plan = null;

    var tageBis = Math.ceil((new Date(TAG + "T00:00:00") - new Date(new Date().toDateString())) / 86400000);
    var countdown = tageBis > 1 ? "Noch " + tageBis + " Tage" : tageBis === 1 ? "Morgen ist es so weit" : tageBis === 0 ? "Heute ist euer Tag" : "Schön war’s";

    app.innerHTML =
      '<section class="hero start-hero"><div class="hero-27" aria-hidden="true">27</div>' +
      '<p class="hero-label">' + esc(countdown) + " · Samstag, 31. Oktober 2026</p>" +
      "<h1>27 Jahre wir.</h1>" +
      '<div id="gruss"></div></section>' +
      '<section class="block" aria-labelledby="h-tag"><h2 id="h-tag">Unser Tag</h2><div id="unser-tag"></div></section>' +
      '<section class="block" aria-labelledby="h-wetter"><h2 id="h-wetter">Wetter am Samstag</h2><div class="wetter glas-leicht"><div id="wetter"><p class="hinweis">Wetter wird geladen …</p></div>' +
      '<details class="mehr mg-ausfuehrlich" id="mg-auf"><summary>Ausführliches Wetter (Meteogramm wie auf der Fuerte-Seite)</summary><div id="meteogramm-jg"></div></details></div></section>' +
      '<section class="block" aria-labelledby="h-tipps"><h2 id="h-tipps">Drei Ideen für den Tag</h2><p class="unterzeile">Meine Lieblingskombinationen aus allen geprüften Angaben – mit einem Tipp direkt in den Planer.</p><div class="karten tipps" id="tipps"></div></section>' +
      '<section class="block" aria-labelledby="h-fav"><h2 id="h-fav">Eure Favoriten</h2><div id="favoriten"></div></section>' +
      '<section class="block" aria-labelledby="h-wege"><h2 id="h-wege">Alles ansehen</h2><div class="kacheln-wege">' +
      kachel("restaurants.html", "🍽️", "Restaurants", (JG.D.restaurants || []).length + " Häuser, freie Tische am Samstag") +
      kachel("nachmittag.html", "🍂", "Nachmittag", (JG.D.nachmittag || []).length + " Ideen & Veranstaltungen") +
      kachel("cafes.html", "🍰", "Cafés", (JG.D.cafes || []).length + " Pâtisserien und Cafés") +
      kachel("planer.html", "🗺️", "Planer", "Tag zusammenstellen, Karte und Preisrahmen") +
      "</div></section>";

    function kachel(href, icon, titel, text) {
      return '<a class="weg-kachel glas-leicht" href="' + href + '"><span class="weg-icon" aria-hidden="true">' + icon + "</span><span><b>" + titel + "</b><small>" + esc(text) + "</small></span></a>";
    }

    // ---------- Begrüßung / Wer schaut? ----------
    var wechseln = false;
    function grussZeichnen() {
      var ich = JG.ich(), el = document.getElementById("gruss");
      if (!ich || wechseln) {
        el.innerHTML = '<div class="werbist glas-leicht"><p class="werbist-frage">Wer schaut gerade?</p>' +
          '<div class="werbist-knoepfe"><button type="button" class="werbist-knopf" data-wer="S">Stephan</button>' +
          '<button type="button" class="werbist-knopf" data-wer="B">Bilgen</button></div>' +
          '<p class="hinweis">Damit eure 👍 und Kommentare richtig zugeordnet werden. Die Seite merkt es sich, ändern geht jederzeit.</p></div>';
      } else {
        el.innerHTML = '<p class="hero-unter">Hallo ' + esc(JG.NAMEN[ich]) + ' <span aria-hidden="true">👋</span></p>' +
          '<p class="hero-satz">Ein Tag nur für euch – hier läuft alles zusammen. <button type="button" class="link-knopf" data-aktion="wechseln">Nicht ' + esc(JG.NAMEN[ich]) + "? Wechseln</button></p>";
      }
    }
    app.addEventListener("click", function (ev) {
      var w = ev.target.closest("[data-wer]");
      if (w) { JG.ichSetzen(w.dataset.wer); wechseln = false; grussZeichnen(); favoritenZeichnen(); tagZeichnen(); JG.toast("Hallo " + JG.NAMEN[w.dataset.wer] + "!"); return; }
      if (ev.target.closest('[data-aktion="wechseln"]')) { wechseln = true; grussZeichnen(); return; }
      var t = ev.target.closest("[data-tipp]");
      if (t) { location.href = "planer.html?tipp=" + encodeURIComponent(t.dataset.tipp); return; }
      if (ev.target.closest('[data-aktion="fest"]')) {
        if (!JG.ich()) { JG.toast("Bitte erst wählen: Stephan oder Bilgen."); return; }
        var p = Object.assign({}, plan, { fest: !(plan && plan.fest) });
        window.TagStore.save(p, JG.ich()).then(function (q) { plan = q; tagZeichnen(); JG.toast(q.fest ? "Euer Tag steht fest 💛" : "Wieder als Entwurf markiert."); })
          .catch(function () { JG.toast("Speichern hat nicht geklappt."); });
      }
    });

    // ---------- Unser Tag ----------
    function tagZeichnen() {
      var el = document.getElementById("unser-tag");
      if (!plan || !(plan.n || plan.c || plan.r)) {
        el.innerHTML = '<div class="tag-leer glas-leicht"><p><b>Noch nicht geplant.</b> Stellt euch den Tag im Planer zusammen oder übernehmt eine der drei Ideen unten. Sobald ihr speichert, steht euer Tag hier – für euch beide.</p>' +
          '<p><a class="knopf-primaer" href="planer.html">Tag zusammenstellen</a></p></div>';
        return;
      }
      var schritte = [];
      var n = K[plan.n], c = K[H.cafeKey(plan.c, K)], r = K[plan.r], v = K[H.eventKey(plan.v, K)];
      if (n) schritte.push(["🍂", "Nachmittag", n]);
      if (c) schritte.push(["☕", "Kaffee", c]);
      if (r) schritte.push(["🍽️", "Abendessen" + (plan.zeit ? " · " + plan.zeit : ""), r]);
      if (v) schritte.push(["✨", "Danach", v]);
      var wann = plan.at ? new Date(Number(plan.at)).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
      var rahmen = r ? H.preisRahmen(r.obj) : null;
      el.innerHTML = '<div class="unser-tag glas-leicht' + (plan.fest ? " fest" : "") + '">' +
        '<p class="tag-status">' + (plan.fest ? "✅ Steht fest" : "📝 Entwurf") + (plan.von ? " · zuletzt von " + esc(JG.NAMEN[plan.von] || plan.von) : "") + (wann ? ", " + esc(wann) : "") + "</p>" +
        heuteHtml(r) +
        '<ol class="tag-linie">' + schritte.map(function (s) {
          var navi = s[2].adresse ? "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(String(s[2].adresse).replace(/\s*\(.*?\)/g, "")) : null;
          return '<li><span class="tl-icon" aria-hidden="true">' + s[0] + '</span><span class="tl-text"><small>' + esc(s[1]) + '</small><a href="' + s[2].link + '">' + esc(s[2].name) + "</a>" +
            (s[2].ort ? '<span class="tl-ort">' + esc(s[2].ort) + "</span>" : "") + "</span>" +
            (navi ? '<a class="tl-navi" href="' + navi + '" target="_blank" rel="noopener" aria-label="Navigation zu ' + esc(s[2].name) + '">Navi ↗</a>' : "") + "</li>";
        }).join("") + "</ol>" +
        todoHtml(r, v) +
        (rahmen ? '<p class="hinweis">Abendessen laut Preisbeispielen ca. ' + JG.euro(rahmen[0]) + (rahmen[1] > rahmen[0] ? "–" + JG.euro(rahmen[1]) : "") + " zu zweit.</p>" : "") +
        (r && r.obj.status !== "ja" && !plan.fest ? '<p class="warn-zeile">⚠️ Für dieses Restaurant ist kein freier Tisch bestätigt – bitte anrufen' + (r.obj.telefon ? ": " + JG.telLink(r.obj.telefon) : "") + ".</p>" : "") +
        '<div class="tag-knoepfe"><a class="knopf-sekundaer" href="planer.html">Im Planer ändern</a>' +
        '<button type="button" class="knopf-primaer" data-aktion="fest">' + (plan.fest ? "Wieder Entwurf" : "Als fest markieren") + "</button></div></div>";
    }
    // Heute-Modus am 31.10.: Countdown bis zum Tisch
    function heuteHtml(r) {
      var heute = new Date(), istTag = heute.getFullYear() === 2026 && heute.getMonth() === 9 && heute.getDate() === 31;
      if (!istTag) return "";
      var h = '<div class="heute"><b>Heute ist euer Tag 💛</b>';
      var tisch = plan && plan.zeit ? H.minuten(plan.zeit) : null;
      if (r && tisch != null) {
        var jetzt = heute.getHours() * 60 + heute.getMinutes(), rest = tisch - jetzt;
        if (rest > 0) h += "<span>Tisch im " + esc(r.name) + " um " + plan.zeit + " – noch " + (rest >= 60 ? Math.floor(rest / 60) + " Std. " : "") + (rest % 60) + " Min.</span>";
        else if (rest > -180) h += "<span>Guten Appetit im " + esc(r.name) + "!</span>";
      }
      return h + "</div>";
    }
    // To-dos bis Samstag – Haken werden geteilt
    function todos(r, v) {
      var liste = [];
      if (r) liste.push({ id: "res", text: (r.obj.status === "ja" ? "Tisch reservieren: " : "Anrufen und nach einem Tisch fragen: ") + r.name + (plan.zeit ? " um " + plan.zeit : ""), tel: r.obj.telefon, url: r.obj.reservierung && r.obj.reservierung.url });
      if (r && /vorkasse/i.test(JSON.stringify(r.obj))) liste.push({ id: "vork", text: "Vorkasse für " + r.name + " bezahlen und Bestätigung sichern" });
      if (v && v.obj.tickets_url) liste.push({ id: "tix", text: "Tickets kaufen: " + v.name, url: v.obj.tickets_url });
      liste.push({ id: "wetter", text: "Am Samstagmorgen noch einmal aufs Wetter schauen" });
      return liste;
    }
    function todoHtml(r, v) {
      var erl = (plan.erledigt || "").split(",").filter(Boolean);
      return '<div class="todos"><p class="steuer-label">Bis Samstag zu erledigen</p><ul>' + todos(r, v).map(function (td) {
        var an = erl.indexOf(td.id) >= 0;
        return '<li class="' + (an ? "erledigt" : "") + '"><label class="check"><input type="checkbox" data-todo="' + td.id + '"' + (an ? " checked" : "") + "> " + esc(td.text) + "</label>" +
          (td.tel ? " " + JG.telLink(td.tel) : "") + (td.url ? ' <a href="' + esc(td.url) + '" target="_blank" rel="noopener">online ↗</a>' : "") + "</li>";
      }).join("") + "</ul></div>";
    }
    app.addEventListener("change", function (ev) {
      var cb = ev.target.closest("[data-todo]");
      if (!cb) return;
      if (!JG.ich()) { cb.checked = !cb.checked; JG.toast("Bitte erst wählen: Stephan oder Bilgen."); return; }
      var erl = (plan.erledigt || "").split(",").filter(Boolean).filter(function (x) { return x !== cb.dataset.todo; });
      if (cb.checked) erl.push(cb.dataset.todo);
      var p = Object.assign({}, plan, { erledigt: erl.join(",") });
      plan = p; tagZeichnen();
      window.TagStore.save(p, JG.ich()).then(function (q) { plan = q; }).catch(function () { JG.toast("Speichern hat nicht geklappt."); });
    });

    function tagLaden() {
      if (!window.TagStore) return;
      window.TagStore.load().then(function (p) {
        if (JSON.stringify(p) !== JSON.stringify(plan)) { plan = p; tagZeichnen(); }
      }).catch(function () {});
    }

    // ---------- Top-Tipps ----------
    function tippsZeichnen() {
      var tipps = JG.D.toptipps || [];
      document.getElementById("tipps").innerHTML = tipps.map(function (t) {
        var n = K[t.n], c = K[H.cafeKey(t.c, K)], r = K["r:" + t.r];
        var rahmen = r ? H.preisRahmen(r.obj) : null;
        var cafeBudget = [20, 30];
        var preis = rahmen ? "ca. " + JG.euro(rahmen[0] + cafeBudget[0]) + "–" + JG.euro(rahmen[1] + cafeBudget[1]) + " zu zweit" : "";
        var fahrt = n && n.obj.entfernung ? n.obj.entfernung.min + " Min. bis zum Start" : "";
        return '<article class="karte tipp">' + JG.bilder({ bilder: (n && n.obj.bilder || []).slice(0, 1).concat(r ? (r.obj.bilder || []).slice(0, 1) : []), name: t.titel }) +
          '<div class="karte-kopf"><p class="kicker">' + esc(t.stimmung.toUpperCase()) + "</p><h3>" + esc(t.titel) + "</h3>" +
          '<p class="kueche">' + esc(t.kurz) + "</p>" +
          '<ul class="tipp-schritte">' + t.ablauf.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>" +
          '<p class="fakten">' + (preis ? '<span class="zahlen">' + preis + "</span>" : "") + (fahrt ? '<span class="trenn" aria-hidden="true">·</span><span>' + fahrt + "</span>" : "") + "</p>" +
          JG.aktionen("t:" + t.id, t.titel) +
          '<p><button type="button" class="knopf-primaer" data-tipp="' + esc(t.id) + '">In den Planer übernehmen</button></p></div>' +
          '<details class="mehr"><summary>Warum das passt</summary><div class="mehr-innen"><p class="beschreibung">' + esc(t.warum) + '</p><p class="fussnote">Preisrahmen = Preisbeispiele des Restaurants plus ca. 20–30 € Café (Schätzung), ohne Eintritte, Parken und Trinkgeld.</p></div></details></article>';
      }).join("");
    }

    // ---------- Favoriten aus den Likes ----------
    function favoritenZeichnen() {
      var likes = JG.likes() || {}, ich = JG.ich();
      var beide = [], einer = [], uneinig = [];
      Object.keys(likes).forEach(function (key) {
        var v = likes[key] || {}, e = K[key];
        if (!e) return;
        if (v.S === "hoch" && v.B === "hoch") beide.push(e);
        else if ((v.S === "hoch" && v.B === "runter") || (v.B === "hoch" && v.S === "runter")) uneinig.push(e);
        else if (v.S === "hoch" || v.B === "hoch") einer.push({ e: e, wer: v.S === "hoch" ? "S" : "B" });
      });
      var ARTEN = { r: "🍽️", n: "🍂", c: "🍰", v: "✨" };
      var chip = function (e, zusatz) { return '<a class="fav-chip" href="' + e.link + '"><span aria-hidden="true">' + (ARTEN[e.art] || "•") + "</span> " + esc(e.name) + (zusatz ? ' <small>' + zusatz + "</small>" : "") + "</a>"; };
      var offen = 0;
      if (ich) Object.keys(K).forEach(function (k) { if ("rnc".indexOf(K[k].art) >= 0 && !(likes[k] && likes[k][ich])) offen++; });
      var h = "";
      if (!beide.length && !einer.length && !uneinig.length) {
        h = '<p class="hinweis">Noch keine Likes. Tippt auf den Seiten auf 👍 – hier erscheinen dann eure gemeinsamen Favoriten.</p>';
      } else {
        if (beide.length) h += '<div class="fav-gruppe"><h3>💛 Beide mögen</h3><div class="fav-chips">' + beide.map(function (e) { return chip(e); }).join("") + "</div></div>";
        if (einer.length) h += '<div class="fav-gruppe"><h3>👍 Einer von euch</h3><div class="fav-chips">' + einer.map(function (x) { return chip(x.e, JG.NAMEN[x.wer]); }).join("") + "</div></div>";
        if (uneinig.length) h += '<div class="fav-gruppe"><h3>🤔 Noch uneinig</h3><div class="fav-chips">' + uneinig.map(function (e) { return chip(e); }).join("") + "</div></div>";
      }
      if (ich && offen) h += '<p class="hinweis">' + esc(JG.NAMEN[ich]) + ", bei " + offen + " Einträgen fehlt noch deine Stimme.</p>";
      document.getElementById("favoriten").innerHTML = '<div class="favoriten glas-leicht">' + h + "</div>";
    }

    // ---------- Wetter ----------
    function wetterZeichnen() {
      var el = document.getElementById("wetter");
      wetterLaden().then(function (d) {
        var z = wetterZusammenfassung(d);
        var jetzt = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        el.innerHTML = '<p class="wetter-zeile"><b>' + esc(z.zeile) + '</b></p><p class="wetter-sonne">' + esc(z.sonne) + "</p>" +
          '<div class="mgk-wrap">' + meteogramm(d, JG) + "</div>" +
          '<ul class="wetter-tipps">' + z.tipps.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" +
          '<p class="fussnote">Vorhersage für die Region Mannheim/Heidelberg · Open-Meteo · aktualisiert ' + jetzt + " Uhr, lädt alle 30 Minuten neu. Linie = Temperatur, gestrichelt = gefühlt, Balken = Regenwahrscheinlichkeit.</p>";
      }).catch(function () {
        el.innerHTML = '<p class="hinweis">Wetter konnte gerade nicht geladen werden. <a href="https://www.wetteronline.de/wetter/mannheim" rel="noopener" target="_blank">Wetter Mannheim ↗</a></p>';
      });
    }

    // Großes Meteogramm (Baustein aus dem Fuerte-Projekt) erst beim Aufklappen laden
    var mgGeladen = false;
    app.addEventListener("toggle", function (ev) {
      if (ev.target.id !== "mg-auf" || !ev.target.open || mgGeladen) return;
      mgGeladen = true;
      var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "wetter/meteogramm.css"; document.head.appendChild(css);
      var sk = document.createElement("script"); sk.src = "wetter/meteogramm.js";
      sk.onload = function () {
        window.JG_MG = window.Meteogramm.einbauen({
          ziel: "#meteogramm-jg", zeitzone: "Europe/Berlin", merkschluessel: "jg-mg",
          orte: [{ id: "mannheim", name: "Mannheim", lat: 49.4875, lon: 8.466 }, { id: "heidelberg", name: "Heidelberg", lat: 49.4094, lon: 8.6935 }],
          zeilen: ["sonne", "wolken", "regen", "temp", "wind", "feuchte"], zeilenStandard: ["sonne", "wolken", "regen", "temp", "wind"],
          tagesSymbol: true, mond: true, karte: false, tageVorher: 0, tageVoraus: 5
        });
      };
      sk.onerror = function () { document.getElementById("meteogramm-jg").innerHTML = '<p class="hinweis">Meteogramm konnte nicht geladen werden.</p>'; };
      document.body.appendChild(sk);
    }, true);

    grussZeichnen();
    tagZeichnen();
    tippsZeichnen();
    favoritenZeichnen();
    wetterZeichnen();
    tagLaden();
    setInterval(function () { if (!document.hidden) wetterZeichnen(); }, 30 * 60 * 1000);
    setInterval(function () { if (!document.hidden) tagLaden(); }, 20000);
    JG.beimAktualisieren = function () { favoritenZeichnen(); };
  };
})();
