import asyncio
import json
import random
from pathlib import Path
from typing import Dict, List, Optional

import yaml
from loguru import logger
from playwright.async_api import Browser, BrowserContext, Page, async_playwright
from playwright_stealth import Stealth
from pydantic import BaseModel


class ScraperConfig(BaseModel):
    selectors: Dict[str, Dict[str, str]]


class MidoriKage:
    def __init__(self, headless: bool = False, session_dir: str = "session"):
        self.headless = headless
        self.session_dir = Path(session_dir)
        self.config = self._load_config()
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None

        # Ensure session directory exists
        self.session_dir.mkdir(parents=True, exist_ok=True)

    def _load_config(self) -> ScraperConfig:
        config_path = Path("config/selectors.yaml")
        if not config_path.exists():
            raise FileNotFoundError(f"Config file not found at {config_path}")

        with open(config_path, "r") as f:
            data = yaml.safe_load(f)
            return ScraperConfig(selectors=data.get("selectors", {}))

    async def start(self):
        logger.info("Starting Midori Kage...")
        self.playwright = await async_playwright().start()

        # Launch browser
        # We use firefox or chromium. Chromium is often more detectable,
        # but playwright-stealth helps.
        # Firefox is generally good for stealth too. Let's stick to chromium for now
        # as it's standard.
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

        # Load storage state if exists
        storage_state_path = self.session_dir / "state.json"
        storage_state = str(storage_state_path) if storage_state_path.exists() else None

        if storage_state:
            logger.info("Loading existing session...")
        else:
            logger.info("No existing session found. Starting fresh.")

        # Create context with stealth settings
        self.context = await self.browser.new_context(
            storage_state=storage_state,
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="America/New_York",
        )

        # Apply stealth
        self.page = await self.context.new_page()
        await Stealth().apply_stealth_async(self.page)

        # Navigate to WhatsApp Web
        logger.info("Navigating to WhatsApp Web...")
        await self.page.goto("https://web.whatsapp.com/")

        # Wait for user to scan QR code if not logged in
        # We check for a known element that appears when logged in, e.g., chat list
        try:
            logger.info("Waiting for login...")
            # Using dynamic selector for chat list
            chat_list_selector = self._build_selector("chat_list")
            await self.page.wait_for_selector(
                chat_list_selector, timeout=60000
            )  # Wait 60s for scan
            logger.info("Login successful!")

            # Save storage state
            await self.context.storage_state(path=storage_state_path)
            logger.info("Session saved.")

        except Exception as e:
            logger.error(f"Login failed or timed out: {e}")
            # Capture screenshot for debugging
            await self.page.screenshot(path="logs/login_failed.png")
            raise

    def _build_selector(self, key: str) -> str:
        """Builds a CSS selector from the config."""
        attrs = self.config.selectors.get(key)
        if not attrs:
            raise ValueError(f"Selector '{key}' not found in config")

        parts = []
        if "css" in attrs:
            return attrs["css"]
        if "role" in attrs:
            parts.append(f'[role="{attrs["role"]}"]')
        if "aria_label" in attrs:
            parts.append(f'[aria-label="{attrs["aria_label"]}"]')

        return "".join(parts)

    async def human_delay(self, min_seconds: float = 1.0, max_seconds: float = 3.0):
        """Waits for a random amount of time with a normal distribution."""
        mean = (min_seconds + max_seconds) / 2
        std_dev = (max_seconds - min_seconds) / 4  # 95% of values within range
        delay = random.gauss(mean, std_dev)  # nosec
        delay = max(min_seconds, min(delay, max_seconds))  # Clamp
        logger.debug(f"Sleeping for {delay:.2f}s")
        await asyncio.sleep(delay)

    async def smooth_mouse_move(self, x: int, y: int):
        """Simulates smooth mouse movement to coordinates."""
        if not self.page:
            return

        # Simple implementation: move in steps
        # For production, use bezier curves or similar
        current_x = 0  # In reality, we'd track current mouse pos
        current_y = 0

        steps = 10
        for i in range(steps):
            target_x = current_x + (x - current_x) * (i + 1) / steps
            target_y = current_y + (y - current_y) * (i + 1) / steps
            await self.page.mouse.move(target_x, target_y)
            await asyncio.sleep(random.uniform(0.01, 0.05))  # nosec

    async def scrape_chats(self, limit: int = 10):
        """Scrapes the most recent chats."""
        logger.info(f"Scraping top {limit} chats...")

        # Wait for chat list to load
        chat_row_selector = self._build_selector("chat_row")
        await self.page.wait_for_selector(chat_row_selector, timeout=30000)

        # Get count
        rows = await self.page.locator(chat_row_selector).all()
        logger.info(f"Found {len(rows)} visible chat rows.")

        processed = 0
        for i in range(min(limit, len(rows))):
            # Re-query to avoid stale elements
            rows = await self.page.locator(chat_row_selector).all()
            if i >= len(rows):
                break

            row = rows[i]

            try:
                logger.info(f"Processing chat {i + 1}/{limit}...")
                await row.click()
                await self.human_delay(1, 2)

                # Scrape messages
                messages = await self._scrape_current_chat()

                # Get title
                title_selector = self._build_selector("chat_title")
                if await self.page.locator(title_selector).count() > 0:
                    chat_name = await self.page.locator(
                        title_selector
                    ).first.inner_text()
                else:
                    chat_name = f"chat_{i}"

                # Sanitize filename
                safe_name = "".join(
                    [c for c in chat_name if c.isalpha() or c.isdigit() or c == " "]
                ).strip()
                if not safe_name:
                    safe_name = f"chat_{i}"

                logger.info(f"Scraped {len(messages)} messages from '{safe_name}'")
                self._save_chat_history(safe_name, messages)

                processed += 1

            except Exception as e:
                logger.error(f"Error scraping chat {i}: {e}")

            # Random delay between chats
            await self.human_delay(2, 4)

    async def _scrape_current_chat(self) -> List[Dict[str, str]]:
        """Scrapes messages from the currently open chat."""
        msg_selector = self._build_selector("message_bubble")
        # Give a little time for messages to render
        await asyncio.sleep(1)

        msgs = await self.page.locator(msg_selector).all()
        data = []

        text_sel = self._build_selector("message_text")
        info_sel = self._build_selector("message_info")

        for msg in msgs:
            try:
                # Extract text
                text = ""
                if await msg.locator(text_sel).count() > 0:
                    text = await msg.locator(text_sel).inner_text()

                # Extract info (time/sender)
                info = ""
                if await msg.locator(info_sel).count() > 0:
                    info = (
                        await msg.locator(info_sel).get_attribute("data-pre-plain-text")
                        or ""
                    )

                if text or info:
                    data.append({"info": info.strip(), "text": text.strip()})
            except Exception:
                continue

        return data

    def _save_chat_history(self, chat_name: str, messages: List[Dict]):
        """Saves chat messages to a JSON file."""
        chats_dir = Path("chats")
        chats_dir.mkdir(exist_ok=True)

        file_path = chats_dir / f"{chat_name}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)

    async def close(self):
        if self.context:
            # Save state one last time
            storage_state_path = self.session_dir / "state.json"
            await self.context.storage_state(path=storage_state_path)
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Midori Kage stopped.")


# Example usage
if __name__ == "__main__":

    async def main():
        scraper = MidoriKage(headless=False)
        try:
            await scraper.start()
            # Do stuff...
            await scraper.human_delay(2, 5)
        finally:
            await scraper.close()

    asyncio.run(main())
