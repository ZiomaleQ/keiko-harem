import { ApplicationCommandPartial, Embed, SlashCommandInteraction } from "../deps.ts";
import { graphql } from "../utils.ts";

export const Typedef: ApplicationCommandPartial = {
  "name": "anime",
  "description": "Info a anime",
  "options": [
    {
      "name": "nazwa",
      "description": "Nazwa anime którego szukasz",
      "type": "STRING",
      "required": true
    }
  ]
}

export const Execute = async(interaction: SlashCommandInteraction) => {
  const req = fetch("https://graphql.anilist.co", {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      "query": graphql.MEDIA_QUERY,
      "variables": { search: interaction.option<string>("nazwa"), type: "ANIME" },
    }),
    method: "POST",
  })

  interaction.defer()

  const res = (await req.then((resp) => resp.json()))

  if (res.errors && res.errors.length > 0) {
    return interaction.editResponse({
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

  interaction.editResponse({
    embeds: [embed],
  })
}