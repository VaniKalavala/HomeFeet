export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'https://homefeet25.onrender.com';
export const API_BASE = `${API_ORIGIN}/api`;

export const api = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token'); // Or use a context/state if available

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
};
