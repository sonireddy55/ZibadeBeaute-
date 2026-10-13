// Ziba de Beauté — small progressive enhancements. The page works without JS.
(function () {
  "use strict";

  // 1) "What do you need?" filter
  var chips = document.querySelectorAll(".router .chip");
  var items = document.querySelectorAll("#menu .item");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      items.forEach(function (it) {
        it.hidden = !(f === "all" || it.getAttribute("data-group") === f);
      });
    });
  });

  // 2) Deal days: "first Monday", "second Tuesday", "third Wednesday" of each month.
  // Dates are computed in the salon's time zone (America/New_York).
  function salonToday() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric"
    }).formatToParts(new Date());
    var get = function (t) { return Number(parts.find(function (p) { return p.type === t; }).value); };
    return new Date(get("year"), get("month") - 1, get("day"));
  }
  function nthWeekday(year, month, nth, dow) {
    var first = new Date(year, month, 1);
    var offset = (dow - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (nth - 1) * 7);
  }
  function nextDeal(nth, dow, today) {
    var d = nthWeekday(today.getFullYear(), today.getMonth(), nth, dow);
    if (d < today) d = nthWeekday(today.getFullYear(), today.getMonth() + 1, nth, dow);
    return d;
  }
  var today = salonToday();
  var fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  document.querySelectorAll("[data-nth][data-dow]").forEach(function (el) {
    var d = nextDeal(Number(el.dataset.nth), Number(el.dataset.dow), today);
    var isToday = d.getTime() === today.getTime();
    if (el.classList.contains("next")) {
      el.textContent = isToday ? "Today" : "Next: " + fmt.format(d);
    } else if (isToday) {
      el.classList.add("is-today");
      el.textContent = "Deal day: " + el.textContent.replace(/ on the .*$/, " today only.");
    }
  });

  // 3) Review ticker: duplicate the list once so the loop is seamless.
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tickerList = document.querySelector(".ticker ul");
  if (tickerList && !reduce) {
    Array.prototype.slice.call(tickerList.children).forEach(function (li) {
      var copy = li.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      tickerList.appendChild(copy);
    });
  }

  // 4) Mobile booking dock: appears once the hero is off screen, hides over the services list.
  var dock = document.querySelector(".dock");
  var hero = document.querySelector(".hero");
  var services = document.getElementById("services");
  if (dock && hero && services && "IntersectionObserver" in window) {
    var heroOut = false, servicesIn = false;
    var sync = function () { dock.classList.toggle("is-on", heroOut && !servicesIn); };
    new IntersectionObserver(function (e) { heroOut = !e[0].isIntersecting; sync(); }).observe(hero);
    new IntersectionObserver(function (e) { servicesIn = e[0].isIntersecting; sync(); }).observe(services);
  }

  // 5) Scroll reveal: section headings rise in word by word; content blocks fade up.
  (function () {
    var root = document.documentElement;
    // Wrap each word of every section heading (not the hero) in a mask.
    document.querySelectorAll("main section:not(.hero) h2").forEach(function (h) {
      var words = h.textContent.trim().split(/\s+/);
      h.setAttribute("aria-label", h.textContent.trim());
      h.textContent = "";
      words.forEach(function (w, i) {
        var outer = document.createElement("span");
        outer.className = "w"; outer.setAttribute("aria-hidden", "true");
        var inner = document.createElement("span");
        inner.textContent = w; inner.style.setProperty("--i", i);
        outer.appendChild(inner); h.appendChild(outer);
        if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
      });
      h.classList.add("split");
    });
    // Blocks that fade up; groups get a small stagger.
    var groups = [
      [".services-help, .router", 0], ["#menu .item", 40], [".deals p, .deal-list li", 90],
      [".portrait", 0], [".about-grid > div > *", 80], [".press-list li", 60], [".film", 0],
      [".reviews-sum", 0], [".loc", 120], [".info", 0], [".foot .wrap > *", 80]
    ];
    groups.forEach(function (g) {
      document.querySelectorAll(g[0]).forEach(function (el, i) {
        el.classList.add("rv"); el.style.setProperty("--d", Math.min(i, 6) * g[1] + "ms");
      });
    });
    var rec = document.querySelector(".records");
    if (rec) {
      rec.classList.add("rv");
      rec.querySelectorAll("img").forEach(function (img, i) { img.style.setProperty("--i", i); });
    }
    var targets = document.querySelectorAll(".rv, .split");
    if (!("IntersectionObserver" in window)) { targets.forEach(function (t) { t.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    targets.forEach(function (t) { io.observe(t); });
    root.classList.add("rv-ready");
  })();

  // 6) Documentary: load YouTube only when someone asks to play it.
  var play = document.querySelector(".film-play");
  if (play) {
    play.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + play.dataset.video + "?autoplay=1";
      f.title = "Documentary about Ziba Ahmadi";
      f.allow = "autoplay; encrypted-media; picture-in-picture";
      f.allowFullscreen = true;
      play.replaceWith(f);
    });
  }
})();
