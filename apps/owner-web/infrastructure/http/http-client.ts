/**
 * Infrastructure HTTP Client
 *
 * Rules:
 * - NO hardcoded fallback values.
 * - Handles authentication headers and transaction-scoped `X-Organization-Id`.
 * - Throws typed HttpError on failure.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class HttpClient {
  private supabaseClient = createClient(env.supabaseUrl, env.supabasePublishableKey);

  async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      organizationId?: string;
    } = {},
  ): Promise<T> {
    const {
      data: { session },
    } = await this.supabaseClient.auth.getSession();

    const headers: Record<string, string> = {
      accept: "application/json",
      ...(session ? { authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.organizationId
        ? { "x-organization-id": options.organizationId }
        : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    };

    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    if (!response.ok) {
      let message = `API request failed with HTTP ${response.status}`;
      let details: unknown = undefined;
      try {
        const problem = (await response.json()) as {
          message?: string;
          title?: string;
          details?: unknown;
        };
        message = problem.message ?? problem.title ?? message;
        details = problem.details ?? problem;
      } catch {
        // Not JSON
      }
      throw new HttpError(message, response.status, details);
    }

    return (await response.json()) as T;
  }
}
