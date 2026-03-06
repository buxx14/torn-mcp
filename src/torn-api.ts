const BASE_URL = "https://api.torn.com";

// Simple rate limiter: max 90 requests per 60 seconds (leaving headroom under 100/min limit)
const REQUEST_WINDOW = 60_000;
const MAX_REQUESTS = 90;
const requestTimestamps: number[] = [];

async function rateLimit(): Promise<void> {
  const now = Date.now();
  // Remove timestamps older than the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - REQUEST_WINDOW) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_REQUESTS) {
    const waitTime = requestTimestamps[0] + REQUEST_WINDOW - now + 100;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  requestTimestamps.push(Date.now());
}

export interface TornApiError {
  code: number;
  error: string;
}

export interface TornApiResponse {
  [key: string]: any;
}

export async function tornApiCall(
  apiKey: string,
  section: string,
  selections: string,
  id?: string | number,
  extraParams?: Record<string, string>
): Promise<TornApiResponse> {
  await rateLimit();

  const idPart = id ? `/${id}` : "";
  const url = new URL(`${BASE_URL}/${section}${idPart}`);
  url.searchParams.set("selections", selections);
  url.searchParams.set("key", apiKey);

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  const data = (await response.json()) as TornApiResponse;

  if (data.error) {
    const err = data.error as TornApiError;
    throw new Error(`Torn API Error (code ${err.code}): ${err.error}`);
  }

  return data;
}

// Convenience wrappers for each section
export const tornUser = (apiKey: string, selections: string, userId?: string | number, extra?: Record<string, string>) =>
  tornApiCall(apiKey, "user", selections, userId, extra);

export const tornFaction = (apiKey: string, selections: string, factionId?: string | number, extra?: Record<string, string>) =>
  tornApiCall(apiKey, "faction", selections, factionId, extra);

export const tornCompany = (apiKey: string, selections: string, companyId?: string | number, extra?: Record<string, string>) =>
  tornApiCall(apiKey, "company", selections, companyId, extra);

export const tornMarket = (apiKey: string, selections: string, itemId?: string | number, extra?: Record<string, string>) =>
  tornApiCall(apiKey, "market", selections, itemId, extra);

export const tornTorn = (apiKey: string, selections: string, id?: string | number, extra?: Record<string, string>) =>
  tornApiCall(apiKey, "torn", selections, id, extra);

export const tornKey = (apiKey: string, selections: string) =>
  tornApiCall(apiKey, "key", selections);
