// Small fetch wrapper used by the facilitator and offline features.
// It deliberately does not replace Member 1's src/services/api.js. If Member 1
// later wants one shared client, these functions can delegate to it.
//
// Base URL comes from VITE_API_BASE_URL in frontend/.env (see .env.example).

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

export function getApiBaseUrl() {
  const fromEnv = import.meta.env?.VITE_API_BASE_URL;
  return String(fromEnv || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export class ApiError extends Error {
  /**
   * @param {string} message  English developer-facing message.
   * @param {{kind: 'network'|'timeout'|'http'|'invalid-json'|'invalid-data'|'incomplete-profile', status?: number|null, detail?: unknown}} info
   */
  constructor(message, { kind, status = null, detail = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }

  /** True when trying again later could succeed (offline, timeout, server outage). */
  get retryable() {
    if (this.kind === 'network' || this.kind === 'timeout') return true;
    return this.status != null && (this.status >= 500 || this.status === 408 || this.status === 429);
  }
}

/** Turns FastAPI's {"detail": ...} into a short readable string. */
export function describeDetail(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        if (!d || typeof d.msg !== 'string') return '';
        const where = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : '';
        return where ? `${where}: ${d.msg}` : d.msg;
      })
      .filter(Boolean)
      .join('; ');
  }
  return '';
}

/**
 * Sends a JSON request and returns the parsed JSON body.
 * Throws ApiError for network failures, timeouts, non-2xx responses and unreadable JSON.
 */
export async function requestJson(path, { method = 'GET', body, timeoutMs = 10000, fetchImpl, baseUrl } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  const url = `${baseUrl ?? getApiBaseUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let text;
  try {
    response = await doFetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    text = await response.text();
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError('The server took too long to respond.', { kind: 'timeout' });
    }
    throw new ApiError('Cannot reach the server. Check the internet connection.', { kind: 'network' });
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new ApiError('The server sent data that could not be read.', { kind: 'invalid-json', status: response.status });
      }
    }
  }
  if (!response.ok) {
    const readable = describeDetail(data?.detail);
    throw new ApiError(readable || `Server error (${response.status}).`, {
      kind: 'http',
      status: response.status,
      detail: data?.detail ?? null,
    });
  }
  return data;
}

/** Maps any error to a translation key so the UI can show a localised message. */
export function errorMessageKey(error) {
  if (!(error instanceof ApiError)) return 'error.unknown';
  switch (error.kind) {
    case 'network':
      return 'error.network';
    case 'timeout':
      return 'error.timeout';
    case 'invalid-json':
    case 'invalid-data':
      return 'error.badData';
    case 'incomplete-profile':
      return 'error.incompleteProfile';
    default:
      break;
  }
  if (error.status === 404) return 'error.notFound';
  if (error.status === 422) return 'error.invalid';
  if (error.status === 503) return 'error.unavailable';
  return 'error.server';
}
