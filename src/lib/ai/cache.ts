/**
 * Cache em memória com TTL para respostas de IA.
 * Reduz custo e latência quando o mesmo prompt é repetido.
 */
import { AI_CONFIG } from "./config";
import type { AIResponse } from "./types";

interface Entry {
  value: AIResponse;
  expiresAt: number;
}

const store = new Map<string, Entry>();

export function cacheGet(key: string): AIResponse | null {
  if (!AI_CONFIG.cache.enabled) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return { ...entry.value, cached: true };
}

export function cacheSet(key: string, value: AIResponse) {
  if (!AI_CONFIG.cache.enabled) return;
  if (store.size >= AI_CONFIG.cache.maxEntries) {
    // Remove o mais antigo
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
  store.set(key, { value, expiresAt: Date.now() + AI_CONFIG.cache.ttlMs });
}

export function cacheClear() {
  store.clear();
}
