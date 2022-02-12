import { deploy } from "./deps.ts";
import { genRandom, graphql } from "./utils.ts";

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
  {
    name: "atak",
    description: "Atakowańsko",
    options: [
      {
        name: "lvl",
        description: "Poziom postaci!",
        type: "INTEGER",
        minValue: 1,
        required: true,
      },
      {
        name: "modif",
        description: "Modyfikator trafienia!",
        type: "INTEGER",
        minValue: 0,
      },
      {
        name: "dmg",
        description: "Dodatkowe 'AD'!",
        type: "INTEGER",
        minValue: 0,
      },
      {
        name: "krytyczne",
        description: "Szansa na kryta!",
        type: "INTEGER",
        minValue: 0,
      },
      {
        name: "wartosc-kryt",
        description: "Mnożnik krytyka!",
        type: "INTEGER",
        minValue: 0,
      },
    ],
  },
  {
    name: "dice",
    options: [
      {
        name: "max",
        description: "Maksymalna wartość",
        type: "INTEGER",
        required: true,
      },
      {
        name: "min",
        description: "Minimalna wartość",
        type: "INTEGER",
        minValue: 0,
      },
    ],
  },
];

if (commands.size != slashCommands.length) {
  console.log("Updating commands");
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

  d.defer(true);

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
    // deno-lint-ignore no-explicit-any
    data.studios.nodes.map((elt: any) => elt.name).join(", "),
    true,
  );

  d.editResponse({
    embeds: [embed],
  });
});

deploy.handle("atak", (d: deploy.SlashCommandInteraction) => {
  d.defer(true);

  const okay = genRandom(0, 40) + d.option<number>("modif");
  const lvl = d.option<number>("lvl") - 1;
  let dmg = genRandom(0, lvl * 5) + lvl * 10 + d.option<number>("dmg") + 30;

  const crit = d.option<number>("krytyczne");
  const critVal = d.option<number>("wartosc-kryt");
  const goCrit = genRandom(0, 100) > crit && crit > 0 || crit == 100;

  if (goCrit) dmg *= critVal <= 0 ? 2 : critVal / 100;

  const embed = new deploy.Embed().setTitle("No siemka");

  if (okay >= 15) {
    embed.addField(
      "Informacje:",
      `[${okay}] Trafiłeś${
        goCrit ? " krytycznie" : ""
      }, zadałeś ${dmg} obrażeń.`,
    ).setColor("#00ff00");
  } else {
    embed.addField("Informacje:", `[${okay}] Niestety, atak się nie udał...`)
      .setColor("#ff0000");
  }

  d.editResponse({
    embeds: [embed],
  });
});

deploy.handle("dice", (d: deploy.SlashCommandInteraction) => {
  const max = Math.abs(d.option<number>("max"));
  const min = Math.abs(d.option<number>("min"));

  return d.respond({
    embeds: [
      new deploy.Embed().setTitle("No siemka").addField(
        "Informacje:",
        `Wylosowałam: __***\`${genRandom(min, max)}\`***__.`,
      ).setColor("#00ff00"),
    ],
  });
});
