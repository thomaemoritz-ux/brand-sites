/*
 * <media-frame> image container (shared by all pages).
 *
 * The <img> is part of the markup. In variant "b" the component adds a small
 * badge (shared/badge.svg) in the bottom-right corner of every frame; in
 * variant "a" no badge element exists and the file is not requested.
 *
 * Badge size: area = 2 % of the image area, height at most 32 px; the corner
 * inset is 0.6 x the badge height. The badge is absolutely positioned and
 * never affects layout or scroll height.
 */
(function () {
  var script = document.currentScript;
  var BADGE_SRC = new URL("badge.svg", script ? script.src : window.location.href).href;
  var BADGE_ALT = "AI generated";

  var AREA_RATIO = 0.02; // 2 % of the image area
  var ASPECT = 1384.24 / 266.41;
  var INSET = 0.6; // corner inset = 0.6 x badge height
  var MAX_HEIGHT = 32; // px

  var SHOW = window.PAGE_VARIANT === "b";

  // Preload so the badge appears together with the image.
  if (SHOW) {
    new Image().src = BADGE_SRC;
  }

  function fit(host, badge) {
    var area = host.clientWidth * host.clientHeight;
    if (!area) return;
    var h = Math.min(Math.sqrt((AREA_RATIO * area) / ASPECT), MAX_HEIGHT);
    badge.style.height = h + "px";
    badge.style.right = badge.style.bottom = h * INSET + "px";
  }

  class MediaFrame extends HTMLElement {
    connectedCallback() {
      if (!SHOW || this.querySelector(":scope > .xi__badge")) return;

      var badge = document.createElement("img");
      badge.className = "xi__badge";
      badge.src = BADGE_SRC;
      badge.alt = BADGE_ALT;
      badge.decoding = "async";
      badge.draggable = false;
      this.appendChild(badge);

      var update = fit.bind(null, this, badge);
      update();
      if (typeof ResizeObserver === "function") {
        new ResizeObserver(update).observe(this);
      } else {
        window.addEventListener("resize", update);
      }
      document.addEventListener("DOMContentLoaded", update, { once: true });
      window.addEventListener("load", update, { once: true });
    }
  }

  if (!customElements.get("media-frame")) {
    customElements.define("media-frame", MediaFrame);
  }
})();
