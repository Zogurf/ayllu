import type { CommunityFavor, SyncQueueItem } from '../types';

// Only the current account's outbox may override the shared server feed.
// Other accounts' drafts stay cached, but cannot hide an acknowledged publication.
export function mergeFavorFeed(
  cached: CommunityFavor[], remote: CommunityFavor[], queue: SyncQueueItem[], ownerId: string,
): CommunityFavor[] {
  const feed = new Map(remote.map(favor => [favor.id, favor]));
  for (const favor of cached) {
    if (favor.isOfflinePending && !feed.has(favor.id)) feed.set(favor.id, favor);
  }
  // The persistent outbox stores newest first. Replay oldest first.
  for (const item of [...queue].reverse()) {
    if (item.type !== 'favor' || item.ownerUserId !== ownerId) continue;
    const payload = item.payload as CommunityFavor & { action?: string };
    if (payload.action === 'delete') feed.delete(payload.id);
    else feed.set(payload.id, { ...payload, version:(payload.version ?? 0)+1, authorId: ownerId, isOfflinePending: true });
  }
  return [...feed.values()].filter(favor => !favor.isHidden)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
