import type postgres from "postgres";
import { randomUUID } from "node:crypto";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import { withUser } from "@/infrastructure/postgres/db.ts";
import {
  MEDIA_QUOTA_BYTES,
  MEDIA_QUOTA_COUNT,
  MarketingConflictError,
  MarketingNotFoundError,
  MarketingUnavailableError,
  type MarketingMedia,
  type MarketingDraft,
  type DraftState,
  type MediaState,
} from "@/domain/marketing/marketing.ts";
type Tx = postgres.TransactionSql;
interface MediaRow {
  id: string;
  file_name: string;
  content_type: string;
  bytes: string;
  storage_path: string;
  state: MediaState;
  created_at: Date;
}
interface DraftRow {
  id: string;
  title: string;
  caption: string;
  listing_id: string | null;
  source_photos: string[];
  media_ids: string[];
  state: DraftState;
  version: number;
  updated_at: Date;
}
const media = (r: MediaRow): MarketingMedia => ({
  id: r.id,
  fileName: r.file_name,
  contentType: r.content_type,
  bytes: Number(r.bytes),
  storagePath: r.storage_path,
  state: r.state,
  createdAt: r.created_at.toISOString(),
});
const draft = (r: DraftRow): MarketingDraft => ({
  id: r.id,
  title: r.title,
  caption: r.caption,
  listingId: r.listing_id,
  sourcePhotos: r.source_photos,
  mediaIds: r.media_ids,
  state: r.state,
  version: r.version,
  updatedAt: r.updated_at.toISOString(),
});
async function run<T>(
  userId: string,
  work: (tx: Tx) => Promise<T>,
): Promise<T> {
  try {
    return await withUser(userId, work);
  } catch (error) {
    if (["42P01", "42703"].includes((error as { code?: string }).code ?? ""))
      throw new MarketingUnavailableError(
        "Marketing setup is not available in this environment yet.",
      );
    throw error;
  }
}
const draftSelect = (tx: Tx) =>
  tx`select d.*,array(select dm.media_id::text from marketing_draft_media dm where dm.draft_id=d.id order by dm.position) as media_ids from marketing_drafts d`;
