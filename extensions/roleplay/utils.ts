import { config } from "../../config.ts";

export function getGuilds(): Promise<NocoSimpleGuild[]> {
  return fetchData("GET", "/nc/keiko_34j6/api/v1/guild");
}

export function getGuild(id: string): Promise<NocoSimpleGuild | null> {
  return fetchData(
    "GET",
    `/nc/keiko_34j6/api/v1/guild/findOne?where=(guild,like,${id})`,
  );
}

export function createGuild(
  data: CreateGuildPayload,
): Promise<NocoSimpleGuild> {
  return fetchData(
    "POST",
    "/nc/keiko_34j6/api/v1/guild/findOne",
    JSON.stringify(data),
  );
}

export async function guildExists(id: string): Promise<boolean> {
  return ((await fetchData(
    "GET",
    `/nc/keiko_34j6/api/v1/guild?where=(guild,like,${id})`,
  )) as unknown[]).length > 0;
}

export async function getOrCreateGuild(
  id: string,
  data: CreateGuildPayload,
): Promise<NocoSimpleGuild> {
  return await getGuild(id) || await createGuild(data);
}

export interface CreateGuildPayload {
  guild: string;
  startingMoney: number;
  xpPerLevel: number;
  firstLevelXP: number;
  addons: string;
}

export interface NocoSimpleGuild extends CreateGuildPayload {
  id: number;
}

// deno-lint-ignore no-explicit-any
async function fetchData<T extends any>(
  method: string,
  path: string,
  body: string | FormData | null = null,
  headers: Record<string, string> = {},
): Promise<T> {
  headers["accept"] = "application/json";

  const response = await performReq(
    `http://${config.NOCO_DB.SERVER}:${config.NOCO_DB.PORT}${path}`,
    {
      method,
      body,
      headers: {
        ...headers,
        "xc-token": config.NOCO_DB.AUTH_TOKEN,
      },
    },
  );

  if (response.status >= 400) throw Error(await response.text());

  if (+(response.headers.get("content-length") ?? 0) === 0) {
    // deno-lint-ignore no-explicit-any
    return null as any;
  } else {
    return await response.json();
  }
}

async function performReq(path: string, req: RequestInit): Promise<Response> {
  return await fetch(path, req);
}
