import { config } from "./config.ts"
import {
  ApplicationCommandPartial, CommandClient, Intents,
  InteractionResponseFlags, SlashCommandInteraction, SlashCommandOption
} from "./deps.ts"

const client = new CommandClient({ token: config.TOKEN, prefix: "keiko!" })

type Command = {
  /** could be a harmony subcommand string too */
  name: string
  execute: (cmd: SlashCommandInteraction) => void
}

async function readDirectory(dir: string, file: Deno.DirEntry) {
  const contents = [...Deno.readDirSync(`./${dir}/${file.name}`)]
  const localCommands: Command[] = []

  const modFile = contents.findIndex(elt => elt.name === 'mod.ts')
  let localTypedef: ApplicationCommandPartial | undefined = undefined

  if (modFile !== -1) {
    const { Typedef, Execute } = await import(`${config.PATH}/commands/${file.name}/mod.ts`) as { Typedef: ApplicationCommandPartial, Execute: (cmd: SlashCommandInteraction) => void }
    localTypedef = Typedef

    if (Execute !== undefined) {
      localCommands.push({ name: Typedef.name, execute: Execute })
    }

    contents.splice(modFile, 1)
  } else {
    localTypedef = { name: file.name, description: "No description" }
  }

  for (const subcommand of contents) {
    if (!subcommand.isFile && subcommand.name.endsWith('.ts') || subcommand.name.endsWith('.js')) continue
    const { Typedef, Execute } = await import(`${config.PATH}/commands/${file.name}/${subcommand.name}`) as { Typedef: SlashCommandOption, Execute: (cmd: SlashCommandInteraction) => void }

    if (localTypedef.options === undefined) {
      localTypedef.options = []
    }

    localTypedef!.options!.push(Typedef)
    localCommands.push({ name: `${localTypedef.name} ${Typedef.name}`, execute: Execute })
  }

  return { localCommands, localTypedef }
}

client.on("ready", async () => {
  const commands = await client.interactions.commands.all()

  const localCommands: Command[] = []
  const typeDefs: ApplicationCommandPartial[] = []

  for (const file of [...Deno.readDirSync(`${config.PATH}/commands`)]) {
    if (file.isSymlink) continue

    if (file.isFile && file.name.endsWith('.ts') || file.name.endsWith('.js')) {
      const { Typedef, Execute } = await import(`${config.PATH}/commands/${file.name}`) as { Typedef: ApplicationCommandPartial, Execute: (cmd: SlashCommandInteraction) => void }
      typeDefs.push(Typedef)
      localCommands.push({ name: Typedef.name, execute: Execute })
      continue
    }

    if (file.isDirectory) {

      const { localTypedef, localCommands: commands } = await readDirectory('commands', file)

      localCommands.push(...commands)
      typeDefs.push(localTypedef)

      continue
    }
  }

  if (commands.size != localCommands.length) {
    console.log("Updated commands")
    client.interactions.commands.bulkEdit(typeDefs).catch(console.error)
  }

  localCommands.forEach((command) => { client.interactions.handle(command.name, command.execute) })

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

client.on("messageCreate", (msg) => {
  for (const relay of config.RELAY) {
    if (msg.guild?.id === relay.GUILD_ID && msg.channel.id === relay.CHANNEL_ID) {

      const messageBody = {
        content: msg.content + (msg.attachments.length + (msg.stickerItems?.length ?? 0) > 0 ? msg.content.length > 0 ? "\n" : "" + "{ATTACHMENTS: (" + [...msg.attachments, ...(msg.stickerItems?.map(elt => ({ url: 'https://cdn.discordapp.com/stickers/' + elt.id + '.png' })) ?? [])].map((elt, i) => `[item: ${i}](${elt.url})`).join(", ") + ")}" : ""),
        avatar_url: msg.author.avatarURL(),
        username: msg.member?.displayName ?? msg.author.username,
        embeds: msg.embeds,
      }

      fetch(config.GUILDED_RELAY_URL, {
        method: "POST", body: JSON.stringify(messageBody), headers: {
          "Content-Type": "application/json",
        }
      })
    }
  }
})

client.interactions.handle("*", (d: SlashCommandInteraction) => {
  d.reply({
    flags: InteractionResponseFlags.EPHEMERAL,
    content: "Jeszcze nie zrobione, wróć później",
  })
})

client.on("interactionCreate", async (i) => {
  if (!i.isMessageComponent()) return

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

client.interactions.on("interactionError", console.log)
client.on("debug", console.log)
await client.connect(undefined, Intents.NonPrivileged)