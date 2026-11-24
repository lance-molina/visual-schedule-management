// api.js: the ONLY file in the frontend that calls fetch().
// Pages and components call the named functions at the bottom, never fetch() directly.
// Contract: docs/api.md.

import { API_BASE_URL } from "./config.js";

const TOKEN_KEY = "vs_token";   // localStorage holds only the token and a settings cache

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } };
export const clearToken = () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

/**
 * One request wrapper. Attaches the token, parses JSON, and converts failures to
 * { status, code, message, fields } so every page handles errors the same way.
 * A 401 on an authenticated call clears the token and sends the user to the login page.
 */
export async function request(method, path, { body, query, auth = true } = {}) {
  const url = new URL(API_BASE_URL + path);
  if (query) Object.entries(query).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw { status: 0, code: "network_error", message: "Cannot reach the server. Check your connection.", fields: {} };
  }

  if (res.status === 401 && auth) {
    clearToken();
    window.location.href = "index.html?expired=1";
    throw { status: 401, code: "unauthorized", message: "Session expired.", fields: {} };
  }
  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }

  if (!res.ok) {
    const e = (data && data.error) || {};
    throw { status: res.status, code: e.code || "error", message: e.message || "Something went wrong.", fields: e.fields || {} };
  }
  return data;
}

// ---- One function per endpoint ----
export const auth = {
  register: (payload) => request("POST", "/api/auth/register", { body: payload, auth: false }),
  login:    (payload) => request("POST", "/api/auth/login",    { body: payload, auth: false }),
  me:       ()        => request("GET",  "/api/auth/me"),
  updateMe: (payload) => request("PATCH", "/api/auth/me", { body: payload }),
};

export const children = {
  list:   (query)        => request("GET", "/api/children", { query }),
  get:    (id)           => request("GET", `/api/children/${id}`),
  create: (payload)      => request("POST", "/api/children", { body: payload }),
  update: (id, payload)  => request("PUT", `/api/children/${id}`, { body: payload }),
  remove: (id)           => request("DELETE", `/api/children/${id}`),
};

export const schedules = {
  forChild: (childId, query) => request("GET", `/api/schedules/${childId}`, { query }),
  create:   (payload)        => request("POST", "/api/schedules", { body: payload }),
  update:   (id, payload)    => request("PUT", `/api/schedules/${id}`, { body: payload }),
  remove:   (id)             => request("DELETE", `/api/schedules/${id}`),
};

// Online speech (Edge voices through the backend). Returns an audio Blob; rejects when the server cannot make it,
// and the caller then uses the browser voice. Kept here because api.js is the only file that calls fetch().
export const speech = {
  async say(text, lang, rate) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(new URL(API_BASE_URL + "/api/speech"), {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(rate === undefined ? { text, lang } : { text, lang, rate }),
      });
      if (!res.ok) throw { status: res.status, code: "speech_unavailable", message: "Online speech is not available.", fields: {} };
      return await res.blob();
    } finally { clearTimeout(timer); }
  },
};

export const tasks = {
  forSchedule: (scheduleId, query) => request("GET", `/api/tasks/${scheduleId}`, { query }),
  create:      (payload)           => request("POST", "/api/tasks", { body: payload }),
  update:      (id, payload)       => request("PUT", `/api/tasks/${id}`, { body: payload }),
  remove:      (id)                => request("DELETE", `/api/tasks/${id}`),
  complete:    (id)                => request("PATCH", `/api/tasks/${id}/complete`),
};

export const cards = {
  list:   (query)       => request("GET", "/api/cards", { query }),
  create: (payload)     => request("POST", "/api/cards", { body: payload }),
  update: (id, payload) => request("PUT", `/api/cards/${id}`, { body: payload }),
  remove: (id)          => request("DELETE", `/api/cards/${id}`),
};

export const dashboard = {
  summary: (today) => request("GET", "/api/dashboard/summary", { query: { today } }),
};

export const progress = {
  get: (query) => request("GET", "/api/progress", { query }),   // child_id, range, today
};

export const health = () => request("GET", "/health", { auth: false });
