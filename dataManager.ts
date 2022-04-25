import { fetchData } from "./roleplayUtils.ts";

export class BaseManager<T> {
  dbName = "";

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async get(query: string): Promise<T | undefined> {
    const resp = await fetchData<T>(
      "GET",
      `/${this.dbName}/queries?query=${query}`,
    );
    return resp.Results[0];
  }

  async getAll(query: string): Promise<T[]> {
    const resp = await fetchData<T>(
      "GET",
      `/${this.dbName}/queries?query=${query}`,
    );
    return resp.Results;
  }

  async create(data: T): Promise<void> {
    await fetchData(
      "POST",
      `/${this.dbName}/bulk_docs`,
      JSON.stringify({ Commands: [{ Document: data, Id: "", Type: "PUT" }] }),
    );
  }

  async update(data: T): Promise<void> {
    await fetchData(
      "POST",
      `/${this.dbName}/bulk_docs`,
      JSON.stringify({
        Commands: [{
          // deno-lint-ignore no-explicit-any
          Id: (data as any)["@metadata"]["@id"],
          Patch: {
            Script: `${
              Object.keys(data).map((elt) =>
                elt !== "@metadata"
                  // deno-lint-ignore no-explicit-any
                  ? `this.${elt} = ${JSON.stringify((data as any)[elt])}`
                  : null
              ).filter((elt) => elt).join(";")
            };`,
          },
          Type: "PATCH",
        }],
      }),
    );
  }

  async deleteByID(id: string): Promise<void> {
    await fetchData(
      "DELETE",
      `/${this.dbName}/docs?id=${id}`,
    );
  }

  async getByID(id: string): Promise<T> {
    return (await fetchData<T>(
      "GET",
      `/${this.dbName}/docs?id=${id}`,
    )).Results[0];
  }
}

export class GuildManager extends BaseManager<RavenGuild> {
  static #instance: GuildManager | undefined = undefined;

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new GuildManager();
    }
    return this.#instance;
  }

  constructor() {
    super("guild");
  }

  static default(gid: string): RavenGuild {
    return {
      "@metadata": { "@collection": null, "@id": "" },
      gid: gid,
      maxHeroes: 1,
      webhooks: {},
      modrole: "",
      money: { currency: null, startingMoney: 0 },
      xp: { perLevel: 100, starting: 100 },
    };
  }

  async get(gid: string) {
    return await super.get(`from "@empty" where gid == "${gid}"`);
  }

  async getOrCreate(
    gid: string,
    data: RavenGuild = GuildManager.default(gid),
  ): Promise<RavenGuild> {
    const tempData = await this.get(gid);
    if (tempData !== undefined) return tempData;

    await this.create(data);

    return data;
  }

  async getCurrency(gid: string): Promise<string> {
    return (await this.getOrCreate(gid)).money.currency || "$";
  }
}

export class MoneyManager extends BaseManager<RavenMoney> {
  static #instance: MoneyManager | undefined = undefined;

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new MoneyManager();
    }
    return this.#instance;
  }

  constructor() {
    super("money");
  }

  static default(gid: string, uid: string): RavenMoney {
    return {
      "@metadata": { "@collection": null, "@id": "" },
      gid,
      uid,
      value: 0,
      heroID: null,
      items: [],
    };
  }

  //@ts-ignore: TS moment
  getAll(gid: string, uid: string): Promise<RavenMoney[]> {
    return super.getAll(
      `from "@empty" where gid == "${gid}" and uid == "${uid!}"`,
    );
  }

  async getOrCreate(
    gid: string,
    uid: string,
    data: RavenMoney = MoneyManager.default(gid, uid),
  ): Promise<RavenMoney[]> {
    const tempData = await this.getAll(gid, uid);
    if (tempData.length > 0) return tempData;

    if (data["@metadata"]["@id"] === "") {
      const guildData = await GuildManager.getInstance().getOrCreate(gid);
      data.value = guildData.money.startingMoney;
    }

    await this.create(data);

    return [data];
  }
}

