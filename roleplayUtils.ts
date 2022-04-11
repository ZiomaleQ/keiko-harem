import { config } from "./config.ts";
import { HeroManager, ItemManager, RavenHero, RavenItem } from "./dataManager.ts";
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

// deno-lint-ignore no-explicit-any
export async function fetchData<T extends any>(
  method: string,
  path: string,
  body: string | null = null,
): Promise<T> {
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

  return await response.json();
}

export async function resolveItem(
  gid: string,
  name: string,
): Promise<RavenItem | undefined> {
  let item: RavenItem | undefined = (await ItemManager.getByName(
    gid,
    name,
  ));

  if (item === undefined) {
    item = await ItemManager.getByID(name);
  }

  return item;
}

export async function resolveHero(
  gid: string,
  name: string,
): Promise<RavenHero | undefined> {
  let hero: RavenHero | undefined = (await HeroManager.getByName(
    gid,
    name,
  ));

  if (hero === undefined) {
    hero = await HeroManager.getByID(name);
  }

  return hero;
}

export function convertItemsToEmbeds(
  item: RavenItem,
  guildCurrency: string | null,
): EmbedField {
  return {
    name: item.name + " - " + item.data.price + (guildCurrency || "$"),
    value: item.data.description,
  };
}