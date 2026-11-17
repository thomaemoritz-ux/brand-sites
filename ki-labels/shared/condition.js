/*
 * Experimentelle Bedingung (Studien-Stimulus) – gemeinsam für alle Seiten.
 *
 *   ?label=1  ->  Version mit KI-Label
 *   ?label=0  ->  Kontrollversion ohne KI-Label
 *
 * Aus Kompatibilität weiterhin gültig (niedrigere Priorität):
 *   ?v=a / ?v=b            (a = ohne Label, b = mit Label)
 *   ?condition=control|ai
 *
 * Ohne Parameter oder bei ungültigen Werten wird die Kontrollversion gezeigt.
 * Beide Versionen laden exakt denselben Code und dieselben Bilder; einziger
 * Unterschied ist, ob das Label-Element im DOM erzeugt wird.
 *
 * Wird synchron im <head> geladen, damit die Bedingung feststeht, bevor das
 * erste Bild im DOM erscheint (kein Flackern).
 */
(function () {
  var params = null;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (e) {
    params = null;
  }
  function get(name) {
    return params ? params.get(name) : null;
  }

  var label = get("label");
  var v = get("v");
  var ai;
  if (label === "1" || label === "0") {
    ai = label === "1";
  } else if (v === "a" || v === "b") {
    ai = v === "b";
  } else {
    ai = get("condition") === "ai";
  }

  window.STUDY_CONDITION = ai ? "ai" : "control";

  // Aktiviert die Reveal-Animationen nur, wenn JavaScript läuft.
  // Identisch in beiden Bedingungen.
  document.documentElement.classList.add("js");
})();
