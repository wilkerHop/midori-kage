import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForHeaderChange } from '../src/services/navigator';


describe('Scraper Logic', () => {

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('waitForHeaderChange should return true when header is found', async () => {
    // Mock the DOM
    const main = document.createElement('div');
    main.id = 'main';
    main.innerText = 'Chat with Alice';
    document.body.appendChild(main);

    // Mock sleep to be instant
    // We can't mock local internal helper easily without dependency injection or module mock
    // But since it waits 500ms, the test might be slow. 
    // Ideally we export sleep to mock it or use fake timers.
    // For now, let's just rely on it finding it immediately (iteration 0).
    
    const result = await waitForHeaderChange('Alice');
    expect(result).toBe(true);
  });

  it('waitForHeaderChange should fail gracefully if header not found', async () => {
    // Speed up test by not retrying too much
    // Since we hardcoded maxRetries=10 and 500ms sleep, this test would take 5 seconds.
    // We should probably mock timers.
    vi.useFakeTimers();

    const promise = waitForHeaderChange('Bob');
    
    // Fast-forward time
    // Fast-forward time safely past the retry limit (10 * 500ms = 5000ms)
    await vi.advanceTimersByTimeAsync(10000);

    const result = await promise;
    expect(result).toBe(false);
    
    vi.useRealTimers();
  });
});
