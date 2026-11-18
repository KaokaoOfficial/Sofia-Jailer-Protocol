"use strict";

/**
 * Sofia: Jailer Protocol - Netflix Cinematic Content Guard
 * Features Shadow DOM event isolation (fixes Netflix input/click freeze),
 * 15-minute grace period on bypass (fixes re-lock on refresh),
 * atomic multi-site violation tracking, and Rickroll penalty Easter Egg.
 */

(() => {
  let config = null;
  let isUnlocked = false;
  let domainGraceExpiresAt = 0;
  let countdownIntervalId = null;
  let domObserver = null;
  let shadowRoot = null;
  let rootHost = null;

  const RICKROLL_VIDEO_ID = "dQw4w9WgXcQ";
  const RICKROLL_URL = `https://www.youtube.com/watch?v=${RICKROLL_VIDEO_ID}&autoplay=1`;
  const PAPI_VIDEO_ID = "jlE3JQmH_G4";
  const PAPI_VIDEO_DURATION = 16;
  const PAPI_TOTAL_REQUIRED = 5;

  // Translations loaded from i18n.js (SOFIA_I18N.wall)

  function getCleanHostname() {
    return window.location.hostname.toLowerCase().replace(/^www\./, "");
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

  async function verifyPin(entered) {
    if (!entered || !config) return false;
    const clean = String(entered).trim();
    if (config.pinHash) {
      const hashed = await sha256(clean);
      if (hashed === config.pinHash) return true;
    }
    if (config.userPin && String(config.userPin).trim() === clean) {
      return true;
    }
    return false;
  }

  function isCurrentDomainBlocked() {
    if (!config || !config.active) return false;

    // Rickroll & Enrico Papi penalty exemptions
    if (window.location.href.includes(RICKROLL_VIDEO_ID) || window.location.href.includes(PAPI_VIDEO_ID)) {
      return false;
    }

    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes("studio.youtube.com")) return false;

    const list = Array.isArray(config.blockedDomains) && config.blockedDomains.length > 0
      ? config.blockedDomains
      : ["youtube.com"];

    return list.some((domain) => {
      const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!clean) return false;
      return hostname === clean || hostname.endsWith("." + clean);
    });
  }

  function shouldBlock() {
    if (!config || !config.active) return false;
    if (isUnlocked) return false;

    // Check 15-minute temporary grace period (fixes re-lock on refresh!)
    if (Date.now() < domainGraceExpiresAt) {
      isUnlocked = true;
      return false;
    }

    const now = Date.now();
    if (config.startDate && now < config.startDate) return false;
    if (!config.isInfinite && config.endDate && now > config.endDate) return false;

    return isCurrentDomainBlocked();
  }

  function pauseMedia() {
    if (window.location.href.includes(RICKROLL_VIDEO_ID) || window.location.href.includes(PAPI_VIDEO_ID)) return;

    try {
      const media = document.querySelectorAll("video, audio");
      media.forEach((el) => {
        try {
          if (!el.paused) el.pause();
        } catch (e) {}
      });
    } catch (e) {}
  }

  function showBanner(msg, type = "error") {
    if (!shadowRoot) return;
    const banner = shadowRoot.getElementById("sofiaBanner");
    if (!banner) return;
    banner.className = `sofia-banner sofia-banner-${type}`;
    banner.innerText = msg;
  }

  /**
   * Atomic multi-tab violation recording with instant direct storage persistence
   */
  function registerViolation(customWarning) {
    const lang = config.language || "it";
    const t = SOFIA_I18N.wall[lang] || SOFIA_I18N.wall.it;

    chrome.storage.local.get("violations", (storeData) => {
      const current = typeof storeData.violations === "number" ? storeData.violations : 0;
      const updated = current + 1;
      const shouldRickroll = updated >= 3;

      chrome.storage.local.set({ violations: updated }, () => {
        if (!config) config = {};
        config.violations = updated;

        const violEl = shadowRoot ? shadowRoot.getElementById("sofiaWallViolations") : null;
        if (violEl) {
          violEl.innerText = updated;
        }

        if (shouldRickroll) {
          showBanner(t.warnPenalty, "error");
          setTimeout(() => {
            window.location.href = RICKROLL_URL;
          }, 1200);
        } else {
          showBanner(customWarning || t.warnViolation, "warning");
        }
      });
    });
  }

  /**
   * Injects Sofia into a clean, isolated Shadow DOM
   * (Completely protects against Netflix event interception and CSS conflicts!)
   */
  function showWall() {
    if (shadowRoot && shadowRoot.getElementById("sofia-muro")) return;
    if (window.location.href.includes(RICKROLL_VIDEO_ID) || window.location.href.includes(PAPI_VIDEO_ID)) return;

    pauseMedia();

    // Create Root Host
    if (!rootHost) {
      rootHost = document.createElement("div");
      rootHost.id = "sofia-root-host";
      rootHost.style.cssText = "all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; pointer-events: auto !important;";
      document.documentElement.appendChild(rootHost);
      shadowRoot = rootHost.attachShadow({ mode: "open" });
    }

    const lang = config.language || "it";
    const t = SOFIA_I18N.wall[lang] || SOFIA_I18N.wall.it;
    const isInfinite = !!config.isInfinite;
    const allowBypass = config.allowBypass !== false;
    const cssUrl = chrome.runtime.getURL("muro.css");

    const targetDomain = getCleanHostname();

    shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${cssUrl}">
      <div id="sofia-muro">
        <div class="sofia-terminal">
          <!-- TOP BAR: Brand, Active Badges & Widescreen Language Switcher -->
          <div class="sofia-terminal-header">
            <div class="sofia-brand-badge">
              <div class="sofia-mini-s">
                <svg viewBox="0 0 100 100" fill="none" class="sofia-mini-logo">
                  <path d="M68 19 H40 C28 19 24 26 24 35 C24 44 33 49 50 50 C68 51 76 57 76 66 C76 75 71 81 58 81 H30" 
                        stroke="#E50914" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="sofia-brand-text">SOFIA <span>JAILER</span></div>
              <span id="sofiaBadgeActive" class="sofia-badge-pill active">${t.badgeActive}</span>
              <span id="sofiaBadgeMode" class="sofia-badge-pill">${isInfinite ? t.badgeInfinite : t.badgeFixed}</span>
              <span class="sofia-badge-pill" id="sofiaBadgeViolations"><span id="sofiaBadgeViolationsLbl">${t.badgeViolations || "VIOLAZIONI"}</span>: <strong id="sofiaWallViolations" style="color:#FF383F;">${config.violations || 0}</strong></span>
            </div>

            <!-- Styled Language Switcher Pills identical to Control Center -->
            <div class="sofia-lang-switcher">
              <button type="button" class="sofia-lang-pill ${lang === 'it' ? 'active' : ''}" id="sofiaLangIt">ITALIANO</button>
              <button type="button" class="sofia-lang-pill ${lang === 'en' ? 'active' : ''}" id="sofiaLangEn">ENGLISH</button>
            </div>
          </div>

          <!-- MAIN 2-COLUMN WIDESCREEN BODY -->
          <div class="sofia-terminal-body">
            <!-- LEFT COLUMN: Status, Glow Ribbon "S" & Countdown -->
            <div class="sofia-col-hero">
              <div class="sofia-s-logo-wrap">
                <div class="sofia-s-glow-backdrop"></div>
                <svg class="sofia-s-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <!-- Fluid duotone gradient: bright neon red bleeding smoothly into deep crimson ruby -->
                    <linearGradient id="nfDuotoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#FF383F"/>
                      <stop offset="45%" stop-color="#E50914"/>
                      <stop offset="100%" stop-color="#7A0006"/>
                    </linearGradient>
                    <filter id="nfGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
                      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#E50914" flood-opacity="0.8"/>
                      <feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#E50914" flood-opacity="0.45"/>
                    </filter>
                  </defs>
                  <!-- Pure continuous S curve, mathematically centered without any cuts -->
                  <path d="M68 19 H40 C28 19 24 26 24 35 C24 44 33 49 50 50 C68 51 76 57 76 66 C76 75 71 81 58 81 H30" 
                        stroke="url(#nfDuotoneGrad)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" filter="url(#nfGlowFilter)"/>
                </svg>
              </div>

              <h1 class="sofia-title">${t.title}</h1>
              <p class="sofia-desc">${t.desc}</p>

              <div class="sofia-target-domain-box">
                <span class="sofia-target-label" id="sofiaTargetLabel">${t.badgeTarget || 'DOMINIO BLOCCATO'}</span>
                <span class="sofia-target-value">${targetDomain}</span>
              </div>

              <div class="sofia-countdown-container">
                <div class="sofia-countdown-label">${isInfinite ? t.infiniteLabel : t.countdownLabel}</div>
                <div id="sofiaCountdown" class="sofia-countdown">${isInfinite ? t.infiniteValue : "--:--:--:--"}</div>
              </div>
            </div>

            <!-- RIGHT COLUMN: Emergency Bypass Terminal -->
            <div class="sofia-col-bypass">
              ${allowBypass ? `
                <div class="sofia-section-header">
                  <span class="sofia-sec-num">01</span>
                  <span class="sofia-sec-title" id="sofiaSecBypassTitle">${t.secBypassTitle || 'SBLOCCO STRAORDINARIO'}</span>
                </div>
                <p class="sofia-sec-sub" id="sofiaSecBypassDesc">${t.secBypassDesc || 'Inserisci PIN e motivazione per richiedere lo sblocco temporaneo.'}</p>

                <div id="sofiaBanner" class="sofia-banner"></div>

                <div class="sofia-field-group">
                  <label id="sofiaLblPin" class="sofia-label">${t.lblPin}</label>
                  <input type="password" id="bypassPin" class="sofia-input pin-box" maxlength="4" placeholder="${t.phPin}" autocomplete="off">
                </div>

                <div class="sofia-field-group">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                    <label id="sofiaLblReason" class="sofia-label" style="margin-bottom:0;">${t.lblReason}</label>
                    <span id="sofiaCharCount" class="sofia-char-count">0 / 30</span>
                  </div>
                  <textarea id="bypassReason" class="sofia-textarea" placeholder="${t.phReason}"></textarea>
                </div>

                <button id="bypassBtn" class="sofia-btn">${t.btnUnlock}</button>
              ` : `
                <div id="sofiaSealedNotice" class="sofia-sealed-box">
                  <div class="sofia-sealed-icon">🛡️</div>
                  <div class="sofia-sealed-title">${t.sealedNotice}</div>
                </div>
              `}
            </div>
          </div>

          <!-- BOTTOM CALLOUT: Sealed Parameters & Creator Terminal Trigger -->
          <div class="sofia-terminal-footer">
            <div class="sofia-callout-text" id="sofiaCalloutText">
              ${t.calloutText || '🔒 <strong>Parametri Sigillati:</strong> L\'unico modo per terminare prima è il Terminale Creatore.'}
            </div>
            <button type="button" id="secretCreatorBtn" class="sofia-btn-creator">${t.btnCreator || t.footer}</button>
          </div>
        </div>
      </div>
    `;

    const wall = shadowRoot.getElementById("sofia-muro");

    // EVENT ISOLATION: Bubble phase to prevent host page (e.g. Netflix) from intercepting events
    // (Events first trigger normally on buttons/inputs inside Sofia, then stop before escaping to the underlying website)
    const isolateEvents = (e) => {
      e.stopPropagation();
    };
    ["keydown", "keyup", "keypress", "input", "click", "mousedown", "mouseup", "pointerdown", "pointerup"].forEach((evt) => {
      wall.addEventListener(evt, isolateEvents, false);
    });

    // Language Toggle with stylish pills
    const langItBtn = shadowRoot.getElementById("sofiaLangIt");
    const langEnBtn = shadowRoot.getElementById("sofiaLangEn");

    if (langItBtn) {
      langItBtn.addEventListener("click", () => {
        applyWallLanguage("it");
      });
    }
    if (langEnBtn) {
      langEnBtn.addEventListener("click", () => {
        applyWallLanguage("en");
      });
    }

    // Dynamic Character Counter for Reason field
    const reasonInput = shadowRoot.getElementById("bypassReason");
    const charCountEl = shadowRoot.getElementById("sofiaCharCount");
    if (reasonInput && charCountEl) {
      reasonInput.addEventListener("input", () => {
        const len = (reasonInput.value || "").trim().length;
        charCountEl.innerText = `${len} / 30`;
        if (len >= 30) {
          charCountEl.classList.add("valid");
        } else {
          charCountEl.classList.remove("valid");
        }
      });
    }

    // Enter key shortcuts
    const pinInput = shadowRoot.getElementById("bypassPin");
    if (pinInput && reasonInput) {
      pinInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && pinInput.value.length === 4) {
          reasonInput.focus();
        }
      });
    }
    if (reasonInput) {
      reasonInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          handleBypassUnlock();
        }
      });
    }

    // Unlock handler
    if (allowBypass) {
      const bypassBtn = shadowRoot.getElementById("bypassBtn");
      if (bypassBtn) bypassBtn.addEventListener("click", handleBypassUnlock);
    }

    // Creator terminal
    const creatorBtn = shadowRoot.getElementById("secretCreatorBtn");
    if (creatorBtn) creatorBtn.addEventListener("click", openCreatorModal);

    if (!isInfinite) {
      startCountdown();
    }
  }

  function applyWallLanguage(lang) {
    config.language = lang;
    chrome.storage.local.set({ language: lang });
    updateWallLanguage(lang);
  }

  function updateWallLanguage(lang) {
    if (!shadowRoot) return;
    const t = SOFIA_I18N.wall[lang] || SOFIA_I18N.wall.it;

    const set = (sel, val) => {
      const el = shadowRoot.querySelector(sel);
      if (el) el.innerText = val;
    };
    const setHtml = (sel, val) => {
      const el = shadowRoot.querySelector(sel);
      if (el) el.innerHTML = val;
    };

    // Update Language Pills
    const langIt = shadowRoot.getElementById("sofiaLangIt");
    const langEn = shadowRoot.getElementById("sofiaLangEn");
    if (langIt && langEn) {
      if (lang === "it") {
        langIt.classList.add("active");
        langEn.classList.remove("active");
      } else {
        langEn.classList.add("active");
        langIt.classList.remove("active");
      }
    }

    set(".sofia-title", t.title);
    set(".sofia-desc", t.desc);
    set("#sofiaBadgeActive", t.badgeActive);
    set("#sofiaBadgeMode", config.isInfinite ? t.badgeInfinite : t.badgeFixed);
    set("#sofiaBadgeViolationsLbl", t.badgeViolations || "VIOLAZIONI");
    set("#sofiaTargetLabel", t.badgeTarget || "DOMINIO BLOCCATO");
    set(".sofia-countdown-label", config.isInfinite ? t.infiniteLabel : t.countdownLabel);

    if (config.isInfinite) {
      set("#sofiaCountdown", t.infiniteValue);
    }

    set("#sofiaSecBypassTitle", t.secBypassTitle || "SBLOCCO STRAORDINARIO");
    set("#sofiaSecBypassDesc", t.secBypassDesc || "Inserisci PIN e motivazione valida.");
    set("#sofiaLblPin", t.lblPin);
    set("#sofiaLblReason", t.lblReason);
    set("#bypassBtn", t.btnUnlock);
    setHtml("#sofiaCalloutText", t.calloutText || "🔒 <strong>Parametri Sigillati:</strong> Accedi al Terminale Creatore.");
    set("#secretCreatorBtn", t.btnCreator || t.footer);

    const pinInput = shadowRoot.querySelector("#bypassPin");
    if (pinInput) pinInput.placeholder = t.phPin;

    const reasonInput = shadowRoot.querySelector("#bypassReason");
    if (reasonInput) reasonInput.placeholder = t.phReason;
  }

  async function handleBypassUnlock() {
    if (!shadowRoot) return;
    const lang = config.language || "it";
    const t = SOFIA_I18N.wall[lang] || SOFIA_I18N.wall.it;

    const pinInput = shadowRoot.getElementById("bypassPin");
    const reasonInput = shadowRoot.getElementById("bypassReason");
    const bypassBtn = shadowRoot.getElementById("bypassBtn");

    if (!pinInput || !bypassBtn) return;

    const pin = pinInput.value.trim();
    const reason = (reasonInput ? reasonInput.value : "").trim();

    bypassBtn.innerText = t.btnVerifying;
    bypassBtn.disabled = true;

    // 1. PIN verification
    const isValidPin = await verifyPin(pin);
    if (!isValidPin) {
      registerViolation(t.errWrongPin);
      bypassBtn.innerText = t.btnUnlock;
      bypassBtn.disabled = false;
      return;
    }

    // 2. Reason length check (min. 30 chars). If too short (e.g. 'hahaha'), log violation!
    if (reason.length < 30) {
      registerViolation(t.errShortReason);
      bypassBtn.innerText = t.btnUnlock;
      bypassBtn.disabled = false;
      return;
    }

    // 3. Justification legitimacy check (against custom whitelist or default study/work keywords)
    const customWhitelist = Array.isArray(config.whitelist) && config.whitelist.length > 0 ? config.whitelist : [];
    const defaultWhitelist = [
      "studio", "lavoro", "esame", "ricerca", "urgente", "universita", "scuola", 
      "tutorial", "lezione", "project", "study", "work", "exam", "research", 
      "urgent", "documentation", "corso", "tesi", "progetto"
    ];
    const activeWhitelist = customWhitelist.length > 0 ? customWhitelist : defaultWhitelist;
    const lowerReason = reason.toLowerCase();
    const isCompliant = activeWhitelist.some((k) => lowerReason.includes(k.toLowerCase().trim()));

    if (!isCompliant) {
      // Non-compliant / bogus reason (e.g. random text, memes, insults) -> Count violation penalty!
      registerViolation(t.warnViolation);
      setTimeout(() => {
        executeGraceUnlock(t.successUnlock);
      }, 1200);
    } else {
      executeGraceUnlock(t.successUnlock);
    }
  }

  /**
   * Executes 15-minute temporary unlock across page reloads
   */
  function executeGraceUnlock(msg) {
    showBanner(msg, "success");
    const cleanHost = getCleanHostname();

    chrome.runtime.sendMessage({ action: "unlockDomainGrace", domain: cleanHost, durationMinutes: 15 }, (res) => {
      if (res && res.expiresAt) {
        domainGraceExpiresAt = res.expiresAt;
      }
    });

    isUnlocked = true;
    if (shadowRoot) {
      const wall = shadowRoot.getElementById("sofia-muro");
      if (wall) {
        wall.classList.add("sofia-fading-out");
        setTimeout(() => {
          removeWall();
        }, 300);
        return;
      }
    }
    removeWall();
  }

  function openCreatorModal() {
    if (!shadowRoot || shadowRoot.getElementById("sofiaCreatorModal")) return;

    const lang = config.language || "it";
    const t = SOFIA_I18N.wall[lang] || SOFIA_I18N.wall.it;

    const modal = document.createElement("div");
    modal.id = "sofiaCreatorModal";
    modal.className = "sofia-modal-backdrop";
    modal.innerHTML = `
      <div class="sofia-modal-card" id="creatorCard">
        <h2 style="font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 6px 0; letter-spacing: 0.5px; text-transform: uppercase;">${t.creatorTitle}</h2>
        <p style="font-size: 12.5px; color: #8C8C8C; margin: 0 0 16px 0;">${t.creatorDesc}</p>
        <div id="creatorBanner" class="sofia-banner"></div>
        <input type="password" id="creatorPin" class="sofia-input pin-box" maxlength="4" placeholder="••••" style="margin-bottom: 14px;" autocomplete="off">
        <button id="creatorVerifyBtn" class="sofia-btn">${t.creatorBtnVerify}</button>
        <button id="creatorCancelBtn" class="sofia-btn sofia-btn-secondary" style="margin-top: 10px;">${t.creatorCancel}</button>
      </div>

      <div class="sofia-modal-card sofia-papi-card" id="papiCard" style="display: none;">
        <h2 style="font-size: 18px; font-weight: 800; color: var(--nf-red); margin: 0 0 6px 0; letter-spacing: 0.5px; text-transform: uppercase;">
          ${t.papiTitle}
        </h2>
        <p style="font-size: 13px; color: #CCC; margin: 0 0 14px 0; line-height: 1.5;">
          ${t.papiDesc}
        </p>

        <div class="sofia-papi-progress-bg">
          <div id="wallPapiProgressFill" class="sofia-papi-progress-fill"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; margin-bottom: 6px;">
          <span id="wallPapiCounter">${(t.papiCounter || "VISIONE: {current} / {total}").replace("{current}", 1).replace("{total}", PAPI_TOTAL_REQUIRED)}</span>
          <span id="wallPapiTimer" style="font-family: var(--nf-mono); color: var(--nf-text-muted);">00:00 / 00:16</span>
        </div>

        <div class="sofia-papi-video-wrap">
          <iframe id="wallPapiIframe" width="100%" height="100%" src="" frameborder="0" referrerpolicy="no-referrer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>

        <button id="wallBtnFinalDeact" disabled class="sofia-btn" style="background: #333; cursor: not-allowed; opacity: 0.6;">
          ${t.papiLockedBtn}
        </button>

        <button id="wallBtnCancelPapi" class="sofia-btn sofia-btn-secondary" style="margin-top: 10px;">
          ${t.papiCancelBtn}
        </button>
      </div>
    `;

    shadowRoot.appendChild(modal);

    ["keydown", "keyup", "keypress", "input", "click", "mousedown", "mouseup", "pointerdown", "pointerup"].forEach((evt) => {
      modal.addEventListener(evt, (e) => e.stopPropagation(), false);
    });

    const pinInput = modal.querySelector("#creatorPin");
    const banner = modal.querySelector("#creatorBanner");
    const verifyBtn = modal.querySelector("#creatorVerifyBtn");
    const cancelBtn = modal.querySelector("#creatorCancelBtn");

    const creatorCard = modal.querySelector("#creatorCard");
    const papiCard = modal.querySelector("#papiCard");
    const wallPapiIframe = modal.querySelector("#wallPapiIframe");
    const wallPapiCounter = modal.querySelector("#wallPapiCounter");
    const wallPapiTimer = modal.querySelector("#wallPapiTimer");
    const wallPapiProgressFill = modal.querySelector("#wallPapiProgressFill");
    const wallBtnFinalDeact = modal.querySelector("#wallBtnFinalDeact");
    const wallBtnCancelPapi = modal.querySelector("#wallBtnCancelPapi");

    let papiViewsCount = 0;
    let papiSecs = 0;
    let papiInterval = null;

    pinInput.focus();

    const doVerify = async () => {
      const valid = await verifyPin(pinInput.value);
      if (valid) {
        creatorCard.style.display = "none";
        papiCard.style.display = "block";
        startPapiLoop();
      } else {
        registerViolation(t.errWrongPin);
        banner.className = "sofia-banner sofia-banner-error";
        banner.innerText = t.errWrongPin;
      }
    };

    function startPapiLoop() {
      papiViewsCount = 0;
      papiSecs = 0;
      wallPapiIframe.src = `https://www.youtube.com/embed/${PAPI_VIDEO_ID}?autoplay=1&controls=0&disablekb=1&rel=0&loop=1&playlist=${PAPI_VIDEO_ID}&playsinline=1`;
      playPapiRound();
    }

    function playPapiRound() {
      papiSecs = 0;
      const currentLang = config.language || "it";
      const t = SOFIA_I18N.wall[currentLang] || SOFIA_I18N.wall.it;
      wallPapiCounter.innerText = (t.papiCounter || "VISIONE: {current} / {total}")
        .replace("{current}", papiViewsCount + 1)
        .replace("{total}", PAPI_TOTAL_REQUIRED);
      updateWallPapiProgress();

      if (papiInterval) clearInterval(papiInterval);
      papiInterval = setInterval(() => {
        papiSecs++;
        updateWallPapiProgress();

        if (papiSecs >= PAPI_VIDEO_DURATION) {
          clearInterval(papiInterval);
          papiInterval = null;
          papiViewsCount++;

          if (papiViewsCount < PAPI_TOTAL_REQUIRED) {
            playPapiRound();
          } else {
            const currentLang = config.language || "it";
            const t = SOFIA_I18N.wall[currentLang] || SOFIA_I18N.wall.it;
            wallPapiCounter.innerText = t.papiDone || "PENITENZA COMPLETATA! (5 / 5)";
            wallPapiProgressFill.style.width = "100%";
            wallPapiProgressFill.style.background = "#10b981";

            wallBtnFinalDeact.disabled = false;
            wallBtnFinalDeact.style.background = "#E50914";
            wallBtnFinalDeact.style.cursor = "pointer";
            wallBtnFinalDeact.style.opacity = "1";
            wallBtnFinalDeact.innerText = t.papiUnlockedBtn || "✅ PENITENZA SUPERATA: CONFERMA DISATTIVAZIONE DEFINITIVA";
          }
        }
      }, 1000);
    }

    function updateWallPapiProgress() {
      const totalSec = papiViewsCount * PAPI_VIDEO_DURATION + Math.min(papiSecs, PAPI_VIDEO_DURATION);
      const overall = PAPI_TOTAL_REQUIRED * PAPI_VIDEO_DURATION;
      const pct = Math.min(100, Math.round((totalSec / overall) * 100));

      wallPapiProgressFill.style.width = `${pct}%`;
      const cur = Math.min(papiSecs, PAPI_VIDEO_DURATION);
      wallPapiTimer.innerText = `00:${cur.toString().padStart(2, "0")} / 00:${PAPI_VIDEO_DURATION}`;
    }

    verifyBtn.addEventListener("click", doVerify);
    pinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doVerify();
    });

    wallBtnFinalDeact.addEventListener("click", () => {
      chrome.storage.local.set({ active: false }, () => {
        if (papiInterval) clearInterval(papiInterval);
        wallPapiIframe.src = "";
        modal.remove();
        removeWall();
        location.reload();
      });
    });

    const closeAll = () => {
      if (papiInterval) clearInterval(papiInterval);
      wallPapiIframe.src = "";
      modal.remove();
    };

    cancelBtn.addEventListener("click", closeAll);
    wallBtnCancelPapi.addEventListener("click", closeAll);
  }

  function startCountdown() {
    if (countdownIntervalId) clearInterval(countdownIntervalId);

    const tick = () => {
      if (!config) return;
      const diff = config.endDate - Date.now();
      if (!shadowRoot) return;
      const display = shadowRoot.getElementById("sofiaCountdown");

      if (!display) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
        return;
      }

      if (diff <= 0) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
        removeWall();
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      display.innerText = `${d.toString().padStart(2, "0")}:${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    tick();
    countdownIntervalId = setInterval(tick, 1000);
  }

  function removeWall() {
    isUnlocked = true;
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
    if (rootHost) {
      rootHost.remove();
      rootHost = null;
      shadowRoot = null;
    }
    // Restore scroll for Netflix and other SPAs
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  function evaluateBlock() {
    if (shouldBlock()) {
      showWall();
    } else if (isUnlocked || (config && !config.active)) {
      removeWall();
    }
  }

  function setupDomGuard() {
    if (domObserver) return;
    domObserver = new MutationObserver(() => {
      if (shouldBlock() && (!rootHost || !document.documentElement.contains(rootHost))) {
        showWall();
      }
    });

    domObserver.observe(document.documentElement, { childList: true });
  }

  function onNavigate() {
    if (!window.location.href.includes(RICKROLL_VIDEO_ID) && !window.location.href.includes(PAPI_VIDEO_ID)) {
      if (Date.now() > domainGraceExpiresAt) {
        isUnlocked = false;
      }
    }
    evaluateBlock();
  }

  function init() {
    // Read directly from chrome.storage.local: instant, robust, and immune to Service Worker idle states
    chrome.storage.local.get(null, (storeRes) => {
      config = storeRes || {};

      const cleanHost = getCleanHostname();
      const grace = config.graceUnlocks || {};
      const expiresAt = grace[cleanHost] || 0;
      if (Date.now() < expiresAt) {
        isUnlocked = true;
        domainGraceExpiresAt = expiresAt;
      } else {
        isUnlocked = false;
      }

      evaluateBlock();
      setupDomGuard();
    });

    // Reactive sync
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        for (const [key, change] of Object.entries(changes)) {
          if (!config) config = {};
          config[key] = change.newValue;
        }
        evaluateBlock();
      }
    });

    window.addEventListener("yt-navigate-finish", onNavigate);
    window.addEventListener("popstate", onNavigate);

    // Intercept SPA navigation (Instagram, Netflix, TikTok, X)
    try {
      const wrapHistory = (type) => {
        const orig = history[type];
        return function (...args) {
          const res = orig.apply(this, args);
          window.dispatchEvent(new Event("sofia-locationchange"));
          return res;
        };
      };
      history.pushState = wrapHistory("pushState");
      history.replaceState = wrapHistory("replaceState");
      window.addEventListener("sofia-locationchange", onNavigate);
    } catch (e) {}

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        evaluateBlock();
        setupDomGuard();
      });
    }
  }

  init();
})();
