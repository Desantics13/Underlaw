import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const CONSENT_KEY = 'underlaw_analytics_consent'; // JSON { status: 'granted'|'denied', expiresAt: number }
const CONSENT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 meses: pasado esto, se vuelve a preguntar

let initialized = false;

function init() {
  if (initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    // Autocapture genera mucho ruido (clicks/inputs genéricos); en vez de eso
    // mandamos eventos explícitos del embudo de compra (ver track() abajo).
    autocapture: false
  });
  initialized = true;
}

// Devuelve 'granted' | 'denied' | null (sin decisión, o decisión vencida —
// pasados los 6 meses se trata igual que si nunca hubiera decidido, así el
// banner vuelve a aparecer y se refresca el consentimiento periódicamente).
export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const { status, expiresAt } = JSON.parse(raw);
    if (!expiresAt || Date.now() > expiresAt) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    return status;
  } catch {
    return null;
  }
}

function saveConsent(status) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ status, expiresAt: Date.now() + CONSENT_TTL_MS }));
  } catch { /* localStorage no disponible */ }
}

// Reactiva PostHog en cada carga si el visitante ya había aceptado antes,
// sin volver a mostrarle el banner.
export function initIfConsented() {
  if (getConsent() === 'granted') init();
}

export function grantConsent() {
  saveConsent('granted');
  init();
}

export function denyConsent() {
  saveConsent('denied');
}

export function track(event, properties) {
  if (!initialized) return;
  posthog.capture(event, properties);
}
