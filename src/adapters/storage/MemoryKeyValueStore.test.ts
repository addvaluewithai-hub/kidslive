import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from './MemoryKeyValueStore';

describe('MemoryKeyValueStore', () => {
  it('stores and retrieves values', async () => {
    const store = new MemoryKeyValueStore();

    await store.set('profile:1', '{"xp":10}');

    await expect(store.get('profile:1')).resolves.toBe('{"xp":10}');
  });

  it('returns null for missing keys', async () => {
    const store = new MemoryKeyValueStore();

    await expect(store.get('missing')).resolves.toBeNull();
  });

  it('removes one key without affecting others', async () => {
    const store = new MemoryKeyValueStore();
    await store.set('a', '1');
    await store.set('b', '2');

    await store.remove('a');

    await expect(store.get('a')).resolves.toBeNull();
    await expect(store.get('b')).resolves.toBe('2');
  });

  it('clears all values between test/runtime lifecycles', async () => {
    const store = new MemoryKeyValueStore();
    await store.set('a', '1');
    await store.set('b', '2');

    await store.clear();

    await expect(store.get('a')).resolves.toBeNull();
    await expect(store.get('b')).resolves.toBeNull();
  });
});
