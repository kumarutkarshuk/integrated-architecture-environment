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

export interface CreateProjectInput {
  name: string;
  mode: "blank";
}

export function getApiBaseUrl(): string {
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchCurrentUser(token: string): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/users/me", token);
}

export function fetchProjects(token: string): Promise<ApiProject[]> {
  return apiFetch<ApiProject[]>("/api/projects", token);
}

export function createProject(
  token: string,
  input: CreateProjectInput,
): Promise<ApiProject> {
  return apiFetch<ApiProject>("/api/projects", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteProject(
  token: string,
  projectId: string,
): Promise<void> {
  return apiFetch<void>(`/api/projects/${projectId}`, token, {
    method: "DELETE",
  });
}
