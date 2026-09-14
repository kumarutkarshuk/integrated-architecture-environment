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
  ownerId: string;
}

export interface ApiInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

export type ApiCollaborator =
  | {
      email: string;
      displayName: string | null;
      role: string;
      status: "joined";
    }
  | {
      email: string;
      displayName: string | null;
      role: string;
      status: "pending";
      inviteId: string;
      sendCount: number;
      canResend: boolean;
      resendAvailableAt: string | null;
    };

export interface ApiAiPreview {
  id: string;
  type?: string;
  prompt: string | null;
  status: string;
  result: {
    records?: Record<string, unknown>;
    markdown?: string;
    gaps_summary?: string;
  } | null;
  appliedAt: string | null;
  createdAt: string;
  rating?: "up" | "down" | null;
}

export type ApiAiJob = ApiAiPreview;
export type RatingValue = "up" | "down";

export function hasAuthorRating(
  job: { rating?: RatingValue | null } | null | undefined,
): job is { rating: RatingValue | null } {
  return Boolean(job && Object.prototype.hasOwnProperty.call(job, "rating"));
}

export interface CreateProjectInput {
  name: string;
  mode: "blank" | "prompt";
  prompt?: string;
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export const SERVER_UNREACHABLE_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (isLikelyNetworkFailure(error)) {
    return SERVER_UNREACHABLE_MESSAGE;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function isLikelyNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      /failed to fetch|networkerror|load failed/i.test(error.message))
  );
}

async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new Error(
      apiErrorMessage(error, SERVER_UNREACHABLE_MESSAGE),
    );
  }

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Ignore non-JSON error bodies.
    }
    throw new Error(message);
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

export function fetchProject(
  token: string,
  projectId: string,
): Promise<ApiProject> {
  return apiFetch<ApiProject>(`/api/projects/${projectId}`, token);
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

export function fetchAiPreviews(
  token: string,
  projectId: string,
): Promise<ApiAiPreview[]> {
  return apiFetch<ApiAiPreview[]>(
    `/api/projects/${projectId}/ai/previews`,
    token,
  );
}

export function regenerateAiPreview(
  token: string,
  projectId: string,
  prompt: string,
): Promise<ApiAiPreview> {
  return apiFetch<ApiAiPreview>(`/api/projects/${projectId}/ai/generate`, token, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function applyAiPreview(
  token: string,
  projectId: string,
  aiGenerationId: string,
): Promise<ApiProject> {
  return apiFetch<ApiProject>(`/api/projects/${projectId}/ai/apply`, token, {
    method: "POST",
    body: JSON.stringify({ aiGenerationId }),
  });
}

export function startExportSpec(
  token: string,
  projectId: string,
): Promise<ApiAiJob> {
  return apiFetch<ApiAiJob>(`/api/projects/${projectId}/ai/export-spec`, token, {
    method: "POST",
  });
}

export function fetchAiJob(
  token: string,
  projectId: string,
  jobId: string,
): Promise<ApiAiJob> {
  return apiFetch<ApiAiJob>(`/api/projects/${projectId}/ai/${jobId}`, token);
}

export function fetchAppliedAiGeneration(
  token: string,
  projectId: string,
): Promise<ApiAiJob> {
  return apiFetch<ApiAiJob>(`/api/projects/${projectId}/ai/applied`, token);
}

export function rateAiGeneration(
  token: string,
  projectId: string,
  jobId: string,
  value: RatingValue,
): Promise<{ value: RatingValue }> {
  return apiFetch<{ value: RatingValue }>(
    `/api/projects/${projectId}/ai/${jobId}/rating`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({ value }),
    },
  );
}

export function createInvite(
  token: string,
  projectId: string,
  email: string,
): Promise<ApiInvite> {
  return apiFetch<ApiInvite>(`/api/projects/${projectId}/invites`, token, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function fetchCollaborators(
  token: string,
  projectId: string,
): Promise<ApiCollaborator[]> {
  return apiFetch<ApiCollaborator[]>(
    `/api/projects/${projectId}/collaborators`,
    token,
  );
}

export function resendInvite(
  token: string,
  projectId: string,
  inviteId: string,
): Promise<ApiInvite> {
  return apiFetch<ApiInvite>(
    `/api/projects/${projectId}/invites/${inviteId}/resend`,
    token,
    { method: "POST" },
  );
}

export function redeemInvite(
  token: string,
  inviteToken: string,
): Promise<{ projectId: string }> {
  return apiFetch<{ projectId: string }>(
    `/api/invites/${inviteToken}/redeem`,
    token,
    { method: "POST" },
  );
}
