/*
 * Sitzungs-Timer (Studien-Stimulus) – gemeinsam für alle Seiten.
 *
 * Nach 90 Sekunden (Start: window "load", also sobald die Seite geladen ist)
 * wird die Seite automatisch verlassen:
 *   - mit gültiger Rücksprung-URL (?return=<URL>): Weiterleitung dorthin;
 *   - ohne Rücksprung-URL: window.close() (klappt nur bei per Skript geöffneten
 *     Fenstern) und sonst ein Hinweis-Overlay "Zeit abgelaufen".
 *
 * Protokollierung (wird als Query-Parameter an die Rücksprung-URL angehängt):
 *   dwell        Verweildauer in Sekunden (eine Nachkommastelle), ab "load"
 *   scroll       maximale Scrolltiefe in Prozent der Seitenhöhe (0–100): der
 *                tiefste je sichtbare Punkt (Oberkante Viewport + Viewporthöhe)
 *                relativ zur gesamten Seitenhöhe
 *   exit         "timer"
 *   label_shown  1 = Version mit KI-Label, 0 = Kontrollversion
 *
 * Beispiel:
 *   https://nordfeld-site/?label=1&return=https%3A%2F%2Fxy.qualtrics.com%2Fjfe%2Fform%2FSV_abc
 *   -> https://xy.qualtrics.com/jfe/form/SV_abc?dwell=90.0&scroll=64&exit=timer&label_shown=1
 *
 * Sicherheit: Die Rücksprung-URL wird nur akzeptiert, wenn sie https verwendet und
 * der Host in ALLOWED_RETURN_HOSTS (oder ein Subdomain davon) liegt – sonst wäre
 * die Seite ein offener Weiterleiter. Beim lokalen Testen sind localhost/127.0.0.1
 * erlaubt. Eigene Qualtrics-Domain (z. B. Uni-Domain)? Unten eintragen.
 *
 * Eingebettet als iframe (z. B. in einer Qualtrics-Frage):
 *   Kein Weiterleiten und kein window.close(). Stattdessen schickt die Seite alle
 *   5 s und nach Ablauf per postMessage an die umgebende Umfrage:
 *     { type: "ki-labels-session", site, dwell, scroll, label_shown, final }
 *   (nur an erlaubte Ursprünge, s. ALLOWED_RETURN_HOSTS). Nach Ablauf erscheint
 *   ein neutraler Hinweis im Rahmen; das Weiterschalten übernimmt die Umfrage
 *   (z. B. Qualtrics-Timing-Frage mit automatischem Weiter nach 90 s).
 *
 * Nur lokal (localhost, 127.0.0.1) zum Testen:
 *   ?timeout=<Sekunden>   Dauer überschreiben (z. B. 5)
 *   ?timeout=off          Timer abschalten
 */
