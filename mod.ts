import { config } from "./config.ts"
import {
  ActionRowComponent, ApplicationCommandPartial,
  ButtonComponent, CommandClient,
  Embed, Intents,
  InteractionChannel, InteractionResponseFlags,
  Member, MessageComponentData,
  MessageComponentType, PermissionFlags,
  Role, SlashCommandInteraction,
} from "./deps.ts"
import { chunk, createButton, genRandom, graphql } from "./utils.ts"

const client = new CommandClient({ token: config.TOKEN, prefix: "keiko!" })

client.on("ready", async () => {
  const commands = await client.interactions.commands.all()

  const keikoCommands = await import("./commands.json", {
    assert: { type: "json" },
  })

  if (commands.size != keikoCommands.default.length) {
    console.log("Updated commands")
    client.interactions.commands.bulkEdit(
      (keikoCommands.default) as ApplicationCommandPartial[],
    )
  }

  client.setPresence({
    status: "idle",
    activity: {
      name: "I'm leveling up!",
      type: "CUSTOM_STATUS",
    },
    since: Date.now(),
  })


  console.log("Hi, I'm " + client.user?.tag)
})

client.interactions.handle("anime", async (d: SlashCommandInteraction) => {
  const req = fetch("https://graphql.anilist.co", {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      "query": graphql.MEDIA_QUERY,
      "variables": { search: d.option<string>("nazwa"), type: "ANIME" },
    }),
    method: "POST",
  })

  d.defer()

  const res = (await req.then((resp) => resp.json()))

  if (res.errors && res.errors.length > 0) {
    return d.editResponse({
      content: "Nie znalazłam tego anime...",
    })
  }

  const data = res.data.Media

  const embed = new Embed().setTitle("Bonjour!").addField(
    "Tytuł:",
    data.title.english ?? data.title.romaji,
    true,
  ).setColor(data.coverImage.color).setImage(data.coverImage.large).addField(
    "Status:",
    data.status,
    true,
  ).addField("Liczba odcinków:", data.episodes, true).addField(
    "Przeczytaj więcej na",
    data.siteUrl,
    true,
  ).addField("NSFW?", data.isAdult ? "Tak" : "Nie", true).addField(
    "Jak inaczej to nazwać?",
    data.synonyms.join(", "),
    true,
  ).addField(
    "Data pierwszego odcinka:",
    `${data.startDate.day}.${data.startDate.month}.${data.startDate.year}`,
    true,
  ).addField(
    "Studia:",
    data.studios.nodes.map((elt: { name: string }) => elt.name).join(", "),
    true,
  )

  d.editResponse({
    embeds: [embed],
  })
})

function calculateDamage(
  lvl: number,
  ad: number,
  crit: number,
  critVal: number,
): [boolean, number] {
  let dmg = genRandom(0, lvl * 5) + lvl * 10 + ad + 30
  const goCrit = crit == 100 || (genRandom(0, 100) > crit && crit > 0)

  if (goCrit) dmg *= critVal <= 0 ? 2 : critVal / 100

  return [goCrit, dmg]
}

function generateAttaackEmbed(okay: number, crit: boolean, dmg: number): Embed {
  const embed = new Embed().setTitle("No siemka").setColor(
    okay >= 15 ? "#00ff00" : "#ff0000",
  )

  let message = `[${okay}]`

  if (okay >= 15) {
    message += " Trafiłeś" + (crit
      ? " krytycznie"
      : "") + `, zadałeś ${dmg} obrażeń.`
  } else {
    message += " Niestety, atak się nie udał..."
  }

  embed.addField("Informacje", message)

  return embed
}

client.interactions.handle("atak", (d: SlashCommandInteraction) => {
  const okay = genRandom(0, 40) + ~~d.option<number>("modif")
  const lvl = d.option<number>("lvl") - 1
  const [crit, dmg] = calculateDamage(
    lvl,
    ~~d.option<number>("dmg"),
    ~~d.option<number>("krytyczne"),
    ~~d.option<number>("wartosc-kryt"),
  )

  const embed = generateAttaackEmbed(okay, crit, dmg)

  embed.setFooter(
    `${~~d.option<number>("lvl")}|${~~d.option<number>("modif")}|${~~d.option<
      number
    >("dmg")}|${~~d.option<number>("krytyczne")}|${~~d.option<number>(
      "wartosc-kryt",
    )}`,
  )

  d.respond({
    embeds: [embed],
    components: replayComponent("atak"),
  })
})

