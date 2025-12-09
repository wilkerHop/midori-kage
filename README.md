# 🍃 Midori Kage

**Midori Kage** (Green Shadow) is a high-performance, robust WhatsApp Web Scraper and Crawler built as a Chrome Extension. 

Unlike traditional scrapers that rely on brittle DOM selectors (`querySelector`), Midori Kage uses **Module Injection** to tap directly into WhatsApp Web's internal Webpack modules (`Store.Msg`, `Cmd.openChatAt`). This ensures lightning-fast navigation and bulletproof data extraction that survives UI updates.

## 🚀 Key Features

-   **Module Injection**: Bypasses the UI layer to access internal `Msg` and `Contact` stores directly.
-   **Bridge Architecture**: A secure message bridge seamlessly connects the Content Script (Extractor) with the Injected Script (Module Access).
-   **Strict Code Quality**: Enforced by a custom `check-sins.sh` script (No empty catches, file size limits).
-   **Automated Navigation**: Opens chats programmatically using internal routers.

## 🛠️ Architecture

1.  **Injector (`src/scripts/injector.ts`)**: The entry point that injects the script tag.
2.  **Module Finder (`src/scripts/module-finder.ts`)**: Scans Webpack chunks to verify and expose internal stores.
3.  **Midori API (`src/scripts/midori-api.ts`)**: Wraps internal stores into a clean `window.Midori` API.
4.  **Bridge (`src/services/bridge.ts`)**: Handles async communication between the extension and the injected API.

## 📦 Installation & Usage

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Build**:
    ```bash
    npm run build
    ```
3.  **Load Extension**:
    -   Open Chrome and go to `chrome://extensions`.
    -   Enable **Developer Mode**.
    -   Click **Load Unpacked** and select the `dist` folder.
4.  **Run**:
    -   Open WhatsApp Web.
    -   The extension will automatically inject and start the extraction loop (check Console).

## 🛡️ Code Quality ("Sins")

We maintain strict standards. Before committing, run:
```bash
./scripts/check-sins.sh
```
This ensures:
-   No `eslint-disable` or `@ts-ignore`.
-   No empty `catch` blocks.
-   No large files (>100 lines).

## ⚠️ Disclaimer

This project is for **educational and research purposes only**. It comes with no warranty. Users are responsible for complying with WhatsApp's Terms of Service.
