import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const SITE = 'https://christinetham.github.io/rogoweb';

describe('SEO / social-preview metadata (v1.0.0)', () => {
  let document: Document;
  const meta = (sel: string) => document.querySelector(sel)?.getAttribute('content') ?? null;

  beforeEach(() => {
    document = new JSDOM(html).window.document;
  });

  it('has a descriptive title, description and keywords', () => {
    expect(document.querySelector('title')?.textContent).toContain('Rogoweb');
    expect(meta('meta[name="description"]')).toMatch(/Rogue 5\.4\.4/);
    expect(meta('meta[name="keywords"]')).toMatch(/Rog-O-Matic/i);
  });

  it('declares canonical URL, favicon and theme colour', () => {
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE}/`);
    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.svg');
    expect(meta('meta[name="theme-color"]')).toBe('#FE5000');
  });

  it('exposes a complete Open Graph card', () => {
    expect(meta('meta[property="og:type"]')).toBe('website');
    expect(meta('meta[property="og:site_name"]')).toBe('Rogoweb');
    expect(meta('meta[property="og:title"]')).toContain('Rogoweb');
    expect(meta('meta[property="og:description"]')).toBeTruthy();
    expect(meta('meta[property="og:url"]')).toBe(`${SITE}/`);
    expect(meta('meta[property="og:image:alt"]')).toBeTruthy();
  });

  it('points og:image at the dedicated 1200x630 card', () => {
    expect(meta('meta[property="og:image"]')).toBe(`${SITE}/og-image.png`);
    expect(meta('meta[property="og:image:type"]')).toBe('image/png');
    expect(meta('meta[property="og:image:width"]')).toBe('1200');
    expect(meta('meta[property="og:image:height"]')).toBe('630');
  });

  it('exposes a Twitter summary_large_image card on the same asset', () => {
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(meta('meta[name="twitter:title"]')).toContain('Rogoweb');
    expect(meta('meta[name="twitter:image"]')).toBe(`${SITE}/og-image.png`);
    expect(meta('meta[name="twitter:image:alt"]')).toBeTruthy();
  });

  it('no longer references the old screenshot.png as the social image', () => {
    // Guards the "regenerate og:image at optimal dimensions" change from regressing.
    expect(meta('meta[property="og:image"]')).not.toContain('screenshot.png');
    expect(meta('meta[name="twitter:image"]')).not.toContain('screenshot.png');
  });
});

describe('Status-panel additions (v1.0.0)', () => {
  let document: Document;

  beforeEach(() => {
    document = new JSDOM(html).window.document;
  });

  it('renders a gene-pool size stat that starts empty', () => {
    const pool = document.getElementById('stat-pool');
    expect(pool).toBeTruthy();
    expect(pool?.textContent?.trim()).toBe('—');
  });

  it('renders the version/commit footer scaffold', () => {
    expect(document.getElementById('app-version')).toBeTruthy();
    expect(document.getElementById('app-ver')).toBeTruthy();
    const commit = document.getElementById('app-commit') as HTMLAnchorElement | null;
    expect(commit).toBeTruthy();
    // Opens the GitHub commit in a new tab, safely.
    expect(commit?.getAttribute('target')).toBe('_blank');
    expect(commit?.getAttribute('rel')).toContain('noopener');
  });
});
