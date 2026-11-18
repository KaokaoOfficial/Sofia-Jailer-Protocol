# Sofia — Jailer Protocol

> A personal browser-extension project focused on reducing distractions and making intentional access to selected websites harder.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Experimental](https://img.shields.io/badge/status-experimental-orange.svg)](#project-status)

Sofia is a small, experimental browser extension created by **Kaokao34** as a personal project and developed for fun. It lets you choose websites you want to stay away from, configure a focus period, and place a blocking screen in front of those sites while the protocol is active.

This is an independent hobby project. It is **not bug-free**, is not presented as a production-grade security product, and may behave unexpectedly on some websites or browser versions. Use it with that understanding.

## What it does

- **Website blocking:** choose from the built-in platform presets or add custom domains.
- **Timed or indefinite sessions:** configure a start and end time, or enable an indefinite focus period.
- **Emergency access:** optionally allow a temporary 15-minute unlock after entering the configured PIN and a justification.
- **Violation tracking:** failed or non-compliant unlock attempts are recorded. The project includes a playful Rickroll easter egg after the configured violation threshold.
- **Creator deactivation flow:** the current build includes a deliberately playful creator-terminal/penalty sequence.
- **Control centre:** manage the protocol from a dedicated options page.
- **Italian and English UI:** interface strings are centralised in `i18n.js`.
- **Manifest V3 architecture:** uses a background service worker, content scripts, local extension storage and Declarative Net Request rules.

The blocking interface is injected by the content script and isolated with Shadow DOM to reduce styling conflicts with the pages it covers. As websites change their layouts and navigation behaviour, compatibility can vary.

## What Sofia is not

- It is **not** an operating-system-level blocker.
- It is **not** a parental-control or enterprise security product.
- It cannot guarantee that every route, embedded page, browser, or alternative access method will be blocked.
- It does not make a website or its content inaccessible outside the browser profile where the extension is installed.

## Installation

This repository currently provides the extension source code. To load it locally:

1. Download the repository or clone it:
   ```bash
   git clone https://github.com/KaokaoOfficial/Sofia-Jailer-Protocol.git
   ```
2. Open `chrome://extensions` in Chrome (or the equivalent extensions page in a Chromium-based browser).
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the folder containing `manifest.json`.

After installation, open Sofia from the browser toolbar to access its control centre.

## Configuration overview

1. Open the Sofia control centre.
2. Choose the website presets you want to block, and/or add custom domains.
3. Set a four-digit security PIN.
4. Choose whether emergency access is allowed.
5. Configure the focus period (scheduled or indefinite).
6. Activate the protocol.

When emergency access is enabled, the extension asks for the PIN and a justification. A successful temporary unlock lasts 15 minutes. Exact behaviour can depend on the page and browser lifecycle.

## Project layout

```text
Sofia/
├── background.js   # Manifest V3 service worker and shared state handling
├── content.js      # Website detection and blocking-screen injection
├── i18n.js         # Italian and English interface strings
├── manifest.json   # Extension metadata, permissions and entry points
├── muro.css        # Styles for the injected blocking screen
├── options.html    # Control-centre markup and styling
├── options.js      # Control-centre behaviour and configuration
├── rules.json      # Declarative Net Request rules
├── icon16.png      # Toolbar icon
├── icon32.png      # Extension icon
├── icon48.png      # Extension icon
└── icon128.png     # Store/high-resolution icon
```

## Permissions

The manifest requests:

- `storage` — save the extension's configuration and local state.
- `declarativeNetRequest` — apply the bundled network request rules.
- `<all_urls>` host access — allow the content script to run on websites selected for blocking.

Review `manifest.json` and `rules.json` before installing if you want to inspect the exact permissions and network rules.

## Project status and limitations

Sofia is maintained as a personal learning/experimentation project. It has not been independently audited, and no claim is made that it is free of bugs. Some behaviours may be affected by browser updates, single-page applications, site redesigns, embedded content, permissions, or local browser settings.

Please report reproducible issues with:
- browser name and version;
- operating system;
- the affected website and steps to reproduce;
- any relevant console error messages (remove personal data before sharing).

There is no guarantee of support, maintenance frequency, or compatibility with every Chromium-based browser.

## Contributing

Suggestions and bug reports are welcome. Keep reports focused and include enough detail to reproduce the behaviour. Before proposing a change, check that it does not weaken the extension's blocking or configuration flows.

## 📄 Licenza e Attribuzione

Questo progetto è distribuito con **licenza MIT**. Per consultare i termini completi, leggi il file [LICENSE](LICENSE).

Sviluppato originariamente da **Kaokao34** ([@KaokaoOfficial](https://github.com/KaokaoOfficial)).

> **Una cortesia per chi utilizza questo progetto:** se pubblichi o distribuisci una tua versione dell'estensione, ti chiedo gentilmente di mantenere un riferimento al progetto originale, ad esempio nella descrizione dell'estensione o nella pagina del progetto, con una dicitura come:
>
> *Powered by [Kaokao34](https://github.com/KaokaoOfficial)*
