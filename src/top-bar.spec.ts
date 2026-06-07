import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('VT100 Top Bar', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM(html);
    document = dom.window.document;
  });

  it('should render the app title rogoweb', () => {
    expect(document.body.textContent?.toLowerCase()).toContain('rogoweb');
  });

  it('should render the VT100 logo', () => {
    const logo = document.querySelector('img[alt="logo"]');
    expect(logo).toBeTruthy();
  });

  it('should have 4 status LEDs grouped with logo', () => {
    const ledStrip = document.querySelector('.led-strip');
    expect(ledStrip).toBeTruthy();
    expect(ledStrip?.querySelectorAll('.led').length).toBe(4);
  });

  it('should not have labels for status LEDs', () => {
    const ledStrip = document.querySelector('.led-strip');
    expect(ledStrip?.textContent?.trim()).toBe('');
  });

  it('should have a username input', () => {
    expect(document.getElementById('unix-name')).toBeTruthy();
  });

  it('should have a mode toggle with Manual Play and Rogomatic labels', () => {
    expect(document.getElementById('mode-toggle')).toBeTruthy();
    expect(document.body.textContent).toContain('MANUAL PLAY');
    expect(document.body.textContent).toContain('ROGOMATIC');
  });

  it('should have a start button with text START', () => {
    const btn = document.getElementById('btn-start');
    expect(btn).toBeTruthy();
    expect(btn?.textContent).toBe('START');
  });
});
