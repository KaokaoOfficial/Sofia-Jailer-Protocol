# Sofia: Jailer Protocol (v3.2.0) 🛡️

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange.svg)]()

> **Sofia: Jailer Protocol** è un'estensione per browser (Manifest V3) per il focus assoluto e l'autodisciplina. Blocca siti e piattaforme fonte di distrazione (YouTube, Netflix, Instagram, TikTok, Reddit, domini custom) con un'interfaccia widescreen in stile cinematografico Netflix, isolamento Shadow DOM e architettura anti-sabotaggio supervisionata da Sofia.

---

## ⚡ Caratteristiche Principali (v3.2.0)

* 🎬 **Design Cinematografico Stile Netflix:** Nuova interfaccia widescreen pulita, priva di elementi ammassati, con logo vettoriale S Ribbon, contrasto ottimizzato e tema Dark Obsidian.
* 🛡️ **Isolamento Completo con Shadow DOM:** Il muro di blocco opera in uno Shadow DOM isolato per evitare conflitti CSS e blocchi di input o click su piattaforme complesse come Netflix e YouTube.
* 🌍 **Internazionalizzazione Centralizzata (`i18n.js`):** Tutti i testi e le traduzioni (Italiano / Inglese) sono isolati in un unico modulo dedicato con codifica Unicode pulita, eliminando problemi di codifica e duplicazioni.
* ⏳ **Sblocco Temporaneo Persistente (15 Minuti):** Se la motivazione è valida o se viene registrata un'infrazione con bypass, la sessione temporanea di 15 minuti è memorizzata in modo sicuro per sopravvivere ai refresh di pagina e al ciclo di vita del Service Worker.
* 🎺 **Penitenza del Creatore (Enrico Papi 5x):** Per disattivare definitivamente Sofia tramite il Terminale Creatore, è obbligatorio completare la visione di 5 iterazioni consecutive di Enrico Papi senza possibilità di saltare.
* 🎯 **Easter Egg di Disciplina (Rickroll):** Al superamento della soglia di 3 violazioni registrate, scatta automaticamente il protocollo di punizione a sorpresa.
* 🌐 **Routing e Header DeclarativeNetRequest:** Regole dichiarative di rete (`rules.json`) per garantire la riproduzione video senza errori di configurazione del player.

---

## 📁 Struttura del Progetto

```text
Sofia/
├── manifest.json       # Configurazione Manifest V3 e dichiarazioni permessi
├── background.js      # Service Worker: coordinatore stato violazioni e sessioni
├── content.js         # Shadow DOM content script iniettato sui siti bloccati
├── i18n.js            # Sistema centralizzato di traduzioni (IT/EN)
├── muro.css           # Foglio di stile dark Netflix per il muro di blocco
├── options.html       # Centro di controllo widescreen desktop
├── options.js         # Logica reattiva, crittografia SHA-256 e penitenza Papi
├── rules.json         # Regole declarativeNetRequest per header YouTube
├── README.md          # Documentazione del progetto
└── icon*.png          # Icone vettoriali ad alta definizione (16, 32, 48, 128)
```

---

## 🛠️ Installazione Locale (Developer Mode)

1. Apri Google Chrome (o Microsoft Edge, Brave, Opera).
2. Vai a: `chrome://extensions`.
3. Attiva la levetta **Modalità sviluppatore** (*Developer mode*) in alto a destra.
4. Clicca su **Carica estensione non pacchettizzata** (*Load unpacked*).
5. Seleziona la cartella `Sofia`.
6. Clicca sull'icona di Sofia nella barra delle estensioni per aprire il Centro di Controllo.

---

## 🕹️ Configurazione Rapida

1. **Imposta il PIN:** Scegli un PIN numerico a 4 cifre per autenticare le operazioni straordinarie.
2. **Seleziona i Domini:** Clicca sui preset (YouTube, Netflix, Instagram, TikTok...) o aggiungi qualsiasi dominio personalizzato.
3. **Regole & Durata:** Scegli la durata (determinata o infinita) e configura l'eventuale whitelist di parole chiave per la motivazione di sblocco.
4. **Attiva il Protocollo:** Clicca su *Attiva Protocollo Sofia* per sigillare il browser.

Rilasciato con licenza MIT. Creato da **Kaokao34**.
"# Sofia" 
