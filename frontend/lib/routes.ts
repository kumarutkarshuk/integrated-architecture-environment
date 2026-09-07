/** The public marketing page. Also where sign-out lands. */
export const LANDING_PATH = "/";

/** The signed-in workspace: Projects, canvas, AI panel. */
export const WORKSPACE_PATH = "/workspace";

/** Opens the workspace with one Project selected. */
export function workspacePathForProject(projectId: string): string {
  return `${WORKSPACE_PATH}?project=${projectId}`;
}

/** Sign-in that returns the User to where they were headed. */
export function signInPathFor(redirectPath: string): string {
  return `/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`;
}

/** Sign-up that returns the User to where they were headed. */
export function signUpPathFor(redirectPath: string): string {
  return `/sign-up?redirect_url=${encodeURIComponent(redirectPath)}`;
}
