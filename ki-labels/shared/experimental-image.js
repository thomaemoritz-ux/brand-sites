/*
 * <experimental-image> – gemeinsam für alle Seiten.
 *
 * Bild-Container. Das <img> steht im HTML-Markup (Light DOM); die Komponente
 * ergänzt ausschließlich das KI-Label als HTML/CSS-Overlay.
 *
 * Label: das offizielle EU-Icon "Fully AI-Generated" (schwarz) der Europäischen
 * Kommission, auf allen Seiten dieselbe Datei (shared/eu-ai-generated-black.svg).
 * Es erscheint auf JEDEM <experimental-image>, sobald STUDY_CONDITION === "ai"
 * (siehe condition.js).
 *
 * Größe: konstantes Label-Bild-Flächenverhältnis über alle Stimuli
 *   Fläche(Label) / Fläche(Bild) = LABEL_AREA_RATIO  (für jedes Bild gleich)
 * Das Seitenverhältnis des EU-Icons (viewBox 1384,24 x 266,41) bleibt erhalten,
 * der Abstand zur rechten unteren Bildecke skaliert mit der Labelhöhe.
 *
 * Das Bild selbst wird nie verändert oder dupliziert. Das Label ist absolut
 * positioniert und beeinflusst weder Elementgröße noch Layout oder Scrollhöhe.
 * In der Kontrollversion existiert kein Label-Element, und die Icon-Datei wird
 * nicht geladen.
 */
(function () {
  var script = document.currentScript;
  var LABEL_SRC = new URL("eu-ai-generated-black.svg", script ? script.src : window.location.href).href;
  var LABEL_ALT = "Als KI-generiert gekennzeichnet";

  var LABEL_AREA_RATIO = 0.02; // 2,0 % der Bildfläche
  var LABEL_ASPECT = 1384.24 / 266.41;
  var LABEL_INSET = 0.6; // Abstand zur Ecke = 0,6 x Labelhöhe

  var SHOW = window.STUDY_CONDITION === "ai";

  // Mit Label: Icon früh laden, damit es zusammen mit dem Bild erscheint.
  if (SHOW) {
    new Image().src = LABEL_SRC;
  }

  function fitLabel(host, label) {
    var area = host.clientWidth * host.clientHeight;
    if (!area) return;
    var h = Math.sqrt((LABEL_AREA_RATIO * area) / LABEL_ASPECT);
    label.style.height = h + "px";
    label.style.right = label.style.bottom = h * LABEL_INSET + "px";
  }

  class ExperimentalImage extends HTMLElement {
    connectedCallback() {
      if (!SHOW || this.querySelector(":scope > .xi__label")) return;

      var label = document.createElement("img");
      label.className = "xi__label";
      label.src = LABEL_SRC;
      label.alt = LABEL_ALT;
      label.decoding = "async";
      label.draggable = false;
      this.appendChild(label);

      var fit = fitLabel.bind(null, this, label);
      fit(); // sofort (korrigiert sich bei Größenänderungen und nach dem Laden)
      if (typeof ResizeObserver === "function") {
        new ResizeObserver(fit).observe(this); // feuert vor dem ersten Paint
      } else {
        window.addEventListener("resize", fit);
      }
      document.addEventListener("DOMContentLoaded", fit, { once: true });
      window.addEventListener("load", fit, { once: true });
    }
  }

  if (!customElements.get("experimental-image")) {
    customElements.define("experimental-image", ExperimentalImage);
  }
})();
