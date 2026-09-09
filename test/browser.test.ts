import { describe, it, expect } from 'vitest';
import { detectBrowser, printGuidance } from '@/lib/browser';

const UA = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  opera: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/100.0.0.0',
  chromeIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
};

describe('browser detection', () => {
  it('identifies each browser from its user agent', () => {
    expect(detectBrowser(UA.chrome)).toBe('chrome');
    expect(detectBrowser(UA.safari)).toBe('safari');
    expect(detectBrowser(UA.firefox)).toBe('firefox');
  });

  it('does not mistake Edge for Chrome', () => {
    // Edge's UA contains "Chrome/140" verbatim; order of checks matters.
    expect(detectBrowser(UA.edge)).toBe('edge');
  });

  it('does not mistake Opera for Chrome', () => {
    expect(detectBrowser(UA.opera)).toBe('other');
  });

  it('treats Chrome on iOS as Safari, because its print path is Safari\'s', () => {
    expect(detectBrowser(UA.chromeIOS)).toBe('safari');
  });

  it('prefers client hints over the user-agent string', () => {
    // A Chromium browser can claim anything in its UA; the brand list is
    // the more reliable signal where it exists.
    expect(detectBrowser(UA.chrome, { brands: [{ brand: 'Microsoft Edge', version: '140' }] })).toBe('edge');
  });

  it('falls back safely on an unknown agent', () => {
    expect(detectBrowser('some crawler/1.0')).toBe('other');
    expect(detectBrowser('')).toBe('other');
  });
});

describe('print guidance', () => {
  it('marks only Chrome as the best match', () => {
    expect(printGuidance('chrome').isBest).toBe(true);
    for (const b of ['edge', 'safari', 'firefox', 'other'] as const) {
      expect(printGuidance(b).isBest).toBe(false);
    }
  });

  it('always tells the student to turn margins off', () => {
    for (const b of ['chrome', 'edge', 'safari', 'firefox', 'other'] as const) {
      expect(printGuidance(b).advice).toMatch(/Margins to None/);
    }
  });

  it('warns the browsers that drop backgrounds by default', () => {
    expect(printGuidance('safari').advice).toMatch(/Print backgrounds/i);
    expect(printGuidance('firefox').advice).toMatch(/Print backgrounds/i);
  });

  it('recommends Chrome to everyone who is not already on it', () => {
    for (const b of ['safari', 'firefox', 'other'] as const) {
      expect(printGuidance(b).advice).toMatch(/Chrome/);
    }
  });
});