(function () {
  "use strict";

  var DURATION_MS = 90 * 1000;
  var ALLOWED_RETURN_HOSTS = ["qualtrics.com", "prolific.com", "prolific.co"];

  var host = window.location.hostname;
  var isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";

  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (e) {
    params = new URLSearchParams("");
  }

  /* ---- Dauer (Testüberschreibung nur lokal) ---- */
  var duration = DURATION_MS;
  if (isLocal && params.has("timeout")) {
    var t = params.get("timeout");
    if (t === "off") return;
    var seconds = parseFloat(t);
    if (seconds > 0) duration = seconds * 1000;
  }

  /* ---- Rücksprung-URL prüfen ---- */
  function validReturnUrl(raw) {
    if (!raw) return null;
    var url;
    try {
      url = new URL(raw);
    } catch (e) {
      return null;
    }
    var h = url.hostname.toLowerCase();
    var local = h === "localhost" || h === "127.0.0.1";
    if (local) return isLocal ? url : null; // lokale Ziele nur beim lokalen Testen
    if (url.protocol !== "https:") return null;
    var allowed = ALLOWED_RETURN_HOSTS.some(function (d) {
      return h === d || h.slice(-(d.length + 1)) === "." + d;
    });
    return allowed ? url : null;
  }
  var returnUrl = validReturnUrl(params.get("return"));

  /* ---- Einbettung als iframe ---- */
  var framed;
  try {
    framed = window.self !== window.top;
  } catch (e) {
    framed = true; // Zugriff auf top verweigert = fremder Rahmen
  }

  function allowedOrigin(raw) {
    if (!raw) return null;
    var u;
    try {
      u = new URL(raw);
    } catch (e) {
      return null;
    }
    var h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") return isLocal ? u.origin : null;
    if (u.protocol !== "https:") return null;
    var ok = ALLOWED_RETURN_HOSTS.some(function (d) {
      return h === d || h.slice(-(d.length + 1)) === "." + d;
    });
    return ok ? u.origin : null;
  }
  var parentOrigin = null;
  if (framed) {
    var anc = window.location.ancestorOrigins;
    parentOrigin = allowedOrigin(anc && anc.length ? anc[0] : document.referrer);
  }
  var siteId = (window.location.pathname.split("/").filter(Boolean).slice(-1)[0] || "").replace(/-site$/, "");
  if (siteId === "site") siteId = "velora";

  /* ---- Scrolltiefe ---- */
  var maxScroll = 0;
  function measure() {
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    if (!total) return;
    var seen = (window.pageYOffset || doc.scrollTop || 0) + window.innerHeight;
    var pct = Math.min(100, Math.round((seen / total) * 100));
    if (pct > maxScroll) maxScroll = pct;
  }
  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("resize", measure, { passive: true });

  /* ---- Abschluss ---- */
  var start = null;
  var ticker = null;

  function dwellNow() {
    return Math.round((performance.now() - start) / 100) / 10;
  }

  function post(final) {
    if (!parentOrigin || start === null) return;
    measure();
    try {
      window.parent.postMessage(
        {
          type: "ki-labels-session",
          site: siteId,
          dwell: dwellNow(),
          scroll: maxScroll,
          label_shown: window.STUDY_CONDITION === "ai" ? 1 : 0,
          final: !!final
        },
        parentOrigin
      );
    } catch (e) {
      /* ignorieren */
    }
  }

  function showOverlay(text) {
    var box = document.createElement("div");
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Zeit abgelaufen");
    box.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;" +
      "padding:24px;background:rgba(255,255,255,0.97);color:#111;text-align:center;" +
      "font:18px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;";
    var p = document.createElement("p");
    p.style.cssText = "max-width:26em;margin:0";
    p.textContent = text;
    box.appendChild(p);
    document.body.appendChild(box);
    document.documentElement.style.overflow = "hidden";
  }

  function finish() {
    measure();
    var dwell = dwellNow();

    if (framed) {
      if (ticker) window.clearInterval(ticker);
      post(true);
      showOverlay("Die Zeit ist abgelaufen. Die Umfrage geht gleich weiter.");
      return;
    }

    if (returnUrl) {
      returnUrl.searchParams.set("dwell", dwell.toFixed(1));
      returnUrl.searchParams.set("scroll", String(maxScroll));
      returnUrl.searchParams.set("exit", "timer");
      returnUrl.searchParams.set("label_shown", window.STUDY_CONDITION === "ai" ? "1" : "0");
      window.location.replace(returnUrl.href);
      return;
    }

    try {
      window.close();
    } catch (e) {
      /* ignorieren */
    }
    window.setTimeout(function () {
      showOverlay(
        "Die Zeit ist abgelaufen. Bitte schließe dieses Fenster bzw. diesen Tab und kehre zur Umfrage zurück."
      );
    }, 150);
  }

  function begin() {
    start = performance.now();
    measure();
    window.setTimeout(finish, duration);
    if (framed) {
      post(false);
      ticker = window.setInterval(function () {
        post(false);
      }, 5000);
    }
  }

  if (document.readyState === "complete") {
    begin();
  } else {
    window.addEventListener("load", begin, { once: true });
  }
})();
