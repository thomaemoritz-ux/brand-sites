/*
 * Engagement tracking (shared by all pages, identical in both variants).
 *
 * Sends to window.parent (only when the page is framed), targetOrigin "*":
 *   { type: "study-tracking", site, maxScroll, imgTotal, imgSeen, lblSeen, clicks }
 *
 *   site      velora | nordfeld | arlowe | novae (from the folder name)
 *   maxScroll deepest visible point (viewport bottom) in % of the page height
 *   imgTotal  number of <media-frame> images on the page
 *   imgSeen   images that were at least 50 % visible for at least 500 ms
 *   lblSeen   same for the corner badges (always 0 in variant "a")
 *   clicks    clicks / taps (primary pointer releases; scroll gestures excluded)
 *
 * Values are cumulative per site and variant within the browser tab
 * (sessionStorage, optional ?sid=<id> to separate sessions) and are sent on
 * every change (at most once per second) and on pagehide.
 */
(function () {
  "use strict";

  var SITES = ["velora", "nordfeld", "arlowe", "novae"];
  var segments = window.location.pathname.split("/").filter(Boolean);
  var site = "";
  segments.forEach(function (s) {
    if (SITES.indexOf(s) !== -1) site = s;
  });

  var variant = window.PAGE_VARIANT === "b" ? "b" : "a";
  var sid = "";
  try {
    sid = (new URLSearchParams(window.location.search).get("sid") || "").slice(0, 64);
  } catch (e) {
    sid = "";
  }
  var KEY = "st:" + site + ":" + variant + (sid ? ":" + sid : "");

  var framed;
  try {
    framed = window.self !== window.top;
  } catch (e) {
    framed = true;
  }

  /* ---- state (restored from sessionStorage if available) ---- */
  var state = { maxScroll: 0, img: {}, lbl: {}, clicks: 0 };
  try {
    var saved = JSON.parse(window.sessionStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") {
      state.maxScroll = Math.min(100, Math.max(0, Number(saved.maxScroll) || 0));
      state.img = saved.img && typeof saved.img === "object" ? saved.img : {};
      state.lbl = saved.lbl && typeof saved.lbl === "object" ? saved.lbl : {};
      state.clicks = Math.max(0, Number(saved.clicks) || 0);
    }
  } catch (e) {
    /* storage unavailable: keep values for this page view only */
  }
  function save() {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  /* ---- sending (throttled to once per second) ---- */
  var frames = [];
  var badges = [];
  var lastSent = "";
  var lastTime = 0;
  var timer = null;

  function size(o) {
    return Object.keys(o).length;
  }
  function payload() {
    return {
      type: "study-tracking",
      site: site,
      maxScroll: state.maxScroll,
      imgTotal: frames.length,
      imgSeen: Math.min(size(state.img), frames.length || size(state.img)),
      lblSeen: variant === "b" ? Math.min(size(state.lbl), badges.length || size(state.lbl)) : 0,
      clicks: state.clicks
    };
  }
  function sendNow(force) {
    timer = null;
    var data = payload();
    var text = JSON.stringify(data);
    if (!framed || (!force && text === lastSent)) return;
    lastSent = text;
    lastTime = Date.now();
    try {
      window.parent.postMessage(data, "*");
    } catch (e) {
      /* ignore */
    }
  }
  function changed() {
    save();
    if (timer) return;
    var wait = Math.max(0, 1000 - (Date.now() - lastTime));
    timer = window.setTimeout(function () {
      sendNow(false);
    }, wait);
  }

  /* ---- scroll depth ---- */
  function measure() {
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    if (!total) return;
    var seen = (window.pageYOffset || doc.scrollTop || 0) + window.innerHeight;
    var pct = Math.min(100, Math.round((seen / total) * 100));
    if (pct > state.maxScroll) {
      state.maxScroll = pct;
      changed();
    }
  }
  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("touchend", measure, { passive: true });
  window.setInterval(measure, 1000); // catches momentum scrolling on touch devices

  /* ---- clicks / taps ---- */
  if (window.PointerEvent) {
    document.addEventListener(
      "pointerup",
      function (e) {
        if (e.isPrimary === false) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        state.clicks += 1;
        changed();
      },
      true
    );
  } else {
    document.addEventListener(
      "click",
      function () {
        state.clicks += 1;
        changed();
      },
      true
    );
  }

  /* ---- visibility: >= 50 % for >= 500 ms ---- */
  function watch(list, store) {
    if (!("IntersectionObserver" in window)) return;
    var pending = {};
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var i = list.indexOf(entry.target);
          if (i === -1 || store[i]) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.499) {
            if (!pending[i]) {
              pending[i] = window.setTimeout(function () {
                pending[i] = null;
                store[i] = 1;
                io.unobserve(list[i]);
                changed();
              }, 500);
            }
          } else if (pending[i]) {
            window.clearTimeout(pending[i]);
            pending[i] = null;
          }
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    list.forEach(function (el, i) {
      if (!store[i]) io.observe(el);
    });
  }

  function init() {
    frames = Array.prototype.slice.call(document.querySelectorAll("media-frame"));
    badges = Array.prototype.slice.call(document.querySelectorAll("media-frame > .xi__badge"));
    watch(frames, state.img);
    watch(badges, state.lbl);
    measure();
    changed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("pagehide", function () {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
    save();
    sendNow(true);
  });
})();
