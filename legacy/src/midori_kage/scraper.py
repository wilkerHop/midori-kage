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
    ignored_chats: List[str] = []


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

        ignore_path = Path("config/ignore_list.yaml")
        ignored = []
        if ignore_path.exists():
            with open(ignore_path, "r") as f:
                ignore_data = yaml.safe_load(f)
                ignored = ignore_data.get("ignored_chats", [])

        with open(config_path, "r") as f:
            data = yaml.safe_load(f)
            return ScraperConfig(
                selectors=data.get("selectors", {}), ignored_chats=ignored
            )

    async def start(self):
        # Configure verbose logging
        logger.add(
            "logs/debug.log",
            level="DEBUG",
            rotation="10 MB",
            retention="1 week",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
        )
        logger.info("Starting Midori Kage...")
        self.playwright = await async_playwright().start()

        # Use a persistent context for better session stability (IndexedDB, etc.)
        user_data_dir = self.session_dir / "user_data"
        user_data_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Using session directory: {user_data_dir}")

        # Launch persistent context
        # We use firefox or chromium. Chromium is often more detectable,
        # but playwright-stealth helps.
        self.context = await self.playwright.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=self.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="America/New_York",
        )

        self.browser = None  # Persistent context is the browser effectively

        # Apply stealth to the first page (or all new pages)
        if len(self.context.pages) > 0:
            self.page = self.context.pages[0]
        else:
            self.page = await self.context.new_page()

        await Stealth().apply_stealth_async(self.page)

        # Navigate to WhatsApp Web
        logger.info("Navigating to WhatsApp Web...")
        await self.page.goto("https://web.whatsapp.com/")

        # Wait for user to scan QR code if not logged in
        try:
            logger.info("Waiting for login...")
            # Using dynamic selector for chat list or side panel which is more robust
            # New WhatsApp Web often has a side panel wrapper
            await self.page.wait_for_selector(
                "#side, [aria-label='Chat list']", timeout=60000
            )  # Wait 60s for scan
            logger.info("Login successful!")

        except Exception as e:
            logger.error(f"Login failed or timed out: {e}")
            # Capture screenshot
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
        """Scrapes chats with caching and infinite scroll support."""
        if limit == -1:
            logger.info("Scraping ALL chats...")
            limit = float("inf")
        else:
            logger.info(f"Scraping top {limit} chats...")

        chat_list_selector = self._build_selector("chat_list")
        chat_row_selector = self._build_selector("chat_row")
        list_title_selector = self._build_selector("chat_list_title")

        # Wait for list
        await self.page.wait_for_selector(chat_row_selector, timeout=30000)

        processed_count = 0
        scrolled_attempts = 0
        visited_names = set()

        while processed_count < limit:
            # Get current rows
            rows = await self.page.locator(chat_row_selector).all()

            # Filter rows we haven't processed in this loop run if possible?
            # Actually, easiest is to iterate what we see, check cache/visited.

            new_promising_rows = []
            for row in rows:
                # Try to extract name from row to check cache BEFORE clicking
                try:
                    name_el = row.locator(list_title_selector).first
                    if await name_el.count() > 0:
                        raw_name = await name_el.inner_text()
                        safe_name = self._sanitize_filename(raw_name)

                        if safe_name in visited_names:
                            continue

                        # Check cache
                        if self._chat_exists(safe_name):
                            logger.info(f"Skipping cached chat: '{safe_name}'")
                            visited_names.add(safe_name)
                            continue

                        new_promising_rows.append((row, safe_name, raw_name))
                    else:
                        # Cannot read name easily? Skip or try click?
                        # Let's skip to be safe/fast
                        continue
                except Exception:
                    continue  # nosec

            if not new_promising_rows:
                # No new actionable rows visible. Scroll down.
                logger.info("No new chats visible. Scrolling...")
                prev_count = len(rows)

                # Scroll the chat list container
                chat_list_el = self.page.locator(chat_list_selector).first
                await chat_list_el.evaluate("el => el.scrollTop += 1000")
                await asyncio.sleep(2)  # Wait for load

                # Check if we reached bottom/stopped loading
                new_rows_count = await self.page.locator(chat_row_selector).count()
                if new_rows_count == prev_count:
                    scrolled_attempts += 1
                    if scrolled_attempts >= 3:
                        logger.info("Reached end of chat list or load timeout.")
                        break
                else:
                    scrolled_attempts = 0

                continue

            # Process the promising rows
            for row, safe_name, raw_name in new_promising_rows:
                if processed_count >= limit:
                    break

                visited_names.add(safe_name)

                # Check ignore list (using raw name usually, but config might have safe?
                # Let's check raw name mainly)
                if raw_name in self.config.ignored_chats:
                    logger.info(f"Skipping ignored chat: '{raw_name}'")
                    continue

                try:
                    logger.info(f"Processing chat {processed_count + 1}: '{raw_name}'")

                    # Click the row
                    await row.click()

                    # Wait for the chat title in the header to match the clicked
                    # name (or close to it). This ensures we switched chats.
                    # We look for the main header element
                    header_selector = "#main header"

                    # Retry logic for verification
                    verified = False
                    for _ in range(5):  # Wait up to ~5 seconds (5 * 1s)
                        await asyncio.sleep(1)
                        if await self.page.locator(header_selector).count() > 0:
                            # Get all text in header
                            header_text = await self.page.locator(
                                header_selector
                            ).first.inner_text()

                            # Check if the name we clicked is in the header
                            # This is fuzzier but safer than specific span[title]
                            if raw_name in header_text:
                                verified = True
                                break
                            elif safe_name in self._sanitize_filename(header_text):
                                verified = True
                                break
                            # Handle group names truncation or partial matches
                            elif len(raw_name) > 10 and raw_name[:10] in header_text:
                                verified = True
                                break
                            else:
                                logger.debug(
                                    f"Header text mismatch with row '{raw_name}'."
                                    f" Header contains: {header_text[:40]}..."
                                    f" Waiting..."
                                )

                    if not verified:
                        logger.warning(
                            f"Failed to verify navigation to '{raw_name}'. "
                            "Skipping to avoid mix-up."
                        )
                        # Could attempt to click again or just skip
                        continue

                    # Double check we are in the right chat (header check)
                    # Skip header check for speed if we trust click,
                    # OR implement robustly.
                    # Let's check group heuristic here as well if possible, or inside.

                    # We can use the header subtitle for group check as before
                    subtitle_selector = self._build_selector("chat_subtitle")
                    is_group = False
                    if await self.page.locator(subtitle_selector).count() > 0:
                        subtitle = await self.page.locator(
                            subtitle_selector
                        ).first.inner_text()
                        if (
                            "," in subtitle
                            or "group" in subtitle.lower()
                            or "click here" in subtitle.lower()
                        ):
                            is_group = True

                    if is_group:
                        logger.info(f"Skipping group chat: '{raw_name}'")
                        continue

                    # Scrape Contact Info
                    contact_info = await self._scrape_contact_info()
                    logger.info(f"Extracted info: {contact_info}")

                    # Scrape Messages
                    messages = await self._scrape_current_chat()
                    logger.info(f"Scraped {len(messages)} messages.")

                    self._save_chat_history(safe_name, messages, contact_info)
                    processed_count += 1

                except Exception as e:
                    logger.error(f"Error scraping '{raw_name}': {e}")

                await self.human_delay(1, 3)

    async def _scrape_contact_info(self) -> Dict[str, str]:
        """Opens contact info drawer and scrapes details."""
        info = {
            "name": "",
            "phone": "",
            "about": "",
            "scraped_at": "",  # Could add timestamp
        }

        try:
            # Click header to open drawer
            header_click_sel = self._build_selector("header_title_container")
            logger.debug("Clicking header to open contact info...")
            # Use first just in case
            await self.page.locator(header_click_sel).first.click()

            # Wait for drawer text "Contact info" or "Group info" or similar?
            # Or just wait a bit and check for name element.
            await asyncio.sleep(1.0)  # wait for animation

            # Extract name
            name_sel = self._build_selector("contact_info_name")
            if await self.page.locator(name_sel).count() > 0:
                info["name"] = await self.page.locator(name_sel).first.inner_text()
                logger.debug(f"Found contact name: {info['name']}")

            # Extract about
            about_sel = self._build_selector("contact_info_about")
            if await self.page.locator(about_sel).count() > 0:
                info["about"] = await self.page.locator(about_sel).first.inner_text()

            # Close drawer using Escape key (safer/easier)
            logger.debug("Closing contact info drawer with Escape key...")
            await self.page.keyboard.press("Escape")
            await asyncio.sleep(0.5)

        except Exception as e:
            logger.error(f"Failed to scrape contact info: {e}")
            # Try to ensure we are back in chat by pressing Escape again if needed
            try:
                await self.page.keyboard.press("Escape")
            except Exception:
                pass  # nosec

        return info

    def _sanitize_filename(self, name: str) -> str:
        safe = "".join(
            [c for c in name if c.isalpha() or c.isdigit() or c == " "]
        ).strip()
        return safe if safe else "unknown_chat"

    def _chat_exists(self, chat_name: str) -> bool:
        return (self.session_dir.parent / "chats" / f"{chat_name}.json").exists()

    async def _scrape_current_chat(self) -> List[Dict[str, str]]:
        """Scrapes messages from the currently open chat."""
        msg_selector = self._build_selector("message_bubble")
        # Give a little time for messages to render
        await asyncio.sleep(1)

        msgs = await self.page.locator(msg_selector).all()
        logger.debug(f"Found {len(msgs)} message bubbles.")
        data = []

        text_sel = self._build_selector("message_text")
        info_sel = self._build_selector("message_info")

        for i, msg in enumerate(msgs):
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
                else:
                    logger.debug(
                        f"Msg {i}: Empty text/info. Possibly media/system msg."
                    )

            except Exception as e:
                logger.debug(f"Msg {i}: Error extracting: {e}")
                continue

        return data

    def _save_chat_history(
        self, chat_name: str, messages: List[Dict], contact_info: Dict = None
    ):
        """Saves chat messages and metadata to a JSON file."""
        chats_dir = Path("chats")
        chats_dir.mkdir(exist_ok=True)

        data = {
            "chat_name": chat_name,
            "contact_info": contact_info or {},
            "messages": messages,
        }

        file_path = chats_dir / f"{chat_name}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    async def close(self):
        if self.context:
            await self.context.close()
        # if self.browser:
        #     await self.browser.close() # Persistent context acts as browser
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
