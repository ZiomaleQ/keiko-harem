import { Command, CommandContext } from "../../../deps.ts";
import { getOrCreateGuild } from "../utils.ts";

export class SettingsCommands extends Command {
  name = "settings";
  guildOnly = true;

  async execute(ctx: CommandContext) {
    const guild = ctx.guild!;
    const guildData = await getOrCreateGuild(guild.id, {
      guild: guild.id,
      startingMoney: 0,
      xpPerLevel: 0,
      firstLevelXP: 0,
      addons: "",
    });
  }
}
