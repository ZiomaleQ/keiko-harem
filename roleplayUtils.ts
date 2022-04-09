import { config } from "./config.ts";
import { ItemManager, RavenItem } from "./dataManager.ts";

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
