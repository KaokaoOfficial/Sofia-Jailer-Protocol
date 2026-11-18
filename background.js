// Copyright (c) 2026 Kaokao34 (@KaokaoOfficial) - Licensed under the MIT License.
"use strict";

/**
 * Sofia: Jailer Protocol - Background Service Worker
 * Centralized state coordinator for atomic violations and session unlocks.
 */

// In-memory session temporary unlocks: { "domain": expireTimestamp }
const sessionUnlocks = new Map();

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    openOrFocusOptions();
  }
});

chrome.action.onClicked.addListener(() => {
  openOrFocusOptions();
});

// Centralized Message Handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  if (message.action === "openOptions") {
    openOrFocusOptions();
    sendResponse({ success: true });
    return true;
  }

  // ATOMIC VIOLATION COUNTER (Eliminates race conditions and stale tab counters)
  if (message.action === "recordViolation") {
    chrome.storage.local.get(["violations", "active"], (res) => {
      const current = typeof res.violations === "number" ? res.violations : 0;
      const updated = current + 1;
      const shouldRickroll = updated >= 3;

      chrome.storage.local.set({ violations: updated }, () => {
        sendResponse({
          success: true,
          violations: updated,
          triggerRickroll: shouldRickroll
        });
      });
    });
    return true; // Keep sendResponse open for async
  }

  // TEMPORARY GRACE PERIOD UNLOCK (Persisted in storage so it survives Service Worker sleep & page refresh)
  if (message.action === "unlockDomainGrace") {
    const domain = (message.domain || "").toLowerCase();
    const durationMs = (message.durationMinutes || 15) * 60 * 1000;
    const expiresAt = Date.now() + durationMs;

    chrome.storage.local.get("graceUnlocks", (data) => {
      const grace = data.graceUnlocks || {};
      grace[domain] = expiresAt;
      chrome.storage.local.set({ graceUnlocks: grace }, () => {
        sendResponse({ success: true, expiresAt });
      });
    });
    return true;
  }

  // CHECK IF DOMAIN IS IN GRACE PERIOD
  if (message.action === "checkDomainGrace") {
    const domain = (message.domain || "").toLowerCase();
    chrome.storage.local.get("graceUnlocks", (data) => {
      const grace = data.graceUnlocks || {};
      const expiresAt = grace[domain] || 0;
      const isUnlocked = Date.now() < expiresAt;
      sendResponse({ isUnlocked, expiresAt });
    });
    return true;
  }
});

async function openOrFocusOptions() {
  const optionsUrl = chrome.runtime.getURL("options.html");
  try {
    const tabs = await chrome.tabs.query({});
    const existing = tabs.find(t => t.url && t.url.startsWith(optionsUrl));
    if (existing) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
      return;
    }
  } catch (e) {}
  chrome.tabs.create({ url: optionsUrl });
}
