import { fetchData } from "./roleplayUtils.ts";

export class GuildManager {
  static async get(gid: string): Promise<RavenGuild | undefined> {
    const resp = await fetchData(
      "GET",
      `/guild/queries?query=from "@empty" where gid == "${gid}"`,
    );

    // deno-lint-ignore no-explicit-any
    return (resp as any).Results[0];
  }

  static async create(
    data: RavenGuild,
  ): Promise<RavenGuild> {
    return await fetchData(
      "POST",
      "/guild/bulk_docs",
      JSON.stringify({ Commands: [{ Document: data, Id: "", Type: "PUT" }] }),
    );
  }

  static default(gid: string): RavenGuild {
    return {
      "@metadata": { "@collection": null, "@id": "" },
      gid: gid,
      maxHeroes: 1,
      money: { currency: null, startingMoney: 0 },
      xp: { perLevel: 100, starting: 100 },
    };
  }

  static async getOrCreate(
    gid: string,
    data: RavenGuild = this.default(gid),
  ): Promise<RavenGuild> {
    const tempData = await this.get(gid);
    if (tempData !== undefined) return tempData;

    return this.create(data);
  }
}

export interface RavenGuild {
  "@metadata": Metadata;
  gid: string;
  maxHeroes: number;
  money: { currency: string | null; startingMoney: number };
  xp: { perLevel: number; starting: number };
}

export interface Metadata {
  "@collection": string | null;
  "@id": string;
  // deno-lint-ignore no-explicit-any
  [index: string]: any;
}

export class MoneyManager {
  static async get(gid: string, uid: string): Promise<RavenMoney[]> {
    const resp = await fetchData(
      "GET",
      `/money/queries?query=from "@empty" where gid == "${gid}" and uid == "${uid}"`,
    );

    // deno-lint-ignore no-explicit-any
    return (resp as any).Results;
  }

  static default(gid: string, uid: string): RavenMoney {
    return {
      "@metadata": { "@collection": null, "@id": "" },
      gid,
      uid,
      value: 0,
      heroID: null,
    };
  }

  static async create(
    data: RavenMoney,
  ): Promise<RavenMoney> {
    return await fetchData(
      "POST",
      "/money/bulk_docs",
      JSON.stringify({ Commands: [{ Document: data, Id: "", Type: "PUT" }] }),
    );
  }

  static async getOrCreate(
    gid: string,
    uid: string,
    data: RavenMoney = this.default(gid, uid),
  ): Promise<RavenMoney[]> {
    const tempData = await this.get(gid, uid);
    if (tempData.length > 0) return tempData;

    return [await this.create(data)];
  }

  static update(
    data: RavenMoney,
    value: number,
  ): Promise<RavenMoney> {
    return fetchData(
      "POST",
      "/money/bulk_docs",
      JSON.stringify({
        Commands: [{
          Id: data["@metadata"]["@id"],
          Patch: { Script: `this.value = ${value}` },
          Type: "PATCH",
        }],
      }),
    );
  }
}

export interface RavenMoney {
  "@metadata": Metadata;
  gid: string;
  uid: string;
  value: number;
  /** ID HASH */
  heroID: string | null;
}

export class HeroManager {
  static async get(owner: string): Promise<Hero> {
    return await fetchData("GET", `/hero?where=(owner,like,${owner})`);
  }
}

export interface Hero {
  id: number;
  /** JSON */
  data: string;
  owner: string;
  /** DB ID*/
  guildID: number;
  /** JSON */
  attachments: string;
}
