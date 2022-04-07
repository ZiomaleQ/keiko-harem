import { config } from "./config.ts";

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
  body: string | FormData | null = null,
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

  return await response.json();
}
