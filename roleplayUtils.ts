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

  console.log(
    "FETCHING: ",
    method,
    response.url,
    "\n\n With body;",
    body,
    "\n",
  );

  if (response.status >= 400) throw Error(await response.text());

  if (+(response.headers.get("content-length") ?? 0) === 0) {
    // deno-lint-ignore no-explicit-any
    return null as any;
  } else {
    return await response.json();
  }
}
