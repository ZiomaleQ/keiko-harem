import { Embed, InteractionChannel, InteractionResponseFlags, SlashCommandInteraction, SlashCommandOption } from "../../deps.ts"
import { hasPerms } from "../../utils.ts"

export const Typedef: SlashCommandOption = {
  "type": "SUB_COMMAND",
  "name": "stworz",
  "description": "Stworz nowe menu",
  "options": [
    {
      "name": "tytuł",
      "description": "Tytuł wiadomości",
      "type": "STRING",
      "required": true
    },
    {
      "name": "opis",
      "description": "Opis menu",
      "type": "STRING",
      "required": true
    },
    {
      "name": "kanał",
      "description": "Kanał na który wysłać wiadomość",
      "type": "CHANNEL"
    }
  ]
}

export const Execute = async (interaction: SlashCommandInteraction) => {

  if (interaction.member === undefined) return
  if (interaction.guild === undefined) return

  if (!(await hasPerms(interaction.member))) {
    return interaction.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie masz uprawnienień",
    })
  }

  interaction.defer()

  const embed = new Embed().setTitle(interaction.option<string>("tytuł"))
    .addField("Opis", interaction.option<string>("opis"))

  if (interaction.option<InteractionChannel | undefined>("kanał") !== undefined) {
    const channel = interaction.option<InteractionChannel>("kanał")

    const message = await interaction.client.channels.sendMessage(channel.id, {
      embeds: [embed],
    })

    await message.edit({ embeds: [embed.setFooter(`ID: ${message.id}`)] })
  } else {
    //Won't be empty string
    const channelID = interaction.channel?.id ?? ""

    const message = await interaction.client.channels.sendMessage(channelID, {
      embeds: [embed],
    })

    await message.edit({ embeds: [embed.setFooter(`ID: ${message.id}`)] })
  }

  interaction.editResponse({
    content: "Zrobione!",
  })
}