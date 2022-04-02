import { Command } from "../../../deps.ts";
import { RolePlayContext } from "../mod.ts";

export class SettingsCommand extends Command {
  name = "settings";
  guildOnly = true;

  execute(ctx: RolePlayContext) {
    ctx.message.reply({ content: JSON.stringify(ctx.guildData) });
  }
}
