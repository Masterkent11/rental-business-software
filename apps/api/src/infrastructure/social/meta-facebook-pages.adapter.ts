import { createHmac } from "node:crypto";
import { z } from "zod";
import type { FacebookPagesProvider } from "@/application/ports/providers/facebook-pages.port.ts";
import {
  MarketingConflictError,
  MarketingForbiddenError,
  MarketingUnavailableError,
} from "@/domain/marketing/marketing.ts";

export interface MetaFacebookConfig {
  readonly appId: string;
  readonly appSecret: string;
  readonly apiVersion: string;
  readonly redirectUri: string;
  readonly loginConfigId?: string;
}

const scopes = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
];
const contentTasks = new Set([
  "CREATE_CONTENT",
  "PROFILE_PLUS_CREATE_CONTENT",
  "PROFILE_PLUS_FULL_CONTROL",
]);
const permissionList = z.object({
  data: z.array(z.object({ permission: z.string(), status: z.string() })),
});
const graphError = z.object({ error: z.object({ code: z.number() }) });
const accessToken = z.object({ access_token: z.string().min(1) });
const pageList = z.object({
  data: z.array(
    z.object({
      id: z.string().regex(/^\d{1,64}$/),
      name: z.string().trim().min(1).max(255),
      access_token: z.string().min(1).optional(),
      tasks: z.array(z.string()).default([]),
    }),
  ),
  paging: z
    .object({
      next: z.string().optional(),
      cursors: z.object({ after: z.string().optional() }).optional(),
    })
    .optional(),
});

export function metaFacebookPages(
  config: MetaFacebookConfig,
  request = fetch,
): FacebookPagesProvider {
  const graph = `https://graph.facebook.com/${config.apiVersion}`;
  async function get<T>(
    url: URL,
    schema: z.ZodType<T>,
    signal: AbortSignal,
    token?: string,
  ): Promise<T> {
    const unavailable = () =>
      new MarketingUnavailableError(
        "Facebook could not complete the connection. Try connecting again.",
      );
    let errorCode: number | undefined;
    try {
      const response = await request(url, {
        signal,
        redirect: "error",
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      });
      if (response.ok) return schema.parse(await response.json());
      const error = graphError.safeParse(await response.json());
      if (error.success) errorCode = error.data.error.code;
    } catch {
      throw unavailable();
    }
    if (errorCode === 190 || errorCode === 102) {
      throw new MarketingConflictError(
        "Your Facebook authorization expired or was revoked. Connect Facebook again.",
      );
    }
    throw unavailable();
  }

  return {
    authorizationUrl(state) {
      const url = new URL(
        `https://www.facebook.com/${config.apiVersion}/dialog/oauth`,
      );
      url.search = new URLSearchParams({
        client_id: config.appId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        ...(config.loginConfigId
          ? { config_id: config.loginConfigId }
          : { scope: scopes.join(",") }),
        state,
      }).toString();
      return url.toString();
    },
    async eligiblePages(code) {
      const signal = AbortSignal.timeout(15_000);
      const exchange = new URL(`${graph}/oauth/access_token`);
      exchange.search = new URLSearchParams({
        client_id: config.appId,
        client_secret: config.appSecret,
        redirect_uri: config.redirectUri,
        code,
      }).toString();
      const short = await get(exchange, accessToken, signal);
      exchange.search = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: config.appId,
        client_secret: config.appSecret,
        fb_exchange_token: short.access_token,
      }).toString();
      const session = await get(exchange, accessToken, signal);
      const proof = createHmac("sha256", config.appSecret)
        .update(session.access_token)
        .digest("hex");
      const permissions = new URL(`${graph}/me/permissions`);
      permissions.searchParams.set("appsecret_proof", proof);
      const granted = await get(
        permissions,
        permissionList,
        signal,
        session.access_token,
      );
      if (
        !scopes.every((scope) =>
          granted.data.some(
            ({ permission, status }) =>
              permission === scope && status === "granted",
          ),
        )
      ) {
        throw new MarketingForbiddenError(
          "Facebook did not grant all required Page permissions. Check the Facebook login configuration and reconnect.",
        );
      }
      const accounts = new URL(`${graph}/me/accounts`);
      accounts.search = new URLSearchParams({
        fields: "id,name,access_token,tasks",
        limit: "100",
        appsecret_proof: proof,
      }).toString();
      const pages = new Map<
        string,
        { id: string; name: string; token: string }
      >();
      for (let batch = 0; batch < 5; batch++) {
        const result = await get(
          accounts,
          pageList,
          signal,
          session.access_token,
        );
        for (const page of result.data) {
          if (
            page.access_token &&
            page.tasks.some((task) => contentTasks.has(task))
          ) {
            pages.set(page.id, {
              id: page.id,
              name: page.name,
              token: page.access_token,
            });
          }
        }
        const cursor = result.paging?.cursors?.after;
        if (
          !result.paging?.next ||
          !cursor ||
          cursor === accounts.searchParams.get("after")
        )
          break;
        accounts.searchParams.set("after", cursor);
      }
      return [...pages.values()];
    },
  };
}
