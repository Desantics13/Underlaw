import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const CONSENT_KEY = 'underlaw_analytics_consent'; // 'granted' | 'denied'

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

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

// Reactiva PostHog en cada carga si el visitante ya había aceptado antes,
// sin volver a mostrarle el banner.
export function initIfConsented() {
  if (getConsent() === 'granted') init();
}

export function grantConsent() {
  try { localStorage.setItem(CONSENT_KEY, 'granted'); } catch { /* localStorage no disponible */ }
  init();
}

export function denyConsent() {
  try { localStorage.setItem(CONSENT_KEY, 'denied'); } catch { /* localStorage no disponible */ }
}

export function track(event, properties) {
  if (!initialized) return;
  posthog.capture(event, properties);
}
