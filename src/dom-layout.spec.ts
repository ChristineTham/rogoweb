import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('DOM and Responsive Layout Engine', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM(html);
    document = dom.window.document;
  });

  describe('Static HTML Structures', () => {
    it('renders the header title rogoweb', () => {
      const title = document.querySelector('.rogoweb-title');
      expect(title).toBeTruthy();
      expect(title?.textContent?.trim()).toBe('rogoweb');
    });

    it('renders the VT100 logo image with correct source', () => {
      const logo = document.querySelector('img[alt="logo"]');
      expect(logo).toBeTruthy();
      expect(logo?.getAttribute('src')).toBe('/assets/vt100-logo.jpg');
    });

    it('renders the four status LEDs inside the LED strip container', () => {
      const ledStrip = document.querySelector('.led-strip');
      expect(ledStrip).toBeTruthy();

      const leds = ledStrip?.querySelectorAll('.led');
      expect(leds?.length).toBe(4);
      expect(document.getElementById('led-l1')).toBeTruthy();
      expect(document.getElementById('led-l2')).toBeTruthy();
      expect(document.getElementById('led-l3')).toBeTruthy();
      expect(document.getElementById('led-l4')).toBeTruthy();
    });

    it('renders the username input field with default value rogue', () => {
      const userInput = document.getElementById('unix-name') as HTMLInputElement;
      expect(userInput).toBeTruthy();
      expect(userInput.value).toBe('rogue');
    });

    it('renders the mode toggle checkbox', () => {
      const toggle = document.getElementById('mode-toggle');
      expect(toggle).toBeTruthy();
      expect(toggle?.getAttribute('type')).toBe('checkbox');
    });

    it('renders the industrial start button disabled by default', () => {
      const startBtn = document.getElementById('btn-start');
      expect(startBtn).toBeTruthy();
      expect(startBtn?.textContent?.trim()).toBe('START');
      expect(startBtn?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Adaptive Layout System Class Application', () => {
    // Exact simulation of layout logic in main.ts
    const applyAdaptiveLayout = (
      mainArea: HTMLElement,
      statsPanel: HTMLElement,
      containerW: number,
      containerH: number,
      targetW: number,
      targetH: number,
    ) => {
      statsPanel.classList.add('hidden');
      mainArea.classList.remove(
        'flex-row',
        'flex-col',
        'justify-center',
        'justify-start',
        'items-center',
        'gap-4',
        'gap-2',
      );
      mainArea.style.justifyContent = '';

      const MIN_STATS_W = 140;
      const MIN_STATS_H = 110;

      if (containerW >= targetW + MIN_STATS_W + 5) {
        mainArea.classList.add('flex-row', 'justify-center', 'items-center', 'gap-2');
        statsPanel.classList.remove('hidden');
      } else if (containerH >= targetH + MIN_STATS_H + 10) {
        mainArea.classList.add('flex-col', 'justify-center', 'items-center', 'gap-2');
        statsPanel.classList.remove('hidden');
      } else {
        mainArea.classList.add('flex-col', 'justify-center', 'items-center');
      }
    };

    let mainArea: HTMLElement;
    let statsPanel: HTMLElement;

    beforeEach(() => {
      mainArea = document.createElement('div');
      statsPanel = document.createElement('aside');
    });

    it('configures WIDE layout when horizontal space is sufficient for stats panel', () => {
      // targetW = 640. Needs 640 + 140 + 5 = 785px.
      // With containerW = 800: horizontal space is sufficient.
      applyAdaptiveLayout(mainArea, statsPanel, 800, 500, 640, 480);

      expect(statsPanel.classList.contains('hidden')).toBe(false);
      expect(mainArea.classList.contains('flex-row')).toBe(true);
      expect(mainArea.classList.contains('justify-center')).toBe(true);
      expect(mainArea.classList.contains('items-center')).toBe(true);
      expect(mainArea.classList.contains('gap-2')).toBe(true);
    });

    it('configures TALL layout when vertical space is sufficient but horizontal is not', () => {
      // targetW = 640, targetH = 480.
      // containerW = 700 (not enough for wide: 700 < 785).
      // Needs 480 + 110 + 10 = 600px vertical.
      // With containerH = 650: vertical space is sufficient.
      applyAdaptiveLayout(mainArea, statsPanel, 700, 650, 640, 480);

      expect(statsPanel.classList.contains('hidden')).toBe(false);
      expect(mainArea.classList.contains('flex-col')).toBe(true);
      expect(mainArea.classList.contains('justify-center')).toBe(true);
      expect(mainArea.classList.contains('items-center')).toBe(true);
      expect(mainArea.classList.contains('gap-2')).toBe(true);
    });

    it('configures COMPACT layout and hides stats when space is restricted on both axis', () => {
      // targetW = 640, targetH = 480.
      // containerW = 700 (< 785), containerH = 500 (< 600).
      applyAdaptiveLayout(mainArea, statsPanel, 700, 500, 640, 480);

      expect(statsPanel.classList.contains('hidden')).toBe(true);
      expect(mainArea.classList.contains('flex-col')).toBe(true);
      expect(mainArea.classList.contains('justify-center')).toBe(true);
      expect(mainArea.classList.contains('items-center')).toBe(true);
      expect(mainArea.classList.contains('gap-2')).toBe(false);
    });
  });
});
