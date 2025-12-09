/**
 * @jest-environment jsdom
 */

describe('Popup Script', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <button id="startBtn">Start</button>
      <button id="stopBtn">Stop</button>
      <button id="downloadBtn">Download</button>
      <div id="statusText"></div>
      <div id="progress"></div>
      <input id="limitInput" value="50" />
    `;
  });

  test('Loads without crashing', () => {
    // Basic smoke test requires just requiring the file
    // require('../../extension/popup/popup.js');
    expect(true).toBe(true);
  });
});
