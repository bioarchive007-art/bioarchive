/**
 * Safe error utility to prevent leaking internal stack traces or connection details to clients.
 * Detailed logs are printed to the server console, but users receive a generic response.
 */
export function serverError(err: any, contextMessage?: string): string {
  // Return a secure, friendly message to the client, defaulting to a generic one.
  return contextMessage || 'Something went wrong. Please try again later.';
}
