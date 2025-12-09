# Midori Kage - WhatsApp Web Scraper Extension

A Chrome Extension (Manifest V3) for scraping WhatsApp Web chats and extracting contact details.

## Features
- **Automated Navigation**: Traverses your chat list automatically.
- **Message Scraping**: Extracts text and metadata from chats.
- **Contact Extraction**: Scrapes Name, About, and Phone from the contact info drawer.
- **Smart Scrolling**: Automatically loads more chats via infinite scroll.
- **Privacy-Focused**: Runs locally in your browser.

## Installation
1. Clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable "Developer mode".
4. Click "Load unpacked" and select the `extension/` folder.

## Usage
1. Open [WhatsApp Web](https://web.whatsapp.com).
2. Click the Midori Kage icon.
3. Configure limits and click "Start Scraping".
4. Download the results as JSON.

## Legacy
The original Python/Playwright implementation can be found in the `legacy/` directory.
