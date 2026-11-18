"use strict";

/**
 * Sofia: Jailer Protocol - Widescreen Netflix Desktop Controller
 * Featuring Enrico Papi 5x Penance Engine, full language sync, and real-time live metrics.
 */

document.addEventListener("DOMContentLoaded", () => {
  let currentConfig = {};
  let selectedDomains = new Set(["youtube.com"]);
  let papiViews = 0;
  let papiTimer = null;
  let papiSecondsInView = 0;
  const PAPI_VIDEO_ID = "jlE3JQmH_G4";
  const PAPI_VIDEO_DURATION = 16; // 16 seconds per view
  const PAPI_TOTAL_REQUIRED = 5;

  // Translations loaded from i18n.js (SOFIA_I18N.options)

  function formatToLocalISO(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function sha256(str) {
    try {
      if (crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return "fb_" + Math.abs(hash).toString(16);
  }

  function showBanner(msg, type = "error", bannerId = "banner") {
    const banner = document.getElementById(bannerId);
    if (!banner) return;
    banner.className = `banner ${type}`;
    banner.innerText = msg;
    banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideBanner(bannerId = "banner") {
    const banner = document.getElementById(bannerId);
    if (banner) banner.className = "banner";
  }

  function sanitizeDomain(raw) {
    return raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }

  function renderDomainTags() {
    const container = document.getElementById("domainsTagsContainer");
    if (!container) return;
    container.innerHTML = "";

    selectedDomains.forEach((domain) => {
      const tag = document.createElement("div");
      tag.className = "domain-tag";
      tag.innerHTML = `
        <span>${domain}</span>
        <span class="domain-tag-remove" data-domain="${domain}">&times;</span>
      `;
      container.appendChild(tag);
    });

    document.querySelectorAll(".preset-chip").forEach((chip) => {
      const d = chip.getAttribute("data-domain");
      if (selectedDomains.has(d)) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });

    container.querySelectorAll(".domain-tag-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const toRemove = e.target.getAttribute("data-domain");
        selectedDomains.delete(toRemove);
        renderDomainTags();
      });
    });
  }

  function initDateTimeDefaults() {
    const startInput = document.getElementById("startDateTime");
    const endInput = document.getElementById("endDateTime");

    const now = new Date();
    if (startInput && !startInput.value) {
      startInput.value = formatToLocalISO(now);
    }

    if (endInput && !endInput.value) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(23, 59, 0, 0);
      endInput.value = formatToLocalISO(tomorrow);
    }
  }

  /**
   * Applies translations to ALL DOM elements
   */
  function applyLanguage(lang) {
    const t = SOFIA_I18N.options[lang] || SOFIA_I18N.options.it;
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.innerText = text;
    };
    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    // Header Language Pills Highlight
    const btnIt = document.getElementById("btnLangIt");
    const btnEn = document.getElementById("btnLangEn");
    if (btnIt && btnEn) {
      if (lang === "it") {
        btnIt.classList.add("active");
        btnEn.classList.remove("active");
      } else {
        btnEn.classList.add("active");
        btnIt.classList.remove("active");
      }
    }

    // Header
    const isInfinite = !!currentConfig.isInfinite;
    const now = Date.now();
    const isTimeActive = isInfinite || (currentConfig.endDate && now <= currentConfig.endDate);
    const isActive = !!(currentConfig.active && isTimeActive);

    const headerBadge = document.getElementById("headerStatusBadge");
    if (headerBadge) {
      headerBadge.className = `header-badge ${isActive ? "active" : "inactive"}`;
      headerBadge.innerText = isActive ? t.headerActive : t.headerInactive;
    }

    // View 1 (Active)
    set("lblCardStatus", t.lblCardStatus);
    set("lockedBadge", t.lockedBadge);
    set("lockedModeBadge", isInfinite ? t.modeInfinite : t.modeFixed);
    set("lblCardCountdown", t.lblCardCountdown);
    set("lblMetaStart", t.lblMetaStart);
    set("lblMetaEnd", t.lblMetaEnd);
    set("lblCardViolations", t.lblCardViolations);
    set("lblCardBypass", t.lblCardBypass);
    set("lblCardDomains", t.lblCardDomains);
    set("lblCardDomainsHint", t.lblCardDomainsHint);
    setHtml("lockedCalloutText", t.lockedCalloutText);
    set("btnOpenCreatorTerminal", t.btnOpenCreatorTerminal);

    // View 2 (Setup)
    set("secHeader1", t.secHeader1);
    set("lblPresets", t.lblPresets);
    set("lblCustomDomain", t.lblCustomDomain);
    set("btnAddDomain", t.btnAddDomain);
    set("secHeader2", t.secHeader2);
    set("lblPin", t.lblPin);
    set("secHeader3", t.secHeader3);
    set("lblTitleBypass", t.lblTitleBypass);
    set("lblDescBypass", t.lblDescBypass);
    set("lblWhitelist", t.lblWhitelist);
    set("lblTitleInfinite", t.lblTitleInfinite);
    set("lblDescInfinite", t.lblDescInfinite);
    set("lblStart", t.lblStart);
    set("lblEnd", t.lblEnd);
    set("btnActivate", t.btnActivate);

    // Modals
    set("modalTitle", t.modalTitle);
    set("modalDesc", t.modalDesc);
    set("btnModalVerify", t.btnModalVerify);
    set("btnModalClose", t.btnModalClose);

    // Enrico Papi Penance Modal
    set("papiModalTitle", t.papiTitle);
    setHtml("papiModalDesc", t.papiDesc);
    set("papiCounterLabel", (t.papiCounter || "VISIONE: {current} / {total}").replace("{current}", papiViews + 1).replace("{total}", PAPI_TOTAL_REQUIRED));
    set("btnCancelPapi", t.papiCancelBtn);
    if (btnFinalDeactivate && btnFinalDeactivate.disabled) {
      btnFinalDeactivate.innerText = t.papiLockedBtn;
    } else if (btnFinalDeactivate) {
      btnFinalDeactivate.innerText = t.papiUnlockedBtn;
    }

    // Placeholders
    const customInput = document.getElementById("customDomainInput");
    if (customInput && t.phCustomDomain) customInput.placeholder = t.phCustomDomain;
    const wlInput = document.getElementById("whitelist");
    if (wlInput && t.phWhitelist) wlInput.placeholder = t.phWhitelist;
  }

  function renderView() {
    hideBanner();
    const now = Date.now();
    const isInfinite = !!currentConfig.isInfinite;
    const isTimeActive = isInfinite || (currentConfig.endDate && now <= currentConfig.endDate);
    const isActive = !!(currentConfig.active && isTimeActive);

    const viewLocked = document.getElementById("viewActiveLocked");
    const viewSetup = document.getElementById("viewSetup");

    const lang = currentConfig.language || "it";
    applyLanguage(lang);

    const t = SOFIA_I18N.options[lang] || SOFIA_I18N.options.it;

    if (isActive) {
      viewSetup.classList.add("view-hidden");
      viewLocked.classList.remove("view-hidden");

      document.getElementById("infoViolations").innerText = currentConfig.violations || 0;
      document.getElementById("infoBypassMode").innerText = currentConfig.allowBypass !== false ? t.bypassAllowed : t.bypassDisabled;

      if (currentConfig.startDate) {
        document.getElementById("infoStartTime").innerText = new Date(currentConfig.startDate).toLocaleString();
      }

      if (isInfinite) {
        document.getElementById("infoCountdown").innerText = t.infiniteVal;
        document.getElementById("infoEndTime").innerText = t.modeInfinite;
      } else if (currentConfig.endDate) {
        document.getElementById("infoEndTime").innerText = new Date(currentConfig.endDate).toLocaleString();
        startActiveCountdown();
      }

      // Render Whitelist Chips
      const wlContainer = document.getElementById("infoWhitelistContainer");
      if (wlContainer) {
        if (Array.isArray(currentConfig.whitelist) && currentConfig.whitelist.length > 0) {
          wlContainer.innerHTML = "<strong>Whitelist:</strong> " + currentConfig.whitelist.join(", ");
        } else {
          wlContainer.innerHTML = `<em>${t.noWhitelist || "Nessuna parola chiave definita"}</em>`;
        }
      }

      // Render Domains
      const blockedContainer = document.getElementById("infoBlockedDomains");
      if (blockedContainer) {
        blockedContainer.innerHTML = "";
        const domains = Array.isArray(currentConfig.blockedDomains) ? currentConfig.blockedDomains : ["youtube.com"];
        domains.forEach(dom => {
          const span = document.createElement("span");
          span.className = "active-domain-chip";
          span.innerText = dom;
          blockedContainer.appendChild(span);
        });
      }
    } else {
      viewLocked.classList.add("view-hidden");
      viewSetup.classList.remove("view-hidden");
      initDateTimeDefaults();

      const toggleInfinite = document.getElementById("toggleInfinite");
      const toggleBypass = document.getElementById("toggleBypass");
      const endDateGroup = document.getElementById("endDateGroup");
      const whitelistGroup = document.getElementById("whitelistGroup");

      if (toggleInfinite) {
        toggleInfinite.checked = !!currentConfig.isInfinite;
        if (endDateGroup) {
          endDateGroup.style.display = toggleInfinite.checked ? "none" : "block";
        }
      }

      if (toggleBypass) {
        toggleBypass.checked = currentConfig.allowBypass !== false;
        if (whitelistGroup) {
          whitelistGroup.style.display = toggleBypass.checked ? "block" : "none";
        }
      }

      if (Array.isArray(currentConfig.blockedDomains) && currentConfig.blockedDomains.length > 0) {
        selectedDomains = new Set(currentConfig.blockedDomains);
      }
      renderDomainTags();

      if (Array.isArray(currentConfig.whitelist)) {
        document.getElementById("whitelist").value = currentConfig.whitelist.join(", ");
      }
    }
  }

  let activeCountdownTimer = null;
  function startActiveCountdown() {
    if (activeCountdownTimer) clearInterval(activeCountdownTimer);

    const update = () => {
      if (!currentConfig || !currentConfig.endDate) return;
      const diff = currentConfig.endDate - Date.now();
      const el = document.getElementById("infoCountdown");
      if (!el) {
        clearInterval(activeCountdownTimer);
        return;
      }

      if (diff <= 0) {
        clearInterval(activeCountdownTimer);
        el.innerText = "00:00:00:00";
        renderView();
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.innerText = `${d.toString().padStart(2, "0")}:${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    update();
    activeCountdownTimer = setInterval(update, 1000);
  }

  // --- LANGUAGE SWITCHER PILLS ---
  const btnLangIt = document.getElementById("btnLangIt");
  const btnLangEn = document.getElementById("btnLangEn");

  if (btnLangIt) {
    btnLangIt.addEventListener("click", () => {
      currentConfig.language = "it";
      chrome.storage.local.set({ language: "it" });
      renderView();
    });
  }

  if (btnLangEn) {
    btnLangEn.addEventListener("click", () => {
      currentConfig.language = "en";
      chrome.storage.local.set({ language: "en" });
      renderView();
    });
  }

  // Preset Chips
  document.querySelectorAll(".preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const domain = chip.getAttribute("data-domain");
      if (selectedDomains.has(domain)) {
        selectedDomains.delete(domain);
      } else {
        selectedDomains.add(domain);
      }
      renderDomainTags();
    });
  });

  // Custom Domains
  const customInput = document.getElementById("customDomainInput");
  const addBtn = document.getElementById("btnAddDomain");

  const addCustomDomains = () => {
    const raw = customInput.value;
    if (!raw) return;

    const parts = raw.split(",");
    parts.forEach(p => {
      const clean = sanitizeDomain(p);
      if (clean) selectedDomains.add(clean);
    });

    customInput.value = "";
    renderDomainTags();
  };

  if (addBtn) addBtn.addEventListener("click", addCustomDomains);
  if (customInput) {
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCustomDomains();
      }
    });
  }

  // Toggles
  const toggleInfinite = document.getElementById("toggleInfinite");
  const endDateGroup = document.getElementById("endDateGroup");
  if (toggleInfinite && endDateGroup) {
    toggleInfinite.addEventListener("change", (e) => {
      endDateGroup.style.display = e.target.checked ? "none" : "block";
    });
  }

  const toggleBypass = document.getElementById("toggleBypass");
  const whitelistGroup = document.getElementById("whitelistGroup");
  if (toggleBypass && whitelistGroup) {
    toggleBypass.addEventListener("change", (e) => {
      whitelistGroup.style.display = e.target.checked ? "block" : "none";
    });
  }

  // Activate Protocol
  const btnActivate = document.getElementById("btnActivate");
  if (btnActivate) {
    btnActivate.addEventListener("click", async () => {
      const lang = currentConfig.language || "it";
      const t = SOFIA_I18N.options[lang] || SOFIA_I18N.options.it;

      const pin = document.getElementById("pin").value.trim();
      if (!pin || pin.length !== 4 || isNaN(pin)) {
        showBanner(t.errEmptyPin, "error");
        return;
      }

      if (selectedDomains.size === 0) {
        showBanner(t.errNoDomains, "error");
        return;
      }

      const isInfinite = document.getElementById("toggleInfinite").checked;
      const allowBypass = document.getElementById("toggleBypass").checked;
      const startVal = document.getElementById("startDateTime").value;
      const endVal = document.getElementById("endDateTime").value;

      const startTime = startVal ? new Date(startVal).getTime() : Date.now();
      let endTime = null;

      if (!isInfinite) {
        if (!endVal) {
          showBanner(t.errDates, "error");
          return;
        }
        endTime = new Date(endVal).getTime();
        if (endTime <= startTime) {
          showBanner(t.errDates, "error");
          return;
        }
      }

      const whitelistStr = document.getElementById("whitelist").value;
      const cleanWhitelist = whitelistStr
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      const pinHash = await sha256(pin);

      const newConfig = {
        active: true,
        pinHash,
        language: lang,
        blockedDomains: Array.from(selectedDomains),
        allowBypass,
        whitelist: cleanWhitelist,
        isInfinite,
        startDate: startTime,
        endDate: endTime,
        violations: 0
      };

      chrome.storage.local.set(newConfig, () => {
        chrome.storage.local.remove("userPin");
        currentConfig = newConfig;
        renderView();
        showBanner(t.msgActiveSuccess, "success");
      });
    });
  }

  // --- CREATOR OVERRULE PIN MODAL ---
  const creatorTrigger = document.getElementById("creatorTrigger");
  const btnOpenCreator = document.getElementById("btnOpenCreatorTerminal");
  const creatorModal = document.getElementById("creatorModal");
  const modalPin = document.getElementById("modalPin");
  const btnModalVerify = document.getElementById("btnModalVerify");
  const btnModalClose = document.getElementById("btnModalClose");

  const openCreatorPrompt = () => {
    creatorModal.classList.remove("view-hidden");
    modalPin.value = "";
    hideBanner("modalBanner");
    modalPin.focus();
  };

  if (creatorTrigger) creatorTrigger.addEventListener("click", openCreatorPrompt);
  if (btnOpenCreator) btnOpenCreator.addEventListener("click", openCreatorPrompt);

  if (btnModalClose) {
    btnModalClose.addEventListener("click", () => {
      creatorModal.classList.add("view-hidden");
    });
  }

  const verifyCreatorPin = async () => {
    const lang = currentConfig.language || "it";
    const t = SOFIA_I18N.options[lang] || SOFIA_I18N.options.it;
    const entered = modalPin.value.trim();

    let valid = false;
    if (currentConfig.pinHash) {
      const h = await sha256(entered);
      valid = (h === currentConfig.pinHash);
    } else if (currentConfig.userPin) {
      valid = (entered === String(currentConfig.userPin));
    }

    if (valid) {
      creatorModal.classList.add("view-hidden");
      startEnricoPapiPenance();
    } else {
      showBanner(t.errWrongPin, "error", "modalBanner");
    }
  };

  if (btnModalVerify) btnModalVerify.addEventListener("click", verifyCreatorPin);
  if (modalPin) {
    modalPin.addEventListener("keydown", (e) => {
      if (e.key === "Enter") verifyCreatorPin();
    });
  }

  // ==========================================
  // ENRICO PAPI 5X PENANCE ENGINE
  // ==========================================
  const papiModal = document.getElementById("papiModal");
  const papiIframe = document.getElementById("papiIframe");
  const papiProgressFill = document.getElementById("papiProgressFill");
  const papiCounterLabel = document.getElementById("papiCounterLabel");
  const papiTimerLabel = document.getElementById("papiTimerLabel");
  const btnFinalDeactivate = document.getElementById("btnFinalDeactivate");
  const btnCancelPapi = document.getElementById("btnCancelPapi");

  function startEnricoPapiPenance() {
    papiViews = 0;
    papiSecondsInView = 0;
    papiModal.classList.remove("view-hidden");

    const lang = currentConfig.language || "it";
    const t = SOFIA_I18N.options[lang] || SOFIA_I18N.options.it;

    btnFinalDeactivate.disabled = true;
    btnFinalDeactivate.style.background = "#333";
    btnFinalDeactivate.style.cursor = "not-allowed";
    btnFinalDeactivate.style.opacity = "0.6";
    btnFinalDeactivate.innerText = t.papiLockedBtn;

    papiIframe.src = `https://www.youtube.com/embed/${PAPI_VIDEO_ID}?autoplay=1&controls=0&disablekb=1&rel=0&loop=1&playlist=${PAPI_VIDEO_ID}&playsinline=1`;
    playPapiIteration();
  }

  function playPapiIteration() {
    papiSecondsInView = 0;
    const lang = currentConfig.language || "it";
    const t = SOFIA_I18N.options[lang] || SOFIA_I18N.options.it;

    papiCounterLabel.innerText = (t.papiCounter || "VISIONE: {current} / {total}").replace("{current}", papiViews + 1).replace("{total}", PAPI_TOTAL_REQUIRED);
    updatePapiProgress();

    if (papiTimer) clearInterval(papiTimer);
    papiTimer = setInterval(() => {
      papiSecondsInView++;
      updatePapiProgress();

      if (papiSecondsInView >= PAPI_VIDEO_DURATION) {
        clearInterval(papiTimer);
        papiTimer = null;
        papiViews++;

        if (papiViews < PAPI_TOTAL_REQUIRED) {
          playPapiIteration();
        } else {
          // 5 Full Views Completed!
          unlockDeactivation();
        }
      }
    }, 1000);
  }

  function updatePapiProgress() {
    const totalSeconds = papiViews * PAPI_VIDEO_DURATION + Math.min(papiSecondsInView, PAPI_VIDEO_DURATION);
    const overallMax = PAPI_TOTAL_REQUIRED * PAPI_VIDEO_DURATION;
    const pct = Math.min(100, Math.round((totalSeconds / overallMax) * 100));

    papiProgressFill.style.width = `${pct}%`;
    const curSec = Math.min(papiSecondsInView, PAPI_VIDEO_DURATION);
    papiTimerLabel.innerText = `00:${curSec.toString().padStart(2, "0")} / 00:${PAPI_VIDEO_DURATION}`;
  }

  function unlockDeactivation() {
    const lang = currentConfig.language || "it";
    const t = SOFIA_I18N.options[lang] || SOFIA_I18N.options.it;

    papiCounterLabel.innerText = t.papiDone || "PENITENZA COMPLETATA! (5 / 5)";
    papiProgressFill.style.width = "100%";
    papiProgressFill.style.background = "#10b981";

    btnFinalDeactivate.disabled = false;
    btnFinalDeactivate.style.background = "#E50914";
    btnFinalDeactivate.style.cursor = "pointer";
    btnFinalDeactivate.style.opacity = "1";
    btnFinalDeactivate.style.boxShadow = "0 0 25px rgba(229, 9, 20, 0.7)";
    btnFinalDeactivate.innerText = t.papiUnlockedBtn;
  }

  if (btnFinalDeactivate) {
    btnFinalDeactivate.addEventListener("click", () => {
      chrome.storage.local.set({ active: false }, () => {
        if (papiTimer) clearInterval(papiTimer);
        papiIframe.src = "";
        papiModal.classList.add("view-hidden");
        currentConfig.active = false;
        renderView();
        const lang = currentConfig.language || "it";
        const t = SOFIA_I18N.options[lang] || SOFIA_I18N.options.it;
        showBanner(t.msgDeactivated, "success");
      });
    });
  }

  if (btnCancelPapi) {
    btnCancelPapi.addEventListener("click", () => {
      if (papiTimer) clearInterval(papiTimer);
      papiIframe.src = "";
      papiModal.classList.add("view-hidden");
    });
  }

  // Load from storage
  chrome.storage.local.get(null, (res) => {
    currentConfig = res || {};
    renderView();
  });

  // Real-time synchronization for live violation counts across tabs
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      for (const [key, change] of Object.entries(changes)) {
        currentConfig[key] = change.newValue;
      }
      renderView();
    }
  });
});
