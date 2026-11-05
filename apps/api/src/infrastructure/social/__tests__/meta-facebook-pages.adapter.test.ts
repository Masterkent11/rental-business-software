import { expect, it, vi } from "vitest";
import { MarketingForbiddenError } from "@/domain/marketing/marketing.ts";
import { metaFacebookPages } from "@/infrastructure/social/meta-facebook-pages.adapter.ts";

it("reports declined Page permissions before requesting managed Pages", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ access_token: "short" }))
    .mockResolvedValueOnce(Response.json({ access_token: "long" }))
    .mockResolvedValueOnce(
      Response.json({
        data: [
          { permission: "pages_show_list", status: "granted" },
          { permission: "pages_read_engagement", status: "granted" },
          { permission: "pages_manage_posts", status: "declined" },
        ],
      }),
    );
  const provider = metaFacebookPages(
    {
      appId: "1234",
      appSecret: "synthetic-app-secret",
      apiVersion: "v25.0",
      redirectUri: "https://owner.example/agent/marketing/facebook/callback",
      loginConfigId: "5678",
    },
    request,
  );

  await expect(provider.eligiblePages("test-code")).rejects.toBeInstanceOf(
    MarketingForbiddenError,
  );
  const paths = request.mock.calls.map(([input]) => new URL(String(input)).pathname);
  expect(paths).toEqual([
    "/v25.0/oauth/access_token",
    "/v25.0/oauth/access_token",
    "/v25.0/me/permissions",
  ]);
});

it("prompts the Agent to reconnect when Meta rejects an expired authorization", async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValueOnce(
    Response.json({ error: { code: 190, message: "private provider detail" } }, { status: 400 }),
  );
  const provider = metaFacebookPages({
    appId: "1234",
    appSecret: "synthetic-app-secret",
    apiVersion: "v25.0",
    redirectUri: "https://owner.example/agent/marketing/facebook/callback",
  }, request);

  await expect(provider.eligiblePages("expired-code")).rejects.toThrow(
    "Your Facebook authorization expired or was revoked. Connect Facebook again.",
  );
  expect(request).toHaveBeenCalledTimes(1);
});
