/*
 * Seiten-Interaktionen. Bedingungsunabhängig: identisches Verhalten
 * in beiden Versionen.
 */
(function () {
  "use strict";

  var header = document.getElementById("site-header");
  var menuBtn = document.getElementById("menu-btn");
  var nav = document.getElementById("site-nav");

  /* Mobile Navigation */
  function setMenu(open) {
    header.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
  }
  menuBtn.addEventListener("click", function () {
    setMenu(!header.classList.contains("is-open"));
  });
  nav.addEventListener("click", function (event) {
    if (event.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenu(false);
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", function (mq) {
    if (mq.matches) setMenu(false);
  });
})();
