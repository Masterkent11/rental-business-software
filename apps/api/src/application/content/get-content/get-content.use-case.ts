import type { ContentRepository } from '@/application/ports/repositories/content-repository.port.ts';
import { ContentNotFoundError, type ContentKind, type ContentPage } from '@/domain/content/content.ts';

export const getContentPage =
  (content: ContentRepository) =>
  async (slug: string): Promise<ContentPage> => {
    const page = await content.latest(slug);
    if (!page) throw new ContentNotFoundError('That page does not exist');
    return page;
  };

export const listContentPages =
  (content: ContentRepository) =>
  async (kind: ContentKind): Promise<readonly ContentPage[]> =>
    content.list(kind);
