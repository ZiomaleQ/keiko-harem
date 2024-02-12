import { MessageAttachment } from "https://raw.githubusercontent.com/harmonyland/harmony/314c06613f8cd97a0f49f7362f665ff2b0145369/src/structures/message.ts";
import { ApplicationCommandPartial, SlashCommandInteraction } from "../deps.ts"

export const Typedef: ApplicationCommandPartial = {
  "name": "meme",
  "description": "Memy dla ciebie <3",
  "options": [
    {
      "name": "nazwa",
      "description": "Nazwa mema którego szukasz",
      "type": "STRING",
      "required": true,
      "autocomplete": true
    }
  ]
}

export const Execute = async (interaction: SlashCommandInteraction) => {
  await interaction.defer()

  const memeName = interaction.option<string>("nazwa")

  switch (memeName) {
    case "futureme":
      await interaction.editResponse({
        files: [await MessageAttachment.load("https://i.imgflip.com/6jmgmz.png?a471367")]
      })
      break
    case "radek@gwiazda":
      await interaction.editResponse({
        files: [await MessageAttachment.load("https://cdn.discordapp.com/attachments/1154878921620340898/1206693069282349096/9k.png?ex=65dcef7e&is=65ca7a7e&hm=c982afaee75606bde0567ad056fbcc865e503abb2eb34a94ae537d64754b32e6&")]
      })
      break
  }
}