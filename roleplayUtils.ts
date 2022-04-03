import { config } from "./config.ts";

export async function getMoneyOrDefault(
  userID: string,
  guildID: string,
): Promise<Money[]> {
  const data = await getMoney(userID, guildID);
  return data ?? [defaultMoneyData(userID)];
}

export async function getMoneyOrCreate(
  userID: string,
  guildID: string,
  data?: Money,
): Promise<Money[]> {
  const actualData = await getMoney(userID, guildID);
  if (actualData.length !== 0) return actualData;

  const guildData = (await getGuild(guildID))!;

  const defaultData = () => {
    // deno-lint-ignore no-explicit-any
    const tempData = defaultMoneyData(userID) as any;

    delete tempData.id;
    delete tempData.guildID;
    delete tempData.heroID;

    tempData.value = guildData!.startingMoney;
    tempData.nc_34j6__hero_id = null;

    return tempData;
  };
  return [await createMoney(guildData.id + "", data ?? defaultData())];
}

export function createMoney(
  guildID: string,
  data: CreateMoneyPayload,
): Promise<Money> {
  return fetchData(
    "POST",
    `/guild/${guildID}/money`,
    JSON.stringify(data),
  );
}

export interface CreateMoneyPayload {
  /** DB ID */
  guildID: number;
  user_id: string;
  value: number;
  /** DB ID */
  heroID: number | null;
  isHeroAcc: boolean;
}

export async function getMoney(
  userID: string,
  guildID: string,
): Promise<Money[]> {
  const { id } = await getOrCreateGuild(guildID);

  return await fetchData(
    "GET",
    `/guild/${id}/money?where=(user_id,like,${userID})`,
  );
}

export async function getGuildOrDefault(id: string): Promise<NocoSimpleGuild> {
  const data = await getGuild(id);
  return data || defaultGuildData(id);
}

export function getGuilds(): Promise<NocoSimpleGuild[]> {
  return fetchData("GET", "/guild");
}

export function getGuild(id: string): Promise<NocoSimpleGuild | null> {
  return fetchData(
    "GET",
    `/guild/findOne?where=(guild,like,${id})`,
  );
}

export function createGuild(
  data: CreateGuildPayload | undefined,
): Promise<NocoSimpleGuild> {
  return fetchData(
    "POST",
    "/guild",
    JSON.stringify(data),
  );
}

export async function guildExists(id: string): Promise<boolean> {
  return ((await fetchData(
    "GET",
    `/guild?where=(guild,like,${id})`,
  )) as unknown[]).length > 0;
}

export async function getOrCreateGuild(
  id: string,
  data?: CreateGuildPayload,
): Promise<NocoSimpleGuild> {
  const actualData = await getGuild(id);

  if (actualData === null) {
    const defaultData = () => {
      // deno-lint-ignore no-explicit-any
      const tempData = defaultGuildData(id) as any;
      delete tempData.id;
      return tempData;
    };
    return createGuild(data ?? defaultData());
  } else {
    return actualData;
  }
}

export const defaultGuildData = (id: string): NocoSimpleGuild => {
  return {
    addons: "",
    startingMoney: 0,
    firstLevelXP: 0,
    xpPerLevel: 0,
    guild: id,
    maxHeroes: 1,
    id: -1,
    currency: null,
    heroList: [],
    itemsList: [],
    moneyList: [],
    monstersList: [],
  };
};

export const defaultMoneyData = (userID: string): Money => {
  return {
    id: -1,
    guildID: -1,
    user_id: userID,
    isHeroAcc: false,
    value: 0,
    heroID: null,
  };
};

export interface CreateGuildPayload {
  guild: string;
  startingMoney: number;
  xpPerLevel: number;
  firstLevelXP: number;
  addons: string;
  maxHeroes: number;
  itemsList: Item[];
  heroList: Hero[];
  monstersList: Monster[];
  moneyList: Money[];
  currency: null | string;
}

export interface Item {
  id: number;
  name: string;
  /** JSON */
  data: string;
  /** DB ID */
  guildID: number;
  /** JSON */
  attachments: string;
}

export interface Hero {
  id: number;
  /** JSON */
  data: string;
  snowflake: string;
  /** DB ID*/
  guildID: number;
  /** JSON */
  attachments: string;
}

export interface Monster {
  id: number;
  name: string;
  /** JSON */
  data: string;
  /** DB ID */
  guildID: number;
  /** JSON */
  attachments: string;
}

export interface Money extends CreateMoneyPayload {
  id: number;
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
  const response = await fetch(
    `http://${config.NOCO_DB.SERVER}:${config.NOCO_DB.PORT}/nc/${config.NOCO_DB.DB_NAME}/api/v1${path}`,
    {
      method,
      body,
      headers: {
        ...headers,
        "accept": "application/json",
        "Content-Type": "application/json",
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
