import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './helpers/load-store.mjs';
const { recentConversations, bookingTrend } = loadSource('components/owner/dashboard-view-model.ts');
import { conversations, analytics } from './fixtures/owner-dashboard.mjs';

test('recent conversations sort, exclude empty threads and deduplicate without mutating input', () => {
  const input = [...conversations].reverse();
  input.push(conversations[0]);
  const original = [...input];
  const recent = recentConversations(input);
  assert.deepEqual(recent.map(item => item.id), conversations.slice(0, 4).map(item => item.id));
  assert.deepEqual(input, original);
  assert.equal(recentConversations(input, 2).length, 2);
});

test('booking trend preserves missing data and calculates only the supplied weekly window', () => {
  assert.equal(bookingTrend(null), null);
  const input = {...analytics, weekly: [...analytics.weekly].reverse()};
  const original = [...input.weekly];
  assert.deepEqual(bookingTrend(input), {total: 8, values: analytics.weekly.map(item => item.bookings)});
  assert.deepEqual(input.weekly, original);
  assert.deepEqual(bookingTrend({...analytics, weekly: []}), {total: 0, values: []});
});