client.interactions.handle("dice", (d: SlashCommandInteraction) => {
  const max = Math.abs(d.option<number>("max"))
  const min = Math.abs(~~d.option<number>("min"))

  return d.respond({
    embeds: [
      new Embed().setTitle("No siemka").addField(
        "Informacje:",
        `Wylosowałam: __***\`${genRandom(min, max)}\`***__.`,
      ).setColor("#00ff00"),
    ],
  })
})

client.interactions.handle("pancerz", (d: SlashCommandInteraction) => {
  const pancerz = d.option<number>("pancerz")

  return d.respond({
    embeds: [
      new Embed().setTitle("No heja").addField(
        "Redukcja obrażeń:",
        `${Math.floor(100 / (100 + pancerz) * 100)}%`,
      ),
    ],
  })
})

client.interactions.handle("unik", (d: SlashCommandInteraction) => {
  const snek = ~~d.option<number>("unik")
  let dmg = ~~d.option<number>("dmg")
  const armor = ~~d.option<number>("pancerz")

  //80 - 100% żeby lekko zmniejszyć dmg
  dmg = Math.floor(dmg * (0.8 + (genRandom(0, 20) / 100)))

  const okay = genRandom(1, 100)
  const pvpPoints = Math.floor(okay / 2.5)

  const embed = new Embed().setTitle("No siemka")

  if (okay > snek) {
    if (armor > 0) {
      dmg = Math.floor(dmg * (100 / (100 + armor)))
    }

    embed.addField(
      "Informacje:",
      `[${pvpPoints}] Niestety, unik się nie udał...\n Otrzymałeś od życia ${dmg} w tyłek`,
    ).setColor("#ff0000").setFooter(`${snek}|${dmg}|${armor}`)
  } else {
    embed.addField(
      "Informacje:",
      `[${pvpPoints}] Twój unik się udał!`,
    ).setColor("#00ff00").setFooter(`${snek}|${dmg}|${armor}`)
  }

  d.respond({
    embeds: [embed],
    components: replayComponent("unik"),
  })
})

client.interactions.handle(
  "autorole stworz",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return
    if (d.guild === undefined) return

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      })
    }

    d.defer()

    const embed = new Embed().setTitle(d.option<string>("tytuł"))
      .addField("Opis", d.option<string>("opis"))

    if (d.option<InteractionChannel | undefined>("kanał") !== undefined) {
      const channel = d.option<InteractionChannel>("kanał")

      const message = await client.channels.sendMessage(channel.id, {
        embeds: [embed],
      })

      await message.edit({ embeds: [embed.setFooter(`ID: ${message.id}`)] })
    } else {
      //Won't be empty string
      const channelID = d.channel?.id ?? ""

      const message = await client.channels.sendMessage(channelID, {
        embeds: [embed],
      })

      await message.edit({ embeds: [embed.setFooter(`ID: ${message.id}`)] })
    }

    d.editResponse({
      content: "Zrobione!",
    })
  },
)

