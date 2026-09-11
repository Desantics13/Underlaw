// URL del backend, centralizada acá para no repetirla en cada archivo.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TOKEN_KEY = 'underlaw_admin_token';

export const getAdminToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setAdminToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
export const clearAdminToken = () => sessionStorage.removeItem(TOKEN_KEY);

// Evento global para avisar que la sesión del Admin ya no es válida (token
// ausente o el backend respondió 401), sin que cada componente que llama a
// adminFetch tenga que conocer el estado de autenticación de Admin.jsx.
const SESSION_EXPIRED_EVENT = 'admin-session-expired';

export const onAdminSessionExpired = (handler) => {
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
};

// fetch con el token del Admin ya adjunto (Authorization: Bearer <token>).
// Si el backend responde 401, limpia la sesión y dispara el evento de arriba
// para que Admin.jsx vuelva a la pantalla de login.
export const adminFetch = async (path, options = {}) => {
  const token = getAdminToken();
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token || ''}` };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAdminToken();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  return res;
};
