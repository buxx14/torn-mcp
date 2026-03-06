const YATA_BASE = "https://yata.yt/api/v1";

export interface YataApiResponse {
  [key: string]: any;
}

export async function yataGet(
  endpoint: string,
  apiKey: string,
  extraParams?: Record<string, string>
): Promise<YataApiResponse> {
  const url = new URL(`${YATA_BASE}${endpoint}`);
  url.searchParams.set("key", apiKey);

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`YATA API Error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as YataApiResponse;
  return data;
}

// Foreign stocks
export const yataForeignStocks = (apiKey: string) =>
  yataGet("/travel/export/", apiKey);

// Spy data for a single target
export const yataSpy = (apiKey: string, targetId: string | number) =>
  yataGet(`/spy/${targetId}`, apiKey);

// Bulk faction spy data
export const yataFactionSpies = (apiKey: string, factionId?: string | number) => {
  const extra = factionId ? { faction_id: String(factionId) } : undefined;
  return yataGet("/spies/", apiKey, extra);
};
