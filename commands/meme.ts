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
        files: [await MessageAttachment.load("https://i.imgflip.com/2/6jmgmz.jpg")]
      })
      break
  }
}