export class ItemManager extends BaseManager<RavenItem> {
  static #instance: ItemManager | undefined = undefined;

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new ItemManager();
    }
    return this.#instance;
  }

  constructor() {
    super("items");
  }

  async getPage(
    gid: string,
    page = -1,
  ): Promise<{ allItems: number; data: RavenItem[] }> {
    const resp = await fetchData<RavenItem>(
      "GET",
      `/${this.dbName}/queries?query=from "@empty" where gid == "${gid}" order by data.price as long ${
        page === -1 ? "" : "limit " + page * 5 + " ,5"
      }`,
    );

    return {
      allItems: resp.LongTotalResults,
      data: resp.Results,
    };
  }

  async getByName(gid: string, name: string): Promise<RavenItem | undefined> {
    return await this.get(
      `from "@empty" where gid == "${gid}" and name == "${name}"`,
    );
  }

  async getAutocompletitions(gid: string, str: string): Promise<RavenItem[]> {
    return await this.getAll(
      `from "@empty" where gid == "${gid}" and startsWith(name, "${str}") limit 25`,
    );
  }

  async getTags(gid: string): Promise<string[]> {
    const resp = await fetchData<{ "data.tags": string[] }>(
      "GET",
      `/items/queries?query=from "@empty" where data.tags.length > 0 and gid == "${gid}" select data.tags`,
    );

    return [
      ...(new Set(
        resp.Results.flatMap((elt) => elt["data.tags"]),
      )).values(),
    ];
  }

  // deno-lint-ignore no-explicit-any
  async create(data: any): Promise<void> {
    const actualData: RavenItem = {
      "@metadata": DEFAULT_META,
      data: {
        price: data.data?.price ?? 0,
        description: data.data?.description ?? "",
        inventory: data.data?.inventory ?? true,
        stock: data.data?.stock ?? -1,
        time: {
          start: data.data?.time?.start ?? "",
          end: data.data?.time?.end ?? "",
        },
        sell: {
          for: data.data?.sell?.for ?? "100",
          canSell: data.data?.sell?.canSell ?? true,
        },
        roles: {
          give: data.data?.roles?.give ?? [],
          remove: data.data?.roles?.remove ?? [],
          required: data.data?.roles?.required ?? [],
        },
        messages: {
          use: data.data?.messages?.use ?? "",
          buy: data.data?.messages?.buy ?? "",
          sell: data.data?.messages?.sell ?? "",
          add: data.data?.messages?.add ?? "",
          take: data.data?.messages?.take ?? "",
        },
        recipes: data.data?.recipes ?? [],
        tags: data.data?.tags ?? [],
      },
      gid: data.gid!,
      name: data.name!,
    };

    return await super.create(actualData);
  }
}

export class HeroManager extends BaseManager<RavenHero> {
  static #instance: HeroManager | undefined = undefined;

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new HeroManager();
    }
    return this.#instance;
  }

  constructor() {
    super("hero");
  }

  //@ts-ignore: TS moment
  async getAll(gid: string, uid: string): Promise<RavenHero[]> {
    return await super.getAll(
      `from "@empty" where gid == "${gid}" and uid == "${uid!}"`,
    );
  }

  async getByName(gid: string, name: string): Promise<RavenHero | undefined> {
    return await super.get(
      `from "@empty" where gid == "${gid}" and name == "${name}"`,
    );
  }

  async getAutocompletitions(gid: string, str: string): Promise<RavenHero[]> {
    return await super.getAll(
      `from "@empty" where gid == "${gid}" and startsWith(name, "${str}") limit 25`,
    );
  }
}

export interface Metadata {
  "@collection": string | null;
  "@id": string;
  // deno-lint-ignore no-explicit-any
  [index: string]: any;
}

export const DEFAULT_META: Metadata = { "@collection": null, "@id": "" };

export interface RavenGuild {
  "@metadata": Metadata;
  gid: string;
  maxHeroes: number;
  money: { currency: string | null; startingMoney: number };
  webhooks: { [index: string]: string };
  modrole: string;
  xp: { perLevel: number; starting: number };
}

export interface RavenMoney {
  "@metadata": Metadata;
  gid: string;
  uid: string;
  value: number;
  /** ID HASH */
  heroID: string | null;
  items: { hash: string; quantinity: number }[];
}

export interface RavenItem {
  "@metadata": Metadata;
  gid: string;
  name: string;
  data: {
    price:
      | { id: string; price: number; entity: "ROLE" | "USER" | "ALL" }[]
      | number;
    description: string;
    inventory: boolean;
    /** -1 == Infinity */
    stock: number;
    time: {
      start: string;
      end: string;
    };
    sell: {
      /** String for pecentage, number for fixed price */
      for: string | number;
      canSell: boolean;
    };
    roles: {
      give: string[];
      remove: string[];
      required: string[];
    };
    messages: {
      use: string;
      buy: string;
      sell: string;
      add: string;
      take: string;
    };
    recipes: {
      item: string;
      countItem: number;
      item1: string | null;
      countItem1: number | null;
      additionalCost: number;
      result: number;
    }[];
    tags: string[];
  };
}

export interface RavenHero {
  "@metadata": Metadata;
  uid: string;
  gid: string;
  name: string;
  data: {
    nickname: string;
    account: string | null;
    skills: [];
    runes: [];
    avatarUrl: string;
  };
}
