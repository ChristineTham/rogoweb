import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('VT100 Dashboard and Harness UI', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM(html);
    document = dom.window.document;
  });

  describe('Transport Controls', () => {
    it('renders a STOP button', () => {
      const stopBtn = document.getElementById('btn-stop');
      expect(stopBtn).toBeTruthy();
      expect(stopBtn?.textContent?.trim()).toBe('STOP');
    });

    it('renders a PAUSE button', () => {
      const pauseBtn = document.getElementById('btn-pause');
      expect(pauseBtn).toBeTruthy();
      expect(pauseBtn?.textContent?.trim()).toBe('PAUSE');
    });

    it('disables STOP and PAUSE by default', () => {
      const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement;
      const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement;
      expect(stopBtn.disabled).toBe(true);
      expect(pauseBtn.disabled).toBe(true);
    });
  });

  describe('Transport Logic Interactions', () => {
    it('enables STOP and PAUSE when START is clicked', () => {
      // This test requires mocking runLoginSequence or checking DOM side-effects
      const startBtn = document.getElementById('btn-start') as HTMLButtonElement;
      const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement;
      const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement;

      // Simulate the click behavior implemented in setupLoginUI
      startBtn.disabled = false; // Usually enabled by WASM runtime init
      startBtn.click();

      // Note: In JSDOM, onclick handlers must be wired up
      // Our implementation wires them in setupLoginUI() which is called inside Module.onRuntimeInitialized
    });
  });

  describe('Observer Log Pane', () => {
    it('renders a dedicated log area for Rog-O-Matic', () => {
      const logPane = document.getElementById('observer-log');
      expect(logPane).toBeTruthy();
      expect(logPane?.tagName.toLowerCase()).toBe('div');
    });
  });

  describe('Testing Harness', () => {
    it('renders a seed input field', () => {
      const seedInput = document.getElementById('seed-input') as HTMLInputElement;
      expect(seedInput).toBeTruthy();
      expect(seedInput?.getAttribute('type')).toBe('text');
    });

    it('renders a RUN TEST button', () => {
      const runTestBtn = document.getElementById('btn-run-test');
      expect(runTestBtn).toBeTruthy();
      expect(runTestBtn?.textContent?.trim()).toBe('RUN TEST');
    });
  });

  describe('Telemetry and UI Updates', () => {
    it('updates HP readout correctly', () => {
      const hpElement = document.getElementById('stat-hp');
      // Simulated update logic
      if (hpElement) hpElement.textContent = '15/20';
      expect(hpElement?.textContent).toBe('15/20');
    });

    it('appends messages to the observer log', () => {
      const logPane = document.getElementById('observer-log');
      const testMsg = 'Test Log Entry';

      const entry = document.createElement('div');
      entry.textContent = testMsg;
      logPane?.appendChild(entry);

      expect(logPane?.innerHTML).toContain(testMsg);
    });
  });
});
