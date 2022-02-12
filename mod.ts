import { deploy } from "./deps.ts";
import { genRandom, graphql } from "./utils.ts";

deploy.init({ env: true });

console.log(Deno.env.get("SYNC"))

if (Deno.env.get("SYNC") === "TRUE") {
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
      description: "Losowanko",
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
    {
      name: "pancerz",
      description: "Oblicz zmniejszenie obrażeń",
      options: [
        {
          name: "pancerz",
          description: "Ilość pancerza",
          type: "INTEGER",
          required: true,
          minValue: 0,
        },
      ],
    },
    {
      name: "unik",
      description: "Unikańsko",
      options: [
        {
          name: "unik",
          description: "Wartość uniku",
          type: "INTEGER",
          minValue: 0,
        },
        {
          name: "dmg",
          description: "Obrażenia jakie dostajesz",
          type: "INTEGER",
          minValue: 0,
        },
        {
          name: "pancerz",
          description: "Pancerz postaci",
          type: "INTEGER",
          minValue: 0,
        },
      ],
    },
  ];

  if (commands.size != slashCommands.length) {
    console.log("updated commands");
    deploy.commands.bulkEdit(slashCommands);
  }
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

  const okay = genRandom(0, 40) + ~~d.option<number>("modif");
  const lvl = d.option<number>("lvl") - 1;
  let dmg = genRandom(0, lvl * 5) + lvl * 10 + ~~d.option<number>("dmg") + 30;

  const crit = ~~d.option<number>("krytyczne");
  const critVal = ~~d.option<number>("wartosc-kryt");
  const goCrit = (genRandom(0, 100) > crit && crit > 0) || crit == 100;

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
  const min = Math.abs(~~d.option<number>("min"));

  return d.respond({
    embeds: [
      new deploy.Embed().setTitle("No siemka").addField(
        "Informacje:",
        `Wylosowałam: __***\`${genRandom(min, max)}\`***__.`,
      ).setColor("#00ff00"),
    ],
  });
});

deploy.handle("pancerz", (d: deploy.SlashCommandInteraction) => {
  const pancerz = d.option<number>("pancerz");

  return d.respond({
    embeds: [
      new deploy.Embed().setTitle("No heja").addField(
        "Redukcja obrażeń:",
        `${Math.floor(100 / (100 + pancerz) * 100)}%`,
      ),
    ],
  });
});

deploy.handle("unik", (d: deploy.SlashCommandInteraction) => {
  const snek = ~~d.option<number>("unik");
  let dmg = ~~d.option<number>("dmg");
  const armor = ~~d.option<number>("pancerz");

  //80 - 100% żeby lekko zmniejszyć dmg
  dmg = Math.floor(dmg * (0.8 + (genRandom(0, 20) / 100)));

  const okay = genRandom(1, 100);

  if (okay > snek) {
    if (armor > 0) {
      dmg = dmg * (100 / (100 + armor));
    }
    d.respond({
      embeds: [
        new deploy.Embed().setTitle("No siemka").addField(
          "Informacje:",
          `[${
            Math.floor(okay / 2.5)
          }] Niestety, unik się nie udał...\n Otrzymałeś od życia ${
            Math.floor(dmg)
          } w tyłek`,
        ).setColor("#ff0000"),
      ],
    });
  } else {
    d.respond({
      embeds: [
        new deploy.Embed().setTitle("No siemka").addField(
          "Informacje:",
          `[${Math.floor(okay / 2.5)}] Twój unik się udał!`,
        ).setColor("#00ff00"),
      ],
    });
  }
});