client.interactions.handle(
  "autorole dodaj",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return
    if (d.guild === undefined) return

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      })
    }

    const guild = d?.guild!

    const msgID = d.option<string>("wiadomosc")

    const role = d.option<Role>("rola")
    const channel = d.option<InteractionChannel>("kanał")

    await d.defer()

    const resolvedChannel = (await guild.channels.fetch(channel.id))!

    if (!resolvedChannel.isText()) {
      return await d.respond({
        content: "Zły kanał",
      })
    }

    let msg

    try {
      msg = await resolvedChannel.messages.fetch(msgID)
    } catch (_e) {
      return await d.respond({
        content: "Złe id menu",
      })
    }

    if (msg.author.id !== "622783718783844356") {
      return await d.respond({
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
      return await d.respond({
        content: "Przycisk z tą rolą już istnieje...",
      })
    }

    flatComponents.push(newButton)

    if (flatComponents.length > 25) {
      return await d.respond({
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
      await d.editResponse({
        content: "Zrobione!",
      })

      msg.edit({
        content: msg.content,
        embeds: msg.embeds,
        components,
      })
    } catch (_e) {
      await d.editResponse(
        {
          content:
            `Nie mam uprawnienień do tego (usuwanie wiadomości, tworzenie nowych wiadomości na <#${resolvedChannel.id}>)`,
        },
      )
    }
  },
)

client.interactions.handle(
  "autorole usun",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return
    if (d.guild === undefined) return

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      })
    }

    const guild = d.guild!

    const msgID = d.option<string>("wiadomosc")

    const role = d.option<Role>("rola")
    const channel = d.option<InteractionChannel>("kanał")

    await d.defer()

    const resolvedChannel = (await guild.channels.fetch(channel.id))!

    if (!resolvedChannel.isText()) {
      return await d.respond({
        content: "Zły kanał",
      })
    }

    let msg

    try {
      msg = await resolvedChannel.messages.fetch(msgID)
    } catch (_e) {
      return await d.respond({
        content: "Złe id menu",
      })
    }

    if (msg.author.id !== "622783718783844356") {
      return await d.respond({
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

    const buttonIndex = flatComponents.findIndex((elt) =>
      (elt as ButtonComponent).customID === newButton.customID
    )

    if (buttonIndex === -1) {
      return await d.respond({
        content: "W menu nie ma takiej roli...",
      })
    }

    flatComponents.splice(buttonIndex, 1)

    const splitted = chunk(flatComponents, 5)
    const components: ActionRowComponent[] = []

    for (const arr of splitted) {
      components.push({
        type: MessageComponentType.ActionRow,
        components: arr,
      })
    }

    try {
      await d.editResponse({
        content: "Zrobione!",
      })

      msg.edit({
        content: msg.content,
        embeds: msg.embeds,
        components,
      })
    } catch (_e) {
      await d.editResponse(
        {
          content:
            `Nie mam uprawnienień do tego (usuwanie wiadomości, tworzenie nowych wiadomości na <#${resolvedChannel.id}>)`,
        },
      )
    }
  },
)

client.interactions.handle("*", (d: SlashCommandInteraction) => {
  d.reply({
    flags: InteractionResponseFlags.EPHEMERAL,
    content: "Jeszcze nie zrobione, wróć później",
  })
})

client.on("interactionCreate", async (i) => {
  if (!i.isMessageComponent()) return

  if (i.data.custom_id === "atak/r") {
    const data = i.message.embeds[0].footer!.text
      .split("|")
      .map((elt) => ~~elt)

    const okay = genRandom(0, 40) + data[1]
    const lvl = data[0] - 1

    const [crit, dmg] = calculateDamage(
      lvl,
      data[2],
      data[3],
      data[4],
    )

    const embed = generateAttaackEmbed(okay, crit, dmg)

    embed.setFooter(i.message.embeds[0].footer!.text)

    return i.respond({
      embeds: [embed],
      components: replayComponent("atak"),
    })
  }

  if (i.data.custom_id === "unik/r") {
    const data = i.message.embeds[0].footer!.text
      .split("|")
      .map((elt) => ~~elt)

    const snek = data[0]
    let dmg = data[1]
    const armor = data[2]

    //80 - 100% żeby lekko zmniejszyć dmg
    dmg = Math.floor(dmg * (0.8 + (genRandom(0, 20) / 100)))

    const okay = genRandom(1, 100)
    const pvpPoints = Math.floor(okay / 2.5)

    const embed = new Embed().setTitle("No siemka")

    if (okay > snek) {
      if (armor > 0) {
        dmg = Math.floor(dmg * (100 / (100 + armor)))
      }

      embed.addField(
        "Informacje:",
        `[${pvpPoints}] Niestety, unik się nie udał...\n Otrzymałeś od życia ${dmg} w tyłek`,
      ).setColor("#ff0000").setFooter(i.message.embeds[0].footer!.text)
    } else {
      embed.addField(
        "Informacje:",
        `[${pvpPoints}] Twój unik się udał!`,
      ).setColor("#00ff00").setFooter(i.message.embeds[0].footer!.text)
    }

    i.respond({
      embeds: [embed],
      components: replayComponent("unik"),
    })
  }

  if (i.data.custom_id.startsWith("a/")) {
    const roleID = i.data.custom_id.split("/")[1]!
    if (i.member === undefined) {
      return await i.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Użyj w serwerze...",
      })
    }

    try {
      const hasRole = (await i.member.roles.array()).find((elt) =>
        elt.id === roleID
      ) !== undefined

      if (hasRole) {
        await i.member.roles.remove(roleID)
      } else {
        await i.member.roles.add(roleID)
      }

      return await i.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: hasRole ? "Zabrano role" : "Dodano role",
      })
    } catch (_e) {
      await i.respond(
        {
          content: `Nie mam uprawnienień do tego (edytowanie roli na <#${i.channel!.id
            }>)`,
        },
      )
    }
  }
})

function hasPerms(member: Member): boolean {
  if (member.guild.ownerID === member.id) {
    return true
  }

  if (member.permissions.has(PermissionFlags.ADMINISTRATOR)) {
    return true
  }

  return false
}

function replayComponent(cid: string): MessageComponentData[] {
  return [
    {
      type: MessageComponentType.ActionRow,
      components: [
        createButton({
          label: "Jeszcze raz",
          customID: cid + "/r",
        }),
      ],
    },
  ]
}

client.interactions.on("interactionError", console.log)
client.on("debug", console.log)
await client.connect(undefined, Intents.NonPrivileged)