// Test helpers: fake backend responses and a fresh IndexedDB per test.
import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';
import { resetOfflineDbConnectionForTests } from '../features/offline/offlineDb.js';
import {
  MOCK_COURSES,
  MOCK_FACILITATOR_RESPONSE,
  MOCK_OPPORTUNITIES,
  MOCK_RECOMMENDATIONS,
} from '../features/facilitator/facilitatorMockData.js';

export function jsonResponse(body, status = 200) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A fresh, empty IndexedDB for every test. */
export async function freshIndexedDb() {
  await resetOfflineDbConnectionForTests();
  globalThis.indexedDB = new IDBFactory();
}

const networkError = () => Promise.reject(new TypeError('Failed to fetch'));

/**
 * Fake fetch that answers like Member 3's backend.
 * overrides: { 'GET /courses': fn | response | 'offline' }
 */
export function fakeBackend(overrides = {}) {
  const defaults = {
    'GET /facilitator/students': () => jsonResponse(MOCK_FACILITATOR_RESPONSE),
    'GET /courses': () => jsonResponse(MOCK_COURSES),
    'GET /opportunities': () => jsonResponse(MOCK_OPPORTUNITIES),
    'POST /recommendations': () => jsonResponse(MOCK_RECOMMENDATIONS),
    'POST /progress': (init) => {
      const body = JSON.parse(init.body);
      return jsonResponse({ saved: true, progress: { ...body, updated_at: '2026-10-18T10:00:00+00:00' } });
    },
  };
  const routes = { ...defaults, ...overrides };
  return vi.fn(async (url, init = {}) => {
    const path = new URL(url).pathname;
    const handler = routes[`${init.method || 'GET'} ${path}`];
    if (handler === 'offline') return networkError();
    if (!handler) return jsonResponse({ detail: 'Not Found' }, 404);
    return typeof handler === 'function' ? handler(init) : handler;
  });
}

export const offlineFetch = vi.fn(networkError);
