import { config } from "./config.ts"
import {
  Client, Intents, InteractionResponseFlags, SlashCommandInteraction
} from "./deps.ts"
import { loadSlashCommands } from "./utils/loaders.ts"

const client = new Client({ token: Deno.args[0] == 'test' ? config.TEST_TOKEN : config.TOKEN })

client.on("ready", async () => {
  const commands = await client.interactions.commands.all()
  const { localCommands, typeDefs } = await loadSlashCommands()

  if (commands.size != typeDefs.length) {
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
          content: `Nie mam uprawnienień do tego (edytowanie roli na <#${i.channel!.id}>)`,
        },
      )
    }
  }
})

client.interactions.autocomplete("meme", "nazwa", (d) => {
  const memeName = d.option<string>("nazwa")?.toLowerCase() ?? ""

  const memeNames = ["futureme"]

  const matchingMemes = memeNames.filter((elt) =>
    elt.toLowerCase().startsWith(memeName)
  )

  d.autocomplete(
    matchingMemes.map((elt) => ({ name: elt, value: elt })),
  )
})

client.interactions.on("interactionError", console.log)
client.on("debug", console.log)
await client.connect(undefined, Intents.NonPrivileged)