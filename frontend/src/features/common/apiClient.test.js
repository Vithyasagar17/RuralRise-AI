import { describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../test/helpers.js';
import { ApiError, describeDetail, errorMessageKey, getApiBaseUrl, requestJson } from './apiClient.js';

describe('apiClient', () => {
  it('uses the default base URL without a trailing slash', () => {
    expect(getApiBaseUrl()).toMatch(/^https?:\/\/[^/].*[^/]$/);
  });

  it('returns parsed JSON and sends JSON bodies with Content-Type', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: 1 }));
    const data = await requestJson('/progress', { method: 'POST', body: { a: 1 }, fetchImpl, baseUrl: 'http://x' });
    expect(data).toEqual({ ok: 1 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://x/progress');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe('{"a":1}');
  });

  it('turns a network failure into a retryable network error', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    const error = await requestJson('/health', { fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('network');
    expect(error.retryable).toBe(true);
    expect(errorMessageKey(error)).toBe('error.network');
  });

  it('turns a timeout into a timeout error', async () => {
    const fetchImpl = vi.fn((url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const error = await requestJson('/health', { fetchImpl, timeoutMs: 10 }).catch((e) => e);
    expect(error.kind).toBe('timeout');
    expect(error.retryable).toBe(true);
  });

  it('reads FastAPI validation errors (422) and marks them not retryable', async () => {
    const detail = [{ loc: ['body', 'score'], msg: 'Input should be a valid integer', type: 'int_type' }];
    const fetchImpl = vi.fn(async () => jsonResponse({ detail }, 422));
    const error = await requestJson('/progress', { method: 'POST', body: {}, fetchImpl }).catch((e) => e);
    expect(error.status).toBe(422);
    expect(error.message).toBe('score: Input should be a valid integer');
    expect(error.retryable).toBe(false);
    expect(errorMessageKey(error)).toBe('error.invalid');
  });

  it('marks 503 as retryable and 404 as not retryable', async () => {
    const e503 = await requestJson('/courses', { fetchImpl: async () => jsonResponse({ detail: 'down' }, 503) }).catch((e) => e);
    const e404 = await requestJson('/courses', { fetchImpl: async () => jsonResponse({ detail: 'Unknown student_id.' }, 404) }).catch((e) => e);
    expect(e503.retryable).toBe(true);
    expect(errorMessageKey(e503)).toBe('error.unavailable');
    expect(e404.retryable).toBe(false);
    expect(e404.message).toBe('Unknown student_id.');
  });

  it('rejects a 200 response that is not JSON', async () => {
    const fetchImpl = async () => new Response('<html>oops</html>', { status: 200 });
    const error = await requestJson('/courses', { fetchImpl }).catch((e) => e);
    expect(error.kind).toBe('invalid-json');
    expect(errorMessageKey(error)).toBe('error.badData');
  });

  it('describeDetail handles strings, arrays and junk', () => {
    expect(describeDetail('x')).toBe('x');
    expect(describeDetail([{ loc: ['body'], msg: 'Field required' }])).toBe('Field required');
    expect(describeDetail({ weird: true })).toBe('');
    expect(errorMessageKey(new Error('plain'))).toBe('error.unknown');
  });
});
