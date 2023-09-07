import { ActionRowComponent, ButtonComponent, InteractionChannel, InteractionResponseFlags, MessageComponentType, Role, SlashCommandInteraction, SlashCommandOption } from "../../deps.ts"
import { hasPerms, createButton, chunk } from "../../utils.ts"

export const Typedef: SlashCommandOption = {
  "type": "SUB_COMMAND",
  "name": "dodaj",
  "description": "Dodaj role do menu",
  "options": [
    {
      "type": "ROLE",
      "name": "rola",
      "description": "Rola jaką dodać",
      "required": true
    },
    {
      "type": "STRING",
      "name": "wiadomosc",
      "description": "ID menu",
      "required": true
    },
    {
      "name": "kanał",
      "description": "Kanał na którym znajduje się menu",
      "type": "CHANNEL",
      "required": true
    }
  ]
}

export const Execute = async (interaction: SlashCommandInteraction) => {
  if (interaction.member === undefined) return
  if (interaction.guild === undefined) return

  if (!hasPerms(interaction.member)) {
    return interaction.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie masz uprawnienień",
    })
  }

  const guild = interaction?.guild!

  const msgID = interaction.option<string>("wiadomosc")

  const role = interaction.option<Role>("rola")
  const channel = interaction.option<InteractionChannel>("kanał")

  await interaction.defer()

  const resolvedChannel = (await guild.channels.fetch(channel.id))!

  if (!resolvedChannel.isText()) {
    return await interaction.respond({
      content: "Zły kanał",
    })
  }

  let msg

  try {
    msg = await resolvedChannel.messages.fetch(msgID)
  } catch (_e) {
    return await interaction.respond({
      content: "Złe id menu",
    })
  }

  if (msg.author.id !== "622783718783844356") {
    return await interaction.respond({
      content: "To menu nie jest moje...",
    })
  }

  const newButton = createButton({
    label: role.name,
    customID: "a/" + role.id,
  })

  const flatComponents = msg.components.flatMap((elt) =>
    (elt as ActionRowComponent).components
  )

  const alreadyExists =
    flatComponents.find((elt) =>
      (elt as ButtonComponent).customID === newButton.customID
    ) !== undefined

  if (alreadyExists) {
    return await interaction.respond({
      content: "Przycisk z tą rolą już istnieje...",
    })
  }

  flatComponents.push(newButton)

  if (flatComponents.length > 25) {
    return await interaction.respond({
      content: "Nie można dodać więcej przyciskow...",
    })
  }

  const splitted = chunk(flatComponents, 5)
  const components: ActionRowComponent[] = []

  for (const arr of splitted) {
    components.push({
      type: MessageComponentType.ActionRow,
      components: arr,
    })
  }

  try {
    await interaction.editResponse({
      content: "Zrobione!",
    })

    msg.edit({
      content: msg.content,
      embeds: msg.embeds,
      components,
    })
  } catch (_e) {
    await interaction.editResponse(
      {
        content:
          `Nie mam uprawnienień do tego (usuwanie wiadomości, tworzenie nowych wiadomości na <#${resolvedChannel.id}>)`,
      },
    )
  }
}