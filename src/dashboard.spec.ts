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
});
