# Midori Kage 🍃

A robust, production-ready WhatsApp Web Scraper prioritizing safety, maintainability, and code health.

## Features

- **Stealth Mode**: Uses `playwright-stealth` and human-mimicry (random delays, smooth mouse movements) to avoid detection.
- **Session Persistence**: Saves browser state (cookies/local storage) so you only need to scan the QR code once.
- **Dynamic Selectors**: Selectors are loaded from `config/selectors.yaml` for easy updates.
- **Code Health**: Includes a full CI/CD pipeline with linting, security checks, and testing.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/midori-kage.git
    cd midori-kage
    ```

2.  **Install dependencies using Poetry:**
    ```bash
    poetry install
    poetry shell
    playwright install chromium
    ```

    *Or using pip:*
    ```bash
    pip install -r requirements.txt # (You may need to generate this from pyproject.toml)
    playwright install chromium
    ```

## Usage

### First Run (Important!) ⚠️

On the first run, you **MUST** run in "Head" mode (visible browser) to scan the QR code.

```bash
python main.py
```

1.  The browser will open and navigate to WhatsApp Web.
2.  Scan the QR code with your phone.
3.  Once logged in, the session will be saved to the `session/` directory.
4.  You can stop the script (Ctrl+C).

### Subsequent Runs

You can now run in headless mode if desired (though "Head" mode is safer).

```bash
python main.py --headless
```

### Options

- `--headless`: Run browser in background.
- `--scrape-contacts`: (Placeholder) Scrape contact list.
- `--limit N`: Limit number of items to scrape.

## Configuration

If WhatsApp updates their UI and selectors break, update `config/selectors.yaml`:

```yaml
selectors:
  chat_list:
    role: "button"
    aria_label: "Chat list"
  # ...
```

## Development

Run code health checks:

```bash
# Format
black .
isort .

# Lint
flake8 .

# Security
bandit -r src/

# Test
pytest
```
