-- Keep `subtree` correct without anyone having to remember.
--
-- The pre-order interval is what makes the nesting rule enforceable (I-01,
-- ADR-0005), and it was maintained by calling `rebuild_resource_paths()` by
-- hand. That is a footgun with two sharp ends:
--
--   * Forget it on a fresh database and the NOT NULL fails, which is loud and
--     survivable — it is how this defect was found.
--   * Get a *stale* interval and a child stops overlapping its parent, so the
--     exclusion constraint no longer sees the conflict. That one is silent, and
--     it is a double-booking.
--
-- So the database maintains it. At pilot scale a tree is tens of rows and the
-- rebuild is trivial; if inventory ever reaches a size where recomputing on
-- every write hurts, the granularity changes, not the mechanism.

/**
 * A provisional self-only interval, so NOT NULL holds at insert time.
 *
 * Immediately corrected by the statement-level rebuild below. It is deliberately
 * self-only rather than something wider: if the rebuild somehow did not run, a
 * too-narrow interval under-matches and refuses nothing extra, while a too-wide
 * one would block unrelated inventory.
 */
create or replace function resource_provisional_subtree() returns trigger
language plpgsql as $$
begin
  if new.subtree is null then
    new.subtree := int4range(1, 1, '[]');
  end if;
  return new;
end $$;

create trigger resource_subtree_default
  before insert on rentable_resources
  for each row execute function resource_provisional_subtree();

/** Recompute every tree after any change to the shape of one. */
create or replace function resource_subtree_rebuild() returns trigger
language plpgsql as $$
begin
  perform rebuild_resource_paths();
  return null;
end $$;

create trigger resource_subtree_maintain
  after insert or update of parent_id, root_id or delete on rentable_resources
  for each statement execute function resource_subtree_rebuild();
