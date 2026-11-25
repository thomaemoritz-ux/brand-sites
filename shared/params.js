/*
 * Page variant from the URL (shared by all pages).
 *
 *   ?label=1 -> variant "b"      ?label=0 -> variant "a"
 *   also accepted (lower priority): ?v=a|b, ?condition=control|ai
 *   missing or invalid -> variant "a"
 *
 * Loaded synchronously in <head> so the variant is known before the first
 * image is parsed.
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
  var b;
  if (label === "1" || label === "0") {
    b = label === "1";
  } else if (v === "a" || v === "b") {
    b = v === "b";
  } else {
    b = get("condition") === "ai";
  }

  window.PAGE_VARIANT = b ? "b" : "a";

  // Enables the reveal animations only when JavaScript runs.
  document.documentElement.classList.add("js");
})();
