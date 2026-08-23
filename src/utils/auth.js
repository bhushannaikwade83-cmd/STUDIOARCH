// JWT Token Management

const TOKEN_KEY = 'studioarch_jwt_token';
const API_BASE = 'https://digitrixmedia.com/studioarch/api';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  console.log('✅ [Auth] Token saved');
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  console.log('✅ [Auth] Token removed');
}

export function isAuthenticated() {
  return !!getToken();
}

export async function login(email, password) {
  try {
    console.log('🔐 [Auth] Logging in:', email);
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const { token, user } = await response.json();
    setToken(token);
    console.log('✅ [Auth] Login successful');
    return { success: true, user };
  } catch (error) {
    console.error('❌ [Auth] Login error:', error.message);
    return { success: false, error: error.message };
  }
}

export function logout() {
  removeToken();
  console.log('✅ [Auth] Logged out');
}
