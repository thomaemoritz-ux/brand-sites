/*
 * Session timer (shared by all pages) – standalone use only.
 *
 * Embedded in an iframe (e.g. a survey page) this script does nothing: the
 * surrounding page controls timing and navigation, so no second timer, overlay
 * or redirect appears inside the frame.
 *
 * Opened directly (not framed), the page is left after 90 s (from window load):
 *   - with a valid ?return=<URL>: redirect there, appending
 *       dwell        seconds since load (one decimal)
 *       scroll       maximum scroll depth in % of the page height (0–100)
 *       exit         "timer"
 *       label_shown  1 for variant "b", otherwise 0
 *   - without: window.close() (works only for script-opened windows), otherwise
 *     a short "time is up" notice.
 *
 * The return URL must use https and a host in ALLOWED_RETURN_HOSTS (or a
 * subdomain); localhost only while testing locally. Local testing only:
 * ?timeout=<seconds> or ?timeout=off.
 */
(function () {
  "use strict";

  var framed;
  try {
    framed = window.self !== window.top;
  } catch (e) {
    framed = true;
  }
  if (framed) return;

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

  var duration = DURATION_MS;
  if (isLocal && params.has("timeout")) {
    var t = params.get("timeout");
    if (t === "off") return;
    var seconds = parseFloat(t);
    if (seconds > 0) duration = seconds * 1000;
  }

  function validReturnUrl(raw) {
    if (!raw) return null;
    var url;
    try {
      url = new URL(raw);
    } catch (e) {
      return null;
    }
    var h = url.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") return isLocal ? url : null;
    if (url.protocol !== "https:") return null;
    var allowed = ALLOWED_RETURN_HOSTS.some(function (d) {
      return h === d || h.slice(-(d.length + 1)) === "." + d;
    });
    return allowed ? url : null;
  }
  var returnUrl = validReturnUrl(params.get("return"));

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

  var start = null;

  function showNotice() {
    var box = document.createElement("div");
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Time is up");
    box.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;" +
      "padding:24px;background:rgba(255,255,255,0.97);color:#111;text-align:center;" +
      "font:18px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;";
    var p = document.createElement("p");
    p.style.cssText = "max-width:26em;margin:0";
    p.textContent = "Time is up. Please close this window or tab and return to the survey.";
    box.appendChild(p);
    document.body.appendChild(box);
    document.documentElement.style.overflow = "hidden";
  }

  function finish() {
    measure();
    var dwell = Math.round((performance.now() - start) / 100) / 10;

    if (returnUrl) {
      returnUrl.searchParams.set("dwell", dwell.toFixed(1));
      returnUrl.searchParams.set("scroll", String(maxScroll));
      returnUrl.searchParams.set("exit", "timer");
      returnUrl.searchParams.set("label_shown", window.PAGE_VARIANT === "b" ? "1" : "0");
      window.location.replace(returnUrl.href);
      return;
    }

    try {
      window.close();
    } catch (e) {
      /* ignore */
    }
    window.setTimeout(showNotice, 150);
  }

  function begin() {
    start = performance.now();
    measure();
    window.setTimeout(finish, duration);
  }

  if (document.readyState === "complete") {
    begin();
  } else {
    window.addEventListener("load", begin, { once: true });
  }
})();
