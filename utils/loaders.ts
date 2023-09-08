import { SlashCommandInteraction, ApplicationCommandPartial, SlashCommandOption } from "../deps.ts"

export type Command = {
  /** could be a harmony subcommand string too */
  name: string
  execute: (cmd: SlashCommandInteraction) => void
}

export async function loadSlashCommands() {
  const localCommands: Command[] = []
  const typeDefs: ApplicationCommandPartial[] = []

  for (const file of [...Deno.readDirSync(`${getPath()}/commands`)]) {
    if (file.isSymlink) continue

    if (file.isFile && file.name.endsWith('.ts') || file.name.endsWith('.js')) {
      const { Typedef, Execute } = await import(`file://${getPath()}/commands/${file.name}`) as { Typedef: ApplicationCommandPartial, Execute: (cmd: SlashCommandInteraction) => void }
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

  return { localCommands, typeDefs }
}

async function readDirectory(dir: string, file: Deno.DirEntry) {
  const contents = [...Deno.readDirSync(`${getPath()}/${dir}/${file.name}`)]
  const localCommands: Command[] = []

  const modFile = contents.findIndex(elt => elt.name === 'mod.ts')
  let localTypedef: ApplicationCommandPartial | undefined = undefined

  if (modFile !== -1) {
    const { Typedef, Execute } = await import(`file://${getPath()}/commands/${file.name}/mod.ts`) as { Typedef: ApplicationCommandPartial, Execute: (cmd: SlashCommandInteraction) => void }
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
    const { Typedef, Execute } = await import(`file://${getPath()}/commands/${file.name}/${subcommand.name}`) as { Typedef: SlashCommandOption, Execute: (cmd: SlashCommandInteraction) => void }

    if (localTypedef.options === undefined) {
      localTypedef.options = []
    }

    localTypedef!.options!.push(Typedef)
    localCommands.push({ name: `${localTypedef.name} ${Typedef.name}`, execute: Execute })
  }

  return { localCommands, localTypedef }
}

function getPath() {
  const url = decodeURI(new URL(import.meta.url).pathname).split('/')

  if (Deno.build.os === 'windows') { url.shift() }
  
  url.pop()
  url.pop()

  return url.join('/')
}