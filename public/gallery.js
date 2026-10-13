// Before/after compare sliders. Without JS the two photos show side by side.
(function () {
  "use strict";
  document.querySelectorAll(".ba").forEach(function (fig) {
    var range = fig.querySelector(".ba-range");
    if (!range) return;
    var set = function () { fig.style.setProperty("--pos", range.value + "%"); };
    range.addEventListener("input", set);
    set();
    fig.classList.add("ba-live");
  });
})();
