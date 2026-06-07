import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('VT100 Top Bar Element Rendering', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM(html);
    document = dom.window.document;
  });

  it('renders the header title rogoweb', () => {
    const title = document.querySelector('.rogoweb-title');
    expect(title).toBeTruthy();
    expect(title?.textContent?.trim()).toBe('rogoweb');
  });

  it('renders the VT100 logo image', () => {
    const logo = document.querySelector('img[alt="logo"]');
    expect(logo).toBeTruthy();
    expect(logo?.getAttribute('src')).toBe('/assets/vt100-logo.jpg');
  });

  it('renders the four status LEDs inside the strip', () => {
    const ledStrip = document.querySelector('.led-strip');
    expect(ledStrip).toBeTruthy();
    
    const leds = ledStrip?.querySelectorAll('.led');
    expect(leds?.length).toBe(4);
  });

  it('has the username input field with default value rogue', () => {
    const userInput = document.getElementById('unix-name') as HTMLInputElement;
    expect(userInput).toBeTruthy();
    expect(userInput.value).toBe('rogue');
  });

  it('has the mode toggle checkbox', () => {
    const toggle = document.getElementById('mode-toggle');
    expect(toggle).toBeTruthy();
    expect(toggle?.getAttribute('type')).toBe('checkbox');
  });

  it('has the industrial start button disabled by default', () => {
    const startBtn = document.getElementById('btn-start');
    expect(startBtn).toBeTruthy();
    expect(startBtn?.textContent?.trim()).toBe('START');
    expect(startBtn?.hasAttribute('disabled')).toBe(true);
  });
});
