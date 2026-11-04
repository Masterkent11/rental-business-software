import { afterEach, expect, it, vi } from "vitest";
import { supabaseMediaStorage } from "@/infrastructure/storage/supabase-media-storage.adapter.ts";

afterEach(() => vi.unstubAllGlobals());

it("removes every page of a scene prefix, including nested tiles", async () => {
  const prefix = "organization/tour/scene";
  const deleted: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      if (init.method === "DELETE") {
        deleted.push(...body.prefixes);
        return new Response("{}");
      }
      const entries =
        body.prefix === prefix
          ? [
              ...Array.from({ length: 1000 }, (_, n) => ({
                id: String(n),
                name: `file-${n}`,
              })),
              { id: null, name: "tiles" },
            ]
          : [{ id: "nested", name: "tile.webp" }];
      return Response.json(
        entries.slice(body.offset, body.offset + body.limit),
      );
    }),
  );
  const count = await supabaseMediaStorage(
    "https://storage.test",
    "synthetic-key",
  ).removePrefix(prefix);
  expect(count).toBe(1001);
  expect(new Set(deleted).size).toBe(1001);
  expect(deleted).toContain(`${prefix}/tiles/tile.webp`);
});

it("signs private marketing reads without exposing credentials or changing tour defaults", async () => {
  const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
    expect(JSON.parse(init.body as string)).toEqual({ expiresIn: 120 });
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer synthetic-key",
    );
    return Response.json({
      signedURL:
        "/object/sign/marketing-media/actor/file?token=synthetic-ticket",
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const privateStore = supabaseMediaStorage(
    "https://storage.test",
    "synthetic-key",
    "",
    { bucket: "marketing-media", private: true },
  );
  expect(await privateStore.createReadUrl("actor/file")).toBe(
    "https://storage.test/storage/v1/object/sign/marketing-media/actor/file?token=synthetic-ticket",
  );
  expect(fetcher.mock.calls[0]![0]).toContain("/object/sign/marketing-media/");
  expect(
    await supabaseMediaStorage(
      "https://storage.test",
      "synthetic-key",
    ).createReadUrl("tour/file"),
  ).toBe("https://storage.test/storage/v1/object/public/tour-media/tour/file");
});
