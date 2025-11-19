import { API_BASE_URL } from './apiConfig';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
};

async function apiRequest(path: string, token: string, options: RequestOptions = {}) {
  const { method = 'GET', body } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const json = await response.json();
      if (json?.message) message = json.message;
    } catch {
      // ignore parse errors
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function apiGet(path: string, token: string) {
  return apiRequest(path, token);
}

export function apiPost(path: string, token: string, body: any) {
  return apiRequest(path, token, { method: 'POST', body });
}

export function apiPut(path: string, token: string, body: any) {
  return apiRequest(path, token, { method: 'PUT', body });
}

export function apiPatch(path: string, token: string, body: any) {
  return apiRequest(path, token, { method: 'PATCH', body });
}

export function apiDelete(path: string, token: string) {
  return apiRequest(path, token, { method: 'DELETE' });
}
