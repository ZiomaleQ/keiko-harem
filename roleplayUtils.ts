import { config } from "./config.ts";
import {
  GuildManager,
  HeroManager,
  ItemManager,
  MoneyManager,
  MonsterManager,
  RavenHero,
  RavenItem,
  RavenMoney,
  RavenMonster,
} from "./dataManager.ts";
import { EmbedField } from "./deps.ts";

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

export interface RavenResponse<T> {
  TotalResults: number;
  LongTotalResults: number;
  ScannedResults: number;
  SkippedResults: number;
  DurationInMs: number;
  // deno-lint-ignore no-explicit-any
  IncludedPaths?: any;
  IndexName: string;
  Results: T[];
  // deno-lint-ignore no-explicit-any
  Includes: Record<any, any>;
  IndexTimestamp: Date;
  LastQueryTime: Date;
  IsStale: boolean;
  ResultEtag: number;
  NodeTag: string;
}

// deno-lint-ignore no-explicit-any
export async function fetchData<T extends any>(
  method: string,
  path: string,
  body: string | null = null,
): Promise<RavenResponse<T>> {
  const response = await fetch(
    `http://${config.RAVEN_DB.SERVER}:${config.RAVEN_DB.PORT}/databases${path}`,
    {
      method,
      body,
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
      },
    },
  );

  console.log(
    "FETCHING: ",
    method,
    response.url,
    "\n\n With body;",
    body,
    "\n",
  );

  if (response.status >= 400) throw Error(await response.text());

  // deno-lint-ignore no-explicit-any
  if (response.status === 204) return null as any;

  return (await response.json()) as RavenResponse<T>;
}

export async function resolveItem(
  gid: string,
  name: string,
): Promise<RavenItem | undefined> {
  let item: RavenItem | undefined = (await ItemManager.getInstance().getByName(
    gid,
    name,
  ));

  if (item === undefined) {
    item = await ItemManager.getInstance().getByID(name);
  }

  return item;
}

export async function resolveHero(
  gid: string,
  name: string | undefined,
): Promise<RavenHero | undefined> {
  if (name === undefined) return undefined;
  let hero: RavenHero | undefined = (await HeroManager.getInstance().getByName(
    gid,
    name,
  ));

  if (hero === undefined) {
    hero = await HeroManager.getInstance().getByID(name);
  }

  return hero;
}

export async function resolveAccount(
  gid: string,
  uid: string,
  hero: string | undefined,
): Promise<[RavenMoney, RavenHero | undefined]> {
  const accounts = await MoneyManager.getInstance().getOrCreate(gid, uid);
    
  const heroObj = await resolveHero(gid, hero);

  const wantedAcc = accounts.find((acc) =>
    heroObj === undefined
      ? acc.heroID === null
      : acc.heroID === heroObj["@metadata"]["@id"]
  )!;

  return [wantedAcc, heroObj];
}

export async function resolveMonster(
  gid: string,
  name: string | undefined,
): Promise<RavenMonster | undefined> {
  if (name === undefined) return undefined;
  let hero: RavenMonster | undefined =
    (await MonsterManager.getInstance().getByName(
      gid,
      name,
    ));

  if (hero === undefined) {
    hero = await MonsterManager.getInstance().getByID(name);
  }

  return hero;
}

export async function convertItemsToEmbeds(
  item: RavenItem,
): Promise<EmbedField> {
  return {
    name: item.name + " - " +
      await formatMoney(
        item.gid,
        typeof item.data.price === "number"
          ? item.data.price
          : item.data.price.find((elt) => elt.entity === "ALL")!.price,
      ),
    value: item.data.description,
  };
}

export async function formatMoney(gid: string, value: number): Promise<string> {
  return value + await GuildManager.getInstance().getCurrency(gid);
}

export function formatHero(
  hero: RavenHero | undefined,
  prefix = "",
  suffix = "",
) {
  return hero === undefined ? "" : prefix + hero.name + suffix;
}

export function heroWithMember(
  hero: RavenHero | undefined,
  prefix = "",
  suffix = "",
  member: string | undefined = hero?.uid,
) {
  return `${member === undefined ? "" : `<@${member}>`} ${
    formatHero(hero, prefix, suffix)
  }`;
}
