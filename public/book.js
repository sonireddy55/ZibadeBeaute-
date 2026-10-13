// Ziba de Beauté — booking page.
(function () {
  "use strict";

  // Services, deals, closed days and the online booking link come from content/*.json,
  // injected by scripts/build.mjs. Ziba edits them in Pages CMS.
  var DATA = JSON.parse(document.getElementById("book-data").textContent);
  var ONLINE_BOOKING = DATA.online;
  var SERVICES = DATA.services;
  var CLOSED = DATA.closedDays; // 0 = Sunday
  var PHONE = "+13523284727";
  var SALONS = { campus: "Campus (805 NW 13th St)", thornebrook: "Thornebrook (2441 NW 43rd St, Suite 7)" };
  var SALON_SHORT = { campus: "Campus", thornebrook: "Thornebrook" };

  var $ = function (id) { return document.getElementById(id); };
  var form = $("book-form");

  // Service options are already in the page (rendered by scripts/build.mjs).

  // Dates, in the salon's time zone.
  function salonToday() {
    var p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
    var get = function (t) { return Number(p.find(function (x) { return x.type === t; }).value); };
    return new Date(get("year"), get("month") - 1, get("day"));
  }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseDay(v) { if (!v) return null; var a = v.split("-").map(Number); return new Date(a[0], a[1] - 1, a[2]); }
  // nth: 1-4, or -1 for the last one in the month.
  function nthWeekday(y, m, nth, dow) {
    if (nth === -1) {
      var last = new Date(y, m + 1, 0);
      return new Date(y, m, last.getDate() - ((last.getDay() - dow + 7) % 7));
    }
    var first = new Date(y, m, 1); var off = (dow - first.getDay() + 7) % 7;
    return new Date(y, m, 1 + off + (nth - 1) * 7);
  }
  function isDealDay(d, deal) { return !!(d && deal && nthWeekday(d.getFullYear(), d.getMonth(), deal.nth, deal.dow).getTime() === d.getTime()); }
  var today = salonToday();
  var max = new Date(today); max.setDate(max.getDate() + 90);
  $("day").min = iso(today); $("day").max = iso(max);
  var fmtDay = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Preselect from ?service= and ?salon=
  var q = new URLSearchParams(location.search);
  var pre = q.get("service");
  if (pre && SERVICES.some(function (s) { return s.id === pre; })) form.querySelector('input[name="service"][value="' + pre + '"]').checked = true;
  var preSalon = q.get("salon");
  if (preSalon && SALONS[preSalon]) form.querySelector('input[name="salon"][value="' + preSalon + '"]').checked = true;

  function state() {
    var sv = form.querySelector('input[name="service"]:checked');
    var sl = form.querySelector('input[name="salon"]:checked');
    var td = form.querySelector('input[name="tod"]:checked');
    return {
      service: sv ? SERVICES.find(function (s) { return s.id === sv.value; }) : null,
      salon: sl ? sl.value : null,
      day: parseDay($("day").value),
      tod: td ? td.value : null,
      name: $("name").value.trim()
    };
  }

  function message(st) {
    var parts = ["Hi Ziba! I'd like to book " + st.service.name + " ($" + priceFor(st) + ")"];
    if (st.salon) parts[0] += " at your " + SALON_SHORT[st.salon] + " salon";
    var when = whenText(st);
    if (when) parts[0] += ", " + when;
    parts[0] += ".";
    if (st.name) parts.push("Thank you, " + st.name);
    return parts.join(" ");
  }
  function priceFor(st) { return st.service.deal && isDealDay(st.day, st.service.deal) ? st.service.deal.price : st.service.price; }
  function whenText(st) {
    var bits = [];
    if (st.day) bits.push("on " + fmtDay.format(st.day));
    if (st.tod) bits.push("in the " + st.tod);
    return bits.join(" ");
  }
  function smsHref(body) { return "sms:" + PHONE + "?&body=" + encodeURIComponent(body); }

  var online = ONLINE_BOOKING.url || ONLINE_BOOKING.bySalon.campus || ONLINE_BOOKING.bySalon.thornebrook;
  if (online) {
    $("actions-online").hidden = false; $("actions-default").hidden = true;
    if (ONLINE_BOOKING.name) $("go-online").textContent = "Book online with " + ONLINE_BOOKING.name;
    // Online booking collects day, time and name itself.
    $("step-when").hidden = true; $("step-name").hidden = true;
  }

  function render() {
    var st = state();
    $("sum-service").textContent = st.service ? st.service.name : "Not chosen yet";
    $("sum-price").textContent = st.service ? "$" + priceFor(st) + " · " + st.service.mins + " min" : "–";
    $("sum-salon").textContent = st.salon ? SALONS[st.salon] : "Not chosen yet";
    var w = whenText(st); $("sum-when").textContent = w ? w.charAt(0).toUpperCase() + w.slice(1) : "Any time";

    var deal = $("sum-deal");
    if (st.service && st.service.deal && isDealDay(st.day, st.service.deal)) {
      deal.hidden = false; deal.textContent = "Deal day: $" + st.service.deal.price + " instead of $" + st.service.price + ".";
    } else if (st.service && st.service.deal) {
      var nd = nthWeekday(today.getFullYear(), today.getMonth(), st.service.deal.nth, st.service.deal.dow);
      if (nd < today) nd = nthWeekday(today.getFullYear(), today.getMonth() + 1, st.service.deal.nth, st.service.deal.dow);
      deal.hidden = false; deal.textContent = "Save $" + (st.service.price - st.service.deal.price) + " on " + fmtDay.format(nd) + ", the next deal day.";
    } else { deal.hidden = true; }

    var closed = !!(st.day && CLOSED.indexOf(st.day.getDay()) !== -1);
    $("err-day").hidden = !closed; $("day-hint").hidden = closed;

    if (online) {
      var url = (st.salon && ONLINE_BOOKING.bySalon[st.salon]) || ONLINE_BOOKING.url || online;
      $("go-online").href = url;
      return;
    }
    $("go-calendar").href = (st.service && st.service.cal) || DATA.defaultCalendar;
    if (st.service) {
      var msg = message(st);
      $("go-text").href = smsHref(msg);
      $("msg-text").textContent = msg;
      $("msg-preview").hidden = false;
    } else {
      $("go-text").href = "sms:" + PHONE;
      $("msg-preview").hidden = true;
    }
  }

  function check() {
    var st = state(), ok = true, first = null;
    function flag(id, bad, step) { $(id).hidden = !bad; $(step).classList.toggle("has-error", bad); if (bad) { ok = false; first = first || $(step); } }
    flag("err-service", !st.service, "step-service");
    flag("err-salon", !st.salon, "step-salon");
    if (!online) {
      flag("err-name", !st.name, "step-name");
      if (st.day && CLOSED.indexOf(st.day.getDay()) !== -1) { ok = false; first = first || $("step-when"); }
    }
    if (first) {
      first.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      var f = first.querySelector("input"); if (f) f.focus({ preventScroll: true });
    }
    return ok;
  }

  // Clear an error as soon as its field is fixed.
  function clearFixed() {
    var st = state();
    [["err-service", "step-service", !!st.service], ["err-salon", "step-salon", !!st.salon], ["err-name", "step-name", !!st.name]].forEach(function (r) {
      if (r[2]) { $(r[0]).hidden = true; $(r[1]).classList.remove("has-error"); }
    });
  }
  form.addEventListener("change", function () { clearFixed(); render(); });
  form.addEventListener("input", function (e) { if (e.target.id === "name") { clearFixed(); render(); } });
  ["go-text", "go-online"].forEach(function (id) {
    $(id).addEventListener("click", function (e) { if (!check()) e.preventDefault(); });
  });
  $("go-calendar").addEventListener("click", function (e) {
    var st = state(); if (!st.service) { e.preventDefault(); check(); }
  });

  $("copy-msg").addEventListener("click", function () {
    var t = $("msg-text").textContent;
    var done = function () { $("copy-status").textContent = "Copied"; setTimeout(function () { $("copy-status").textContent = ""; }, 2500); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () { $("copy-status").textContent = "Couldn't copy. Select the text and copy it."; });
  });

  render();
})();
