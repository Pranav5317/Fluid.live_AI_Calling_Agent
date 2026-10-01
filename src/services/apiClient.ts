const BASE_URL = '/api';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const json = await response.json();

    if (!response.ok || (json && json.success === false)) {
      throw new Error(json.error || `API Request failed with status ${response.status}`);
    }

    return json.data as T;
  } catch (error: any) {
    // If backend is not running or network fails, bubble error up cleanly
    throw error;
  }
}

export const apiClient = {
  get: <T>(url: string) => apiFetch<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: any) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: any) => apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
};

