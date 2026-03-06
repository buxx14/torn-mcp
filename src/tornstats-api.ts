const TORNSTATS_BASE = "https://www.tornstats.com/api/v2";

export interface TornStatsApiResponse {
  [key: string]: any;
}

export async function tornStatsGet(
  apiKey: string,
  endpoint: string
): Promise<TornStatsApiResponse> {
  const url = `${TORNSTATS_BASE}/${apiKey}/${endpoint}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TornStats API Error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TornStatsApiResponse;

  if (data.status === false && data.message) {
    throw new Error(`TornStats API Error: ${data.message}`);
  }

  return data;
}

export const tornStatsFactionCPR = (apiKey: string) =>
  tornStatsGet(apiKey, "faction/cpr");
