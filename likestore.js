// Speicher für die Likes von Stephan (S) und Bilgen (B).
// Form der Daten: { "<eintrag-schluessel>": { "S": "hoch" | "runter", "B": "hoch" | "runter" } }
// Die Oberfläche nutzt ausschließlich load() und save(); welcher Speicher dahinter liegt, entscheidet
// sich am Ort der Seite:
//  - auf stephandel.github.io: gemeinsamer Stand über den Cloudflare-Worker fuerte-sync (Art "jub")
//  - sonst (Doppelklick auf die Datei): nur dieses Gerät (localStorage)
window.LikeStore = (function () {
  var KEY = "jg-likes-v1";
  var WORKER = "https://fuerte-sync.stephanhandel.workers.dev";
  var LEUTE = { S: "stephan", B: "bilgen" };
  var online = /\.github\.io$/.test(location.hostname);

  function lokalLaden() {
    try { var roh = localStorage.getItem(KEY); return roh ? JSON.parse(roh) || {} : {}; } catch (e) { return {}; }
  }
  function lokalSpeichern(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj || {})); } catch (e) {}
  }

  // Worker-Stand ("jub": { "schluessel|S|hoch": {by, at} }) → unser Objekt
  function ausWorker(jub) {
    var obj = {};
    Object.keys(jub || {}).forEach(function (slug) {
      var t = slug.split("|");
      if (t.length !== 3 || !LEUTE[t[1]] || (t[2] !== "hoch" && t[2] !== "runter")) return;
      obj[t[0]] = obj[t[0]] || {};
      obj[t[0]][t[1]] = t[2];
    });
    return obj;
  }
  // unser Objekt → Liste für den Worker, nur die Stimmen einer Person
  function fuerWorker(obj, person) {
    var liste = [];
    Object.keys(obj || {}).forEach(function (key) {
      var w = obj[key] && obj[key][person];
      if (w === "hoch" || w === "runter") liste.push({ slug: key + "|" + person + "|" + w, by: LEUTE[person] });
    });
    return liste;
  }
  function standHolen() {
    return fetch(WORKER + "/state", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Worker " + r.status);
      return r.json();
    });
  }

  return {
    KEY: KEY,
    online: online,
    load: function () {
      if (!online) return Promise.resolve(lokalLaden());
      return standHolen().then(function (d) {
        var obj = ausWorker(d.jub);
        lokalSpeichern(obj);
        return obj;
      }).catch(function () { return lokalLaden(); });
    },
    // person: "S" oder "B" – nur deren Stimmen werden ersetzt, die der anderen Person bleiben,
    // wie sie gerade auf dem Server liegen (so überschreiben sich zwei Geräte nicht gegenseitig)
    save: function (obj, person) {
      lokalSpeichern(obj);
      if (!online) return Promise.resolve();
      var andere = person === "S" ? "B" : "S";
      return standHolen().then(function (d) {
        var server = ausWorker(d.jub);
        var liste = fuerWorker(server, andere).concat(fuerWorker(obj, person));
        return fetch(WORKER + "/marks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ by: LEUTE[person] || "stephan", jub: liste })
        });
      }).then(function (r) {
        if (!r.ok) throw new Error("Worker " + r.status);
        return r.json();
      }).then(function (d) {
        var obj2 = ausWorker(d.jub);
        lokalSpeichern(obj2);
        return obj2;
      });
    }
  };
})();