export function postgresMarketingRepository(): MarketingRepository {
  return {
    async listMedia(userId) {
      return run(userId, async (tx) =>
        (
          await tx<
            MediaRow[]
          >`select * from marketing_media where user_id=${userId} order by created_at desc limit 100`
        ).map(media),
      );
    },
    async findMedia(userId, id) {
      return run(userId, async (tx) => {
        const [row] = await tx<
          MediaRow[]
        >`select * from marketing_media where id=${id} and user_id=${userId}`;
        return row ? media(row) : null;
      });
    },
    async reserveMedia(userId, input) {
      return run(userId, async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${userId}, 114))`;
        const [usage] = await tx<
          { count: string; bytes: string; recent: string }[]
        >`select count(*)::text as count,coalesce(sum(bytes),0)::text as bytes, count(*) filter(where created_at>now()-interval '1 minute')::text as recent from marketing_media where user_id=${userId}`;
        if (
          Number(usage!.recent) >= 10 ||
          Number(usage!.count) >= MEDIA_QUOTA_COUNT ||
          Number(usage!.bytes) + input.bytes > MEDIA_QUOTA_BYTES
        )
          throw new MarketingConflictError(
            "Your media library limit is reached. Remove unused files first.",
          );
        const id = randomUUID();
        const storagePath = `${userId}/${id}/original.${input.contentType === "video/mp4" ? "mp4" : "jpg"}`;
        const [row] = await tx<
          MediaRow[]
        >`insert into marketing_media(id,user_id,file_name,content_type,bytes,storage_path) values(${id},${userId},${input.fileName},${input.contentType},${input.bytes},${storagePath}) returning *`;
        return media(row!);
      });
    },
    async setMediaState(userId, id, state) {
      await run(userId, async (tx) => {
        await tx`update marketing_media set state=${state} where id=${id} and user_id=${userId}`;
      });
    },
    async beginMediaRemoval(userId, id) {
      return run(userId, async (tx) => {
        const [row] = await tx<
          MediaRow[]
        >`select * from marketing_media where id=${id} and user_id=${userId} for update`;
        if (!row) throw new MarketingNotFoundError("Media not found.");
        const [used] =
          await tx`select 1 from marketing_draft_media where media_id=${id} limit 1`;
        if (used)
          throw new MarketingConflictError(
            "Remove this media from its drafts before deleting it.",
          );
        await tx`update marketing_media set state='DELETING' where id=${id} and user_id=${userId}`;
        return media(row);
      });
    },
    async removeMedia(userId, id) {
      await run(userId, async (tx) => {
        await tx`delete from marketing_media where id=${id} and user_id=${userId} and state='DELETING'`;
      });
    },
    async listDrafts(userId) {
      return run(userId, async (tx) =>
        (
          await tx<
            DraftRow[]
          >`${draftSelect(tx)} where d.user_id=${userId} order by d.updated_at desc limit 200`
        ).map(draft),
      );
    },
    async findDraft(userId, id) {
      return run(userId, async (tx) => {
        const [row] = await tx<
          DraftRow[]
        >`${draftSelect(tx)} where d.id=${id} and d.user_id=${userId}`;
        return row ? draft(row) : null;
      });
    },
    async saveDraft(userId, input, id, version) {
      return run(userId, async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${userId}, 114))`;
        if (id) {
          const [current] = await tx<
            { version: number }[]
          >`select version from marketing_drafts where id=${id} and user_id=${userId} for update`;
          if (!current) throw new MarketingNotFoundError("Draft not found.");
          if (current.version !== version)
            throw new MarketingConflictError(
              "This draft changed. Reload it before saving.",
            );
        } else {
          const [count] = await tx<
            { n: string }[]
          >`select count(*)::text as n from marketing_drafts where user_id=${userId}`;
          if (Number(count!.n) >= 200)
            throw new MarketingConflictError(
              "Your draft limit is reached. Remove unused drafts first.",
            );
        }
        if (input.mediaIds.length) {
          const selected = await tx<
            { id: string }[]
          >`select id from marketing_media where user_id=${userId} and id in ${tx(input.mediaIds as string[])} and state='READY' order by id for update`;
          if (selected.length !== input.mediaIds.length)
            throw new MarketingNotFoundError(
              "Select ready media from your own library.",
            );
        }
        const [row] = id
          ? await tx<
              { id: string }[]
            >`update marketing_drafts set title=${input.title},caption=${input.caption},listing_id=${input.listingId},source_photos=${tx.array(input.sourcePhotos as string[])},state=${input.state},version=version+1,updated_at=now() where id=${id} and user_id=${userId} returning id`
          : await tx<
              { id: string }[]
            >`insert into marketing_drafts(user_id,title,caption,listing_id,source_photos,state) values(${userId},${input.title},${input.caption},${input.listingId},${tx.array(input.sourcePhotos as string[])},${input.state}) returning id`;
        const draftId = row!.id;
        await tx`delete from marketing_draft_media where draft_id=${draftId} and user_id=${userId}`;
        for (const [position, mediaId] of input.mediaIds.entries())
          await tx`insert into marketing_draft_media(draft_id,media_id,user_id,position) values(${draftId},${mediaId},${userId},${position})`;
        const [saved] = await tx<
          DraftRow[]
        >`${draftSelect(tx)} where d.id=${draftId}`;
        return draft(saved!);
      });
    },
    async removeDraft(userId, id) {
      await run(userId, async (tx) => {
        const rows =
          await tx`delete from marketing_drafts where id=${id} and user_id=${userId} returning id`;
        if (!rows.length) throw new MarketingNotFoundError("Draft not found.");
      });
    },
  };
}
