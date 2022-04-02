import { CommandClient, CommandContext, Extension } from "../../deps.ts";
import { SettingsCommand } from "./commands/settings.ts";
import { getGuild, NocoSimpleGuild } from "./utils.ts";

export class RolePlayExtension extends Extension {
  subPrefix = "rp";

  constructor(client: CommandClient) {
    super(client);

    this.client.use(async (ctx: RolePlayContext, next: () => unknown) => {
      ctx.guildData = await this.getGuild(ctx.guild!.id);
      return next();
    });

    this.commands.add(SettingsCommand);
  }

  async getGuild(id: string): Promise<NocoSimpleGuild> {
    const data = await getGuild(id);
    return data || {
      addons: "",
      startingMoney: 0,
      firstLevelXP: 0,
      xpPerLevel: 0,
      guild: id,
      id: -1,
    };
  }
}

export interface RolePlayContext extends CommandContext {
  guildData: NocoSimpleGuild;
}
