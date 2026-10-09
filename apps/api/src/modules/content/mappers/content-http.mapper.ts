import type { ContentPage, PolicyAcceptance } from '@/domain/content/content.ts';

export const toContentPageHttpResponse = (page: ContentPage) => ({
  slug: page.slug,
  version: page.version,
  kind: page.kind,
  title: page.title,
  summary: page.summary,
  body: page.body.trim(),
  status: page.status,
  requiresAcceptance: page.requiresAcceptance,
  effectiveOn: page.effectiveOn,
});

export const toContentSummaryHttpResponse = (page: ContentPage) => ({
  slug: page.slug,
  version: page.version,
  kind: page.kind,
  title: page.title,
  summary: page.summary,
  status: page.status,
  requiresAcceptance: page.requiresAcceptance,
});

export const toAcceptanceHttpResponse = (acceptance: PolicyAcceptance) => ({
  slug: acceptance.slug,
  version: acceptance.version,
  context: acceptance.context,
  relatedId: acceptance.relatedId,
  acceptedAt: acceptance.acceptedAt.toISOString(),
});
