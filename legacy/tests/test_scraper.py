from unittest.mock import patch

import pytest

from midori_kage.scraper import MidoriKage


@pytest.mark.asyncio
async def test_scraper_initialization():
    """Dummy test to ensure pytest is working and scraper can be instantiated."""
    with patch("midori_kage.scraper.async_playwright"):
        scraper = MidoriKage(headless=True)
        assert scraper.headless is True
        assert scraper.session_dir.name == "session"

        # Verify config loaded (assuming default config exists)
        assert scraper.config is not None
