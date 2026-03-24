import { KeyManager } from "./key-manager.js";

const BASE_URL_V2 = "https://api.torn.com/v2";
const BASE_URL_V1 = "https://api.torn.com";

export interface TornApiError {
  code: number;
  error: string;
}

export interface TornApiResponse {
  [key: string]: any;
}

// ── v2 API (primary) ──

export async function tornApiFetch(
  keyManager: KeyManager,
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<TornApiResponse> {
  const key = await keyManager.getKey();
  const url = new URL(`${BASE_URL_V2}${path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("comment", "NEXUS-MCP");

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const response = await fetch(url.toString());
  const data = (await response.json()) as TornApiResponse;

  if (data.error) {
    const err = data.error as TornApiError;

    // Rate limited — wait 31s and retry once
    if (err.code === 5) {
      await new Promise((r) => setTimeout(r, 31000));
      const retryKey = await keyManager.getKey();
      url.searchParams.set("key", retryKey);
      const retryRes = await fetch(url.toString());
      const retryData = (await retryRes.json()) as TornApiResponse;
      if (retryData.error) {
        const retryErr = retryData.error as TornApiError;
        throw new Error(`Torn API v2 Error (code ${retryErr.code}): ${retryErr.error}`);
      }
      return retryData;
    }

    // Cloud daily limit
    if (err.code === 14) {
      throw new Error("Cloud daily limit reached (50K rows). Try again tomorrow or use fewer stats.");
    }

    throw new Error(`Torn API v2 Error (code ${err.code}): ${err.error}`);
  }

  return data;
}

// ── v1 API (legacy, for endpoints not yet on v2) ──

export async function tornApiV1Call(
  keyManager: KeyManager,
  section: string,
  selections: string,
  id?: string | number,
  extraParams?: Record<string, string>
): Promise<TornApiResponse> {
  const key = await keyManager.getKey();
  const idPart = id ? `/${id}` : "";
  const url = new URL(`${BASE_URL_V1}/${section}${idPart}`);
  url.searchParams.set("selections", selections);
  url.searchParams.set("key", key);
  url.searchParams.set("comment", "NEXUS-MCP");

  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString());
  const data = (await response.json()) as TornApiResponse;

  if (data.error) {
    const err = data.error as TornApiError;

    if (err.code === 5) {
      await new Promise((r) => setTimeout(r, 31000));
      const retryKey = await keyManager.getKey();
      url.searchParams.set("key", retryKey);
      const retryRes = await fetch(url.toString());
      const retryData = (await retryRes.json()) as TornApiResponse;
      if (retryData.error) {
        const retryErr = retryData.error as TornApiError;
        throw new Error(`Torn API Error (code ${retryErr.code}): ${retryErr.error}`);
      }
      return retryData;
    }

    if (err.code === 14) {
      throw new Error("Cloud daily limit reached (50K rows). Try again tomorrow or use fewer stats.");
    }

    throw new Error(`Torn API Error (code ${err.code}): ${err.error}`);
  }

  return data;
}

// ── Convenience wrappers ──

export const tornUser = (km: KeyManager, selections: string, userId?: string | number, extra?: Record<string, string>) =>
  tornApiV1Call(km, "user", selections, userId, extra);

export const tornFaction = (km: KeyManager, selections: string, factionId?: string | number, extra?: Record<string, string>) =>
  tornApiV1Call(km, "faction", selections, factionId, extra);

export const tornTorn = (km: KeyManager, selections: string, id?: string | number, extra?: Record<string, string>) =>
  tornApiV1Call(km, "torn", selections, id, extra);
