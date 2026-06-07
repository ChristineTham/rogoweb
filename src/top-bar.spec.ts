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

  it('should render the VT100 badge', () => {
    expect(document.body.textContent).toContain('VT100');
  });

  it('should have 4 status LEDs', () => {
    expect(document.getElementById('led-l1')).toBeTruthy();
    expect(document.getElementById('led-l2')).toBeTruthy();
    expect(document.getElementById('led-l3')).toBeTruthy();
    expect(document.getElementById('led-l4')).toBeTruthy();
  });

  it('should have a username input', () => {
    expect(document.getElementById('unix-name')).toBeTruthy();
  });

  it('should have a mode toggle', () => {
    expect(document.getElementById('mode-toggle')).toBeTruthy();
  });

  it('should have a start button with text START GAME', () => {
    const btn = document.getElementById('btn-start');
    expect(btn).toBeTruthy();
    expect(btn?.textContent).toBe('START GAME');
  });
});
