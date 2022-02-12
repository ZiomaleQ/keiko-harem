import { deploy } from "./deps.ts";
import { graphql } from "./utils.ts";

deploy.init({ env: true });

const commands = await deploy.commands.all();

const slashCommands: deploy.ApplicationCommandPartial[] = [
  {
    name: "anime",
    description: "Info a anime",
    options: [
      {
        name: "nazwa",
        description: "Nazwa anime którego szukasz",
        type: "STRING",
        required: true,
      },
    ],
  },
];

if (commands.size != slashCommands.length) {
  deploy.commands.bulkEdit(slashCommands);
}

deploy.handle("anime", async (d: deploy.SlashCommandInteraction) => {
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
  });

  d.defer();

  const res = (await req.then((resp) => resp.json()));

  if (res.errors && res.errors.length > 0) {
    return d.editResponse({
      ephemeral: true,
      content: "Nie znalazłam tego anime...",
    });
  }

  const data = res.data.Media;

  const embed = new deploy.Embed().setTitle("Bonjour!").addField(
    "Tytuł:",
    data.title.english,
    true,
  )
    .setColor(data.coverImage.color).setImage(data.coverImage.large).addField(
      "Status:",
      data.status,
      true,
    )
    .addField("Liczba odcinków:", data.episodes, true).addField(
      "Przeczytaj więcej na",
      data.siteUrl,
      true,
    )
    .addField("NSFW?", data.isAdult ? "Tak" : "Nie", true).addField(
      "Jak inaczej to nazwać?",
      data.synonyms.join(", "),
      true,
    )
    .addField(
      "Data pierwszego odcinka:",
      `${data.startDate.day}.${data.startDate.month}.${data.startDate.year}`,
      true,
    )
    .addField(
      "Studia:",
      // deno-lint-ignore no-explicit-any
      data.studios.nodes.map((elt: any) => elt.name).join(", "),
      true,
    );

  d.editResponse({
    embeds: [embed],
  });
});
