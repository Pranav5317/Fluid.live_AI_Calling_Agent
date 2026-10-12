const BASE_URL = '/api';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const text = await response.text();

    let json: any = {};
    if (text && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response from server (Status ${response.status}): ${text.substring(0, 100)}`);
      }
    }

    if (!response.ok || (json && json.success === false)) {
      throw new Error(json.error || `Server request failed with status ${response.status}. Make sure the Express backend server is running.`);
    }

    return (json.data !== undefined ? json.data : json) as T;
  } catch (error: any) {
    // If backend is offline or returned bad response, bubble clean error message
    throw error;
  }
}

export const apiClient = {
  get: <T>(url: string) => apiFetch<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: any) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: any) => apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => apiFetch<T>(url, { method: 'DELETE' }),
};

