import { env } from "../config/env";
import { currentAccessToken } from "../supabase/browser-client";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const FRIENDLY: Record<number, string> = {
  401: "Your session has expired. Please sign in again.",
  403: "You don't have access to this organization.",
  404: "We couldn't find that. It may have been removed.",
  413: "That file is too large.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "The server is unavailable right now. Please try again.",
  503: "The server is busy right now. Please try again.",
};

export class HttpClient {
  async request<T>(
    path: string,
    options: { method?: string; body?: unknown; organizationId?: string; signal?: AbortSignal } = {},
  ): Promise<T> {
    const token = await currentAccessToken();
    let response: Response;
    try {
      response = await fetch(`${env.apiBaseUrl}${path}`, {
        method: options.method ?? "GET",
        headers: {
          accept: "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(options.organizationId ? { "x-organization-id": options.organizationId } : {}),
          ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
        cache: "no-store",
      });
    } catch {
      throw new HttpError("Can't reach the server. Check your connection and try again.", 0, "NETWORK");
    }

    if (!response.ok) {
      let message = FRIENDLY[response.status] ?? "Request failed. Please try again.";
      let code: string | null = null;
      let details: string[] = [];
      try {
        const problem = (await response.json()) as {
          message?: string;
          title?: string;
          code?: string;
          problems?: string[];
        };
        code = problem.code ?? null;
        details = problem.problems ?? [];
        const candidate = problem.message ?? problem.title;
        if (candidate && response.status < 500 && response.status !== 401) message = candidate;
      } catch {
        message = FRIENDLY[response.status] ?? message;
      }
      throw new HttpError(message, response.status, code, details);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
