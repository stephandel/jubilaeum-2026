// Online-Fassung des LikeStore: gemeinsame Likes über die Artefakt-Datenbank (claude.ai),
// Rückfall auf localStorage, wenn die Datenbank nicht erreichbar ist (z. B. nicht angemeldet).
// Gleiche Schnittstelle wie likestore.js: load() und save(obj).
window.LikeStore = (function () {
  var KEY = "jg-likes-v1";
  var dbPromise = null;
  function lokalLaden() {
    try { var roh = localStorage.getItem(KEY); return roh ? JSON.parse(roh) || {} : {}; } catch (e) { return {}; }
  }
  function lokalSpeichern(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj || {})); } catch (e) {}
  }
  function db() {
    if (!dbPromise) {
      dbPromise = (window.claude && typeof window.claude.use === "function")
        ? window.claude.use("db").catch(function () { return null; })
        : Promise.resolve(null);
    }
    return dbPromise;
  }
  return {
    KEY: KEY,
    online: false,
    load: function () {
      var self = this;
      return db().then(function (d) {
        if (!d) return lokalLaden();
        return d.doc("likes/alle").get().then(function (snap) {
          self.online = true;
          var daten = (snap && typeof snap.data === "function") ? snap.data() : null;
          // Kopie anlegen: das Objekt aus der Datenbank ist schreibgeschützt (eingefroren),
          // direkte Änderungen daran würden im Strict Mode einen Fehler werfen.
          var obj = (daten && daten.stimmen) ? JSON.parse(JSON.stringify(daten.stimmen)) : {};
          lokalSpeichern(obj);
          return obj;
        }).catch(function () { return lokalLaden(); });
      });
    },
    save: function (obj) {
      lokalSpeichern(obj);
      return db().then(function (d) {
        if (!d) return;
        return d.doc("likes/alle").set({ stimmen: obj || {}, stand: new Date().toISOString() });
      });
    }
  };
})();
