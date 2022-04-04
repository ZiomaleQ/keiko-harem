import { fetchData, Item, Monster } from "./roleplayUtils.ts";

export class GuildManager {
  static async get(id: string, discordID = true): Promise<NocoGuild | null> {
    if (discordID) {
      return (await fetchData(
        "GET",
        `/guild/findOne?where=(guild,like,${id})`,
      )) as NocoGuild;
    } else {
      return (await fetchData(
        "GET",
        `/guild/${id}`,
      )) as NocoGuild;
    }
  }

  static async create(
    data: CreateGuildPayload,
  ): Promise<NocoGuild> {
    return await fetchData(
      "POST",
      "/guild",
      JSON.stringify(data),
    );
  }

  static default(id: string): NocoGuild {
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
  }

  static transformTo(data: NocoGuild): CreateGuildPayload {
    // deno-lint-ignore no-explicit-any
    const tempData = data as any;
    delete tempData.id;
    return tempData;
  }

  static async getOrCreate(
    id: string,
    data: NocoGuild | CreateGuildPayload = this.default(id),
    discordID = true,
  ): Promise<NocoGuild> {
    const tempData = await this.get(id, discordID);
    if (tempData !== null) return tempData;

    const transformedData = this.transformTo(data as NocoGuild);
    return this.create(transformedData);
  }

  static async exists(id: string, discordID = true): Promise<boolean> {
    if (discordID) {
      return (await this.get(id, discordID)) !== null;
    } else {
      return await fetchData("GET", `/guild/${id}/exists`);
    }
  }

  static all(): Promise<NocoGuild[]> {
    return fetchData("GET", "/guild");
  }
}

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
  moneyList: NocoMoney[];
  currency: null | string;
}

export interface NocoGuild extends CreateGuildPayload {
  id: number;
}

export class MoneyManager {
  static async get(guildID: string, userID: string): Promise<NocoMoney[]> {
    const { id } = await GuildManager.getOrCreate(guildID);

    return await fetchData(
      "GET",
      `/guild/${id}/money?where=(user_id,like,${userID})`,
    );
  }

  static default(userID: string): NocoMoney {
    return {
      id: -1,
      guildID: -1,
      user_id: userID,
      isHeroAcc: false,
      value: 0,
      heroID: null,
    };
  }

  static create(
    guildID: string,
    data: CreateMoneyPayload,
  ): Promise<NocoMoney> {
    return fetchData(
      "POST",
      `/guild/${guildID}/money`,
      JSON.stringify(data),
    );
  }

  static transformTo(data: NocoMoney, initialValue = 0): CreateMoneyPayload {
    // deno-lint-ignore no-explicit-any
    const tempData = data as any;

    delete tempData.id;
    delete tempData.guildID;
    delete tempData.heroID;

    tempData.value = initialValue;
    tempData.nc_34j6__hero_id = null;

    return tempData;
  }

  static async getOrCreate(
    guildID: string,
    userID: string,
    data: CreateMoneyPayload | NocoMoney = this.default(userID),
  ): Promise<NocoMoney[]> {
    const tempData = await this.get(guildID, userID);
    if (tempData.length > 0) return tempData;

    const transformedData = this.transformTo(data as NocoMoney);
    return [await this.create(guildID, transformedData)];
  }
}

export interface CreateMoneyPayload {
  user_id: string;
  value: number;
  /** DB ID */
  heroID: number | null;
  isHeroAcc: boolean;
}

export interface NocoMoney extends CreateMoneyPayload {
  id: number;
  /** DB ID */
  guildID: number;
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
