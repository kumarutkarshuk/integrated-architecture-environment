export interface ApiUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface ApiProject {
  id: string;
  name: string;
  mode: string;
  status: string;
  createdAt: string;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchCurrentUser(token: string): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/users/me", token);
}

export function fetchProjects(token: string): Promise<ApiProject[]> {
  return apiFetch<ApiProject[]>("/api/projects", token);
}
