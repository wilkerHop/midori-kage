import argparse
import asyncio
import sys

from loguru import logger

from midori_kage.scraper import MidoriKage

# Configure logger
logger.remove()
logger.add(
    sys.stderr,
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    ),
)


async def run_scraper(args):
    scraper = MidoriKage(headless=args.headless)
    try:
        await scraper.start()

        # Example interaction loop or specific task
        # For now, we just keep it open for a bit or until interrupted
        logger.info("Scraper running. Press Ctrl+C to stop.")

        if args.scrape_chats:
            await scraper.scrape_chats(limit=args.limit)
            return

        if args.scrape_contacts:
            logger.info("Scraping contacts feature not yet implemented.")
            return

        # Keep alive loop
        logger.info(
            "No specific action requested. "
            "Running in interactive mode (Ctrl+C to stop)."
        )
        while True:
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        logger.info("Stopping scraper...")
    except Exception as e:
        logger.exception(f"An error occurred: {e}")
    finally:
        await scraper.close()


def main():
    parser = argparse.ArgumentParser(description="Midori Kage - WhatsApp Web Scraper")
    parser.add_argument(
        "--headless", action="store_true", help="Run in headless mode (default: False)"
    )
    parser.add_argument(
        "--scrape-contacts", action="store_true", help="Scrape contacts list"
    )
    parser.add_argument(
        "--scrape-chats", action="store_true", help="Scrape chat history"
    )
    parser.add_argument(
        "--limit", type=int, default=50, help="Limit number of items to scrape"
    )

    args = parser.parse_args()

    asyncio.run(run_scraper(args))


if __name__ == "__main__":
    main()
