/* Google Analytics is never requested until the visitor opts in. */
(function () {
  "use strict";

  var measurementId = "G-9P9KKLZ5BN";
  var storageKey = "louppe.analytics-consent.v1";
  var choiceLifetime = 180 * 24 * 60 * 60 * 1000;
  var banner = document.getElementById("analytics-consent");
  var settings = document.querySelector("[data-analytics-settings]");
  var choices = document.querySelectorAll("[data-analytics-choice]");
  var analyticsLoaded = false;
  var visitOnlyChoice = null;
  var choiceExpiresAt = null;
  var expiryTimer = null;
  window["ga-disable-" + measurementId] = true;
  if (!banner || !settings || choices.length !== 2) return;

  function savedChoice() {
    choiceExpiresAt = null;
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && (saved.value === "accepted" || saved.value === "rejected") &&
          Number.isFinite(saved.at) && Date.now() - saved.at < choiceLifetime &&
          saved.at <= Date.now()) {
        choiceExpiresAt = saved.at + choiceLifetime;
        return saved.value;
      }
    } catch (_) { /* A blocked storage API leaves consent undecided. */ }
    return null;
  }

  function remember(value) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ value: value, at: Date.now() }));
      visitOnlyChoice = null;
    } catch (_) {
      visitOnlyChoice = value;
      // A quota failure can leave an older acceptance readable. Remove it
      // when withdrawing so a later page cannot revive that old choice.
      if (value === "rejected") {
        try { localStorage.removeItem(storageKey); } catch (_) { /* Keep this visit disabled. */ }
      }
    }
  }

  function removeAnalyticsCookies() {
    document.cookie.split(";").forEach(function (part) {
      var name = part.split("=")[0].trim();
      if (name !== "_ga" && name.indexOf("_ga_") !== 0) return;
      document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax";
      document.cookie = name + "=; Max-Age=0; Path=/; Domain=.louppe.eu; SameSite=Lax";
    });
  }

  function loadAnalytics() {
    // Keep local previews and copied deployments out of the production property.
    if (location.hostname !== "louppe.eu" || location.protocol !== "https:") return;
    if (analyticsLoaded) {
      if (window["ga-disable-" + measurementId]) {
        window["ga-disable-" + measurementId] = false;
        window.gtag("consent", "update", { analytics_storage: "granted" });
      }
      return;
    }
    analyticsLoaded = true;
    window["ga-disable-" + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 30 * 24 * 60 * 60,
      cookie_update: false
    });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
    document.head.appendChild(script);
  }

  function reconcileChoice() {
    if (expiryTimer !== null) window.clearTimeout(expiryTimer);
    expiryTimer = null;
    var choice = visitOnlyChoice;
    if (choice) choiceExpiresAt = null;
    else choice = savedChoice();
    if (choice === "accepted") {
      loadAnalytics();
      if (choiceExpiresAt !== null) {
        expiryTimer = window.setTimeout(reconcileChoice,
          Math.min(Math.max(1, choiceExpiresAt - Date.now()), 2147483647));
      }
    } else {
      var wasEnabled = analyticsLoaded && !window["ga-disable-" + measurementId];
      window["ga-disable-" + measurementId] = true;
      removeAnalyticsCookies();
      if (wasEnabled) {
        window.gtag("consent", "update", { analytics_storage: "denied" });
        // Reload only a persisted withdrawal. Otherwise the visit-only
        // rejection would be lost and a stale stored acceptance could return.
        if (visitOnlyChoice === null) window.location.reload();
      }
    }
    return choice;
  }

  function choose(value) {
    remember(value);
    banner.hidden = true;
    settings.focus();
    reconcileChoice();
  }

  window.addEventListener("storage", function (event) {
    if (event.key !== storageKey && event.key !== null) return;
    // A local refusal that storage could not persist outranks a delayed
    // acceptance event from another tab until this visitor chooses again.
    if (visitOnlyChoice !== "rejected") visitOnlyChoice = null;
    banner.hidden = reconcileChoice() !== null;
  });
  window.addEventListener("focus", reconcileChoice);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "hidden") reconcileChoice();
  });

  choices.forEach(function (button) {
    button.addEventListener("click", function () {
      choose(button.getAttribute("data-analytics-choice"));
    });
  });
  settings.addEventListener("click", function () {
    banner.hidden = false;
    choices[0].focus();
  });

  if (reconcileChoice() === null) banner.hidden = false;

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || reconcileChoice() !== "accepted" || !analyticsLoaded ||
        window["ga-disable-" + measurementId] ||
        location.hostname !== "louppe.eu" || location.protocol !== "https:") return;
    var url = new URL(link.href, location.href);
    if (url.protocol !== "https:") return;
    var method;
    if (url.hostname === "apps.apple.com" &&
        /^\/(?:[a-z]{2}\/)?app\/(?:[^/]+\/)?id6820131477\/?$/.test(url.pathname)) {
      method = "app_store";
    } else if (url.hostname === "github.com") {
      if (url.pathname === "/murlexander/louppe-media-culler/releases/latest/download/Louppe.zip") {
        method = "github";
      } else if (url.pathname === "/murlexander/louppe-media-culler/blob/main/Docs/HOMEBREW.md") {
        method = "homebrew";
      }
    }
    if (!method) return;
    // A route click is intent, not a confirmed download or installation.
    window.gtag("event", "louppe_download", { send_to: measurementId, download_method: method });
  });
})();
