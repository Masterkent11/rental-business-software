import { randomUUID } from "node:crypto";
import postgres from "postgres";
import sharp from "sharp";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { withUser } from "@/infrastructure/postgres/db.ts";
import { postgresUserRepository } from "@/infrastructure/postgres/repositories/postgres-user.repository.ts";
import { postgresAgentRepository } from "@/infrastructure/postgres/repositories/postgres-agent.repository.ts";
import { postgresListingRepository } from "@/infrastructure/postgres/repositories/postgres-listing.repository.ts";
import { postgresRepresentationRepository } from "@/infrastructure/postgres/repositories/postgres-representation.repository.ts";
import { postgresMarketingRepository } from "@/infrastructure/postgres/repositories/postgres-marketing.repository.ts";
import { partnerListingGate } from "@/application/identity/partner-access.rules.ts";
import { marketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import { loadMarketing } from "@/application/marketing/load-marketing/load-marketing.use-case.ts";
import { saveMarketingDraft } from "@/application/marketing/save-marketing-draft/save-marketing-draft.use-case.ts";
import { duplicateMarketingDraft } from "@/application/marketing/duplicate-marketing-draft/duplicate-marketing-draft.use-case.ts";
import { getMarketingDraft } from "@/application/marketing/get-marketing-draft/get-marketing-draft.use-case.ts";
import { removeMarketingMedia } from "@/application/marketing/remove-marketing-media/remove-marketing-media.use-case.ts";
import { uploadMarketingMedia } from "@/application/marketing/upload-marketing-media/upload-marketing-media.use-case.ts";
import { readMarketingMedia } from "@/application/marketing/read-marketing-media/read-marketing-media.use-case.ts";
import { marketingMediaProcessor } from "@/infrastructure/media/marketing-media-processor.adapter.ts";
import {
  MarketingConflictError,
  MarketingForbiddenError,
  MarketingNotFoundError,
} from "@/domain/marketing/marketing.ts";
import type { Principal } from "@/domain/identity/identity.ts";
import type { MediaStorage } from "@/application/ports/storage/media-storage.port.ts";
const live =
  process.env.TEST_ADMIN_DATABASE_URL &&
  ["127.0.0.1", "localhost"].includes(
    new URL(process.env.TEST_ADMIN_DATABASE_URL).hostname,
  );
const suite = live ? describe : describe.skip;
const A = randomUUID(),
  B = randomUUID(),
  ADMIN = randomUUID();
const principal = (userId = A, agent = true): Principal => ({
  userId,
  displayName: "Agent",
  organizationId: null,
  capabilities: agent ? [{ capability: "AGENT", organizationId: null }] : [],
});
const input = {
  title: "Property content",
  caption: "A place to call home.",
  listingId: null,
  sourcePhotos: [],
  mediaIds: [],
  state: "DRAFT" as const,
};
suite(
  "marketing against isolated PostgreSQL and storage port",
  { timeout: 30000 },
  () => {
    const admin = postgres(process.env.TEST_ADMIN_DATABASE_URL ?? "", {
      max: 1,
    });
    const users = postgresUserRepository(),
      agents = postgresAgentRepository(),
      listings = postgresListingRepository(),
      reps = postgresRepresentationRepository(),
      repo = postgresMarketingRepository();
    const access = marketingAccess(
      agents,
      listings,
      reps,
      partnerListingGate(reps),
      { now: () => new Date() },
    );
    const objects = new Map<string, Buffer>();
    let fail = false;
    let data = "";
    let listingId = "";
    let representationId = "";
    const storage: MediaStorage = {
      async put(items) {
        if (fail) throw new Error("storage down");
        for (const item of items) objects.set(item.path, item.body);
      },
      async createReadUrl(path) {
        return "https://storage.test/private/" + path;
      },
      async removePrefix(prefix) {
        for (const key of objects.keys())
          if (key.startsWith(prefix + "/")) objects.delete(key);
        return 1;
      },
    };
    const upload = uploadMarketingMedia(
      repo,
      storage,
      marketingMediaProcessor(),
      access,
    );
    beforeAll(async () => {
      for (const id of [A, B, ADMIN])
        await users.createProfile({
          id,
          email: id + "@example.test",
          mobile: null,
        });
      await admin`insert into user_capabilities(user_id,capability,source_type) values(${ADMIN},'PLATFORM_ADMIN','PLATFORM')`;
      await admin`insert into app_private.platform_permissions(user_id,permission) values (${ADMIN},'AGENT_REVIEW')`;
      for (const id of [A, B])
        await agents.create(id, {
          displayName: "Marketing Agent",
          headline: "Property advisor",
          bio: "",
          photoUrl: null,
          licenseNumber: "TEST123",
          licenseAuthority: null,
          specialties: [],
          areasServed: [],
          languages: [],
          publicState: "PUBLIC",
        });
      const profile = (await agents.findByUser(A))!;
      await agents.requestVerification(A);
      await agents.decideVerification({
        adminUserId: ADMIN, context:{assuranceLevel:'aal2',purpose:'Synthetic Agent review',requestId:'marketing-review'},
        agentId: profile.id,
        current: "PENDING",
        next: "VERIFIED",
        note: "Isolated test",
      });
      const [listing] = await admin<
        { id: string; organization_id: string }[]
      >`select l.id,l.organization_id from listings l where l.state='PUBLISHED' limit 1`;
      expect(listing).toBeDefined();
      listingId = listing!.id;
      representationId = randomUUID();
      await admin`insert into listing_representations(id,organization_id,listing_id,agent_id,state,can_edit_listing,invited_by,responded_at) values(${representationId},${listing!.organization_id},${listingId},${profile.id},'ACTIVE',true,${A},now())`;
      data = (
        await sharp({
          create: { width: 20, height: 20, channels: 3, background: "#223344" },
        })
          .png()
          .toBuffer()
      ).toString("base64");
    });
    beforeEach(async () => {
      fail = false;
      objects.clear();
      await admin`delete from marketing_drafts where user_id in (${A},${B})`;
      await admin`delete from marketing_media where user_id in (${A},${B})`;
      await admin`update listing_representations set state='ACTIVE',ended_at=null,can_edit_listing=true where id=${representationId}`;
    });
    afterAll(async () => {
      await admin.end();
    });
    const file = () => ({
      fileName: "Room.png",
      contentType: "image/png",
      data,
    });
    it("persists a ready private image only after storage succeeds", async () => {
      const result = await upload(principal(), file());
      expect(result.state).toBe("READY");
      expect(objects.has(result.storagePath)).toBe(true);
      expect((await repo.listMedia(A))[0]!.id).toBe(result.id);
      expect(
        (
          await readMarketingMedia(
            repo,
            storage,
            access,
          )(principal(), result.id)
        ).url,
      ).toContain("/private/");
    });
    it("enforces owner only account and cross Agent denials in application and RLS", async () => {
      await expect(
        loadMarketing(repo, access)(principal(A, false)),
      ).rejects.toBeInstanceOf(MarketingForbiddenError);
      const media = await upload(principal(), file());
      expect(await repo.findMedia(B, media.id)).toBeNull();
      await expect(
        readMarketingMedia(repo, storage, access)(principal(B), media.id),
      ).rejects.toBeInstanceOf(MarketingNotFoundError);
      await expect(
        withUser(
          B,
          (tx) =>
            tx`insert into marketing_media(user_id,file_name,content_type,bytes,storage_path) values(${A},'spoof','image/jpeg',10,${randomUUID()})`,
        ),
      ).rejects.toMatchObject({ code: "42501" });
    });
    it("round trips edits and duplication and rejects lost updates", async () => {
      const media = await upload(principal(), file());
      const draft = await saveMarketingDraft(repo, access)(principal(), {
        ...input,
        mediaIds: [media.id],
      });
      const updated = await saveMarketingDraft(repo, access)(
        principal(),
        { ...input, mediaIds: [media.id], state: "READY_FOR_REVIEW" },
        draft.id,
        draft.version,
      );
      expect(updated.version).toBe(2);
      expect((await repo.findDraft(A, draft.id))!.state).toBe(
        "READY_FOR_REVIEW",
      );
      await expect(
        saveMarketingDraft(repo, access)(principal(), input, draft.id, 1),
      ).rejects.toBeInstanceOf(MarketingConflictError);
      const copy = await duplicateMarketingDraft(repo, access)(
        principal(),
        draft.id,
      );
      expect(copy.id).not.toBe(draft.id);
      expect(copy.state).toBe("DRAFT");
      expect(await repo.findDraft(B, draft.id)).toBeNull();
    });
    it("prevents referencing another Agent media or deleting a referenced asset", async () => {
      const foreign = await upload(principal(B), file());
      await expect(
        saveMarketingDraft(repo, access)(principal(), {
          ...input,
          mediaIds: [foreign.id],
        }),
      ).rejects.toBeInstanceOf(MarketingNotFoundError);
      const media = await upload(principal(), file());
      const draft = await saveMarketingDraft(repo, access)(principal(), {
        ...input,
        mediaIds: [media.id],
      });
      await expect(
        removeMarketingMedia(repo, storage, access)(principal(), media.id),
      ).rejects.toBeInstanceOf(MarketingConflictError);
      await repo.removeDraft(A, draft.id);
      await removeMarketingMedia(repo, storage, access)(principal(), media.id);
      expect(await repo.findMedia(A, media.id)).toBeNull();
      expect(objects.size).toBe(1);
    });
    it("retains a failed upload as failed rather than showing successful media", async () => {
      fail = true;
      await expect(upload(principal(), file())).rejects.toThrow(
        "Upload did not finish",
      );
      const media = (await repo.listMedia(A))[0]!;
      expect(media.state).toBe("FAILED");
      expect(objects.size).toBe(0);
      await expect(
        readMarketingMedia(repo, storage, access)(principal(), media.id),
      ).rejects.toBeInstanceOf(MarketingNotFoundError);
    });
    it("serializes file count quotas and throttles bursts", async () => {
      const outcomes = await Promise.allSettled(
        Array.from({ length: 11 }, () =>
          repo.reserveMedia(A, {
            fileName: "Photo",
            contentType: "image/jpeg",
            bytes: 100,
          }),
        ),
      );
      expect(outcomes.filter((v) => v.status === "fulfilled")).toHaveLength(10);
      expect(outcomes.filter((v) => v.status === "rejected")).toHaveLength(1);
    });
    it("counts unresolved failures against byte quotas", async () => {
      await withUser(
        A,
        (tx) =>
          tx`insert into marketing_media(user_id,file_name,content_type,bytes,storage_path,state,created_at) select ${A},'large','video/mp4',12582912,${A}||'/quota/'||g,'FAILED',now()-interval '2 minutes' from generate_series(1,21) g`,
      );
      await expect(
        repo.reserveMedia(A, {
          fileName: "Photo",
          contentType: "image/jpeg",
          bytes: 8 * 1024 * 1024,
        }),
      ).rejects.toBeInstanceOf(MarketingConflictError);
    });
    it("rechecks property permissions and hides source media after revocation", async () => {
      const before = await access.property(principal(), listingId);
      expect(before.id).toBe(listingId);
      const draft = await saveMarketingDraft(repo, access)(principal(), {
        ...input,
        listingId,
      });
      await admin`update listing_representations set can_edit_listing=false where id=${representationId}`;
      expect(
        (await loadMarketing(repo, access)(principal())).drafts[0],
      ).toMatchObject({ actionRequired: true, sourcePhotos: [] });
      await expect(
        getMarketingDraft(repo, access)(principal(), draft.id),
      ).rejects.toThrow();
      await expect(
        withUser(
          A,
          (tx) =>
            tx`update marketing_drafts set title='Bypass' where id=${draft.id}`,
        ),
      ).rejects.toMatchObject({ code: "42501" });
      expect(
        (
          await saveMarketingDraft(repo, access)(
            principal(),
            input,
            draft.id,
            draft.version,
          )
        ).listingId,
      ).toBeNull();
    });
  },
);
