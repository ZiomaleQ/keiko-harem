import { deploy } from "./deps.ts";
import { chunk, genRandom, graphql } from "./utils.ts";

deploy.init({ env: true });

// if (Deno.env.get("SYNC") === "TRUE") {
//   const commands = await deploy.commands.all();

// const slashCommands: deploy.ApplicationCommandPartial[] = [
//   {
//     name: "anime",
//     description: "Info a anime",
//     options: [
//       {
//         name: "nazwa",
//         description: "Nazwa anime którego szukasz",
//         type: "STRING",
//         required: true,
//       },
//     ],
//   },
//   {
//     name: "atak",
//     description: "Atakowańsko",
//     options: [
//       {
//         name: "lvl",
//         description: "Poziom postaci!",
//         type: "INTEGER",
//         minValue: 1,
//         required: true,
//       },
//       {
//         name: "modif",
//         description: "Modyfikator trafienia!",
//         type: "INTEGER",
//         minValue: 0,
//       },
//       {
//         name: "dmg",
//         description: "Dodatkowe 'AD'!",
//         type: "INTEGER",
//         minValue: 0,
//       },
//       {
//         name: "krytyczne",
//         description: "Szansa na kryta!",
//         type: "INTEGER",
//         minValue: 0,
//       },
//       {
//         name: "wartosc-kryt",
//         description: "Mnożnik krytyka!",
//         type: "INTEGER",
//         minValue: 0,
//       },
//     ],
//   },
//   {
//     name: "dice",
//     description: "Losowanko",
//     options: [
//       {
//         name: "max",
//         description: "Maksymalna wartość",
//         type: "INTEGER",
//         required: true,
//       },
//       {
//         name: "min",
//         description: "Minimalna wartość",
//         type: "INTEGER",
//         minValue: 0,
//       },
//     ],
//   },
//   {
//     name: "pancerz",
//     description: "Oblicz zmniejszenie obrażeń",
//     options: [
//       {
//         name: "pancerz",
//         description: "Ilość pancerza",
//         type: "INTEGER",
//         required: true,
//         minValue: 0,
//       },
//     ],
//   },
//   {
//     name: "unik",
//     description: "Unikańsko",
//     options: [
//       {
//         name: "unik",
//         description: "Wartość uniku",
//         type: "INTEGER",
//         minValue: 0,
//       },
//       {
//         name: "dmg",
//         description: "Obrażenia jakie dostajesz",
//         type: "INTEGER",
//         minValue: 0,
//       },
//       {
//         name: "pancerz",
//         description: "Pancerz postaci",
//         type: "INTEGER",
//         minValue: 0,
//       },
//     ],
//   },
//   {
//     name: "autorole",
//     description: "Autorolowańsko",
//     options: [
//       {
//         type: "SUB_COMMAND",
//         name: "dodaj",
//         description: "Dodaj role do menu",
//         options: [
//           {
//             type: "ROLE",
//             name: "rola",
//             description: "Rola jaką dodać",
//             required: true,
//           },
//           {
//             type: "STRING",
//             name: "wiadomosc",
//             description: "ID menu",
//             required: true,
//           },
//           {
//             name: "kanał",
//             description: "Kanał na którym znajduje się menu",
//             type: "CHANNEL",
//             required: true,
//           },
//         ],
//       },
//       {
//         type: "SUB_COMMAND",
//         name: "usun",
//         description: "Usun role z menu",
//         options: [
//           {
//             type: "ROLE",
//             name: "rola",
//             description: "Rola jaką usunąć",
//             required: true,
//           },
//           {
//             type: "STRING",
//             name: "wiadomosc",
//             description: "ID menu",
//             required: true,
//           },
//           {
//             name: "kanał",
//             description: "Kanał na którym znajduje się menu",
//             type: "CHANNEL",
//             required: true,
//           },
//         ],
//       },
//       {
//         type: "SUB_COMMAND",
//         name: "stworz",
//         description: "Stworz nowe menu",
//         options: [
//           {
//             name: "tytuł",
//             description: "Tytuł wiadomości",
//             type: "STRING",
//             required: true,
//           },
//           {
//             name: "opis",
//             description: "Opis menu",
//             type: "STRING",
//             required: true,
//           },
//           {
//             name: "kanał",
//             description: "Kanał na który wysłać wiadomość",
//             type: "CHANNEL",
//             required: false,
//           },
//         ],
//       },
//     ],
//   },
// ];

// if (commands.size != slashCommands.length) {
//   console.log("updated commands");
// deploy.commands.bulkEdit(slashCommands);
//   }
// }

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

  embed.setFooter(
    `${~~d.option<number>("lvl")}|${~~d.option<number>("modif")}|${~~d.option<
      number
    >("dmg")}|${~~d.option<number>("krytyczne")}|${~~d.option<number>(
      "wartosc-kryt",
    )}`,
  );

  d.respond({
    embeds: [embed],
    components: [
      {
        type: deploy.MessageComponentType.ActionRow,
        components: [
          {
            type: deploy.MessageComponentType.Button,
            label: "Jeszcze raz",
            style: deploy.ButtonStyle.PRIMARY,
            customID: "atak/r",
          },
        ],
      },
    ],
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
        ).setColor("#ff0000").setFooter(`${snek}|${dmg}|${armor}`),
      ],
      components: [
        {
          type: deploy.MessageComponentType.ActionRow,
          components: [
            {
              type: deploy.MessageComponentType.Button,
              label: "Jeszcze raz",
              style: deploy.ButtonStyle.PRIMARY,
              customID: "unik/r",
            },
          ],
        },
      ],
    });
  } else {
    d.respond({
      embeds: [
        new deploy.Embed().setTitle("No siemka").addField(
          "Informacje:",
          `[${Math.floor(okay / 2.5)}] Twój unik się udał!`,
        ).setColor("#00ff00").setFooter(`${snek}|${dmg}|${armor}`),
      ],
      components: [
        {
          type: deploy.MessageComponentType.ActionRow,
          components: [
            {
              type: deploy.MessageComponentType.Button,
              label: "Jeszcze raz",
              style: deploy.ButtonStyle.PRIMARY,
              customID: "unik/r",
            },
          ],
        },
      ],
    });
  }
});

deploy.handle("autorole stworz", async (d: deploy.SlashCommandInteraction) => {
  if (d.message?.author.id !== d.guild?.ownerID) {
    return d.respond({
      flags: deploy.InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś właścicielem",
    });
  }

  d.defer();

  const embed = new deploy.Embed().setTitle(d.option<string>("tytuł"))
    .addField("Opis", d.option<string>("opis"));

  if (d.option<deploy.InteractionChannel | undefined>("kanał") !== undefined) {
    const channel = d.option<deploy.InteractionChannel>("kanał");

    const message: deploy.Message = await deploy.client.rest.api
      .channels[channel.id].messages.post({ embeds: [embed] });

    await deploy.client.rest.api.channels[channel.id].messages[message.id]
      .patch({ embeds: [embed.setFooter(`ID: ${message.id}`)] });
  } else {
    //Won't be empty string
    const channelID = d.channel?.id ?? "";
    const message: deploy.Message = await deploy.client.rest.api
      .channels[channelID].messages.post({ embeds: [embed] });

    await deploy.client.rest.api.channels[channelID].messages[message.id]
      .patch({ embeds: [embed.setFooter(`ID: ${message.id}`)] });
  }

  d.editResponse({
    content: "Zrobione!",
  });
});

deploy.handle("autorole dodaj", async (d: deploy.SlashCommandInteraction) => {
  if (d.message?.author.id !== d.guild?.ownerID) {
    return await d.respond({
      flags: deploy.InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś właścicielem",
    });
  }

  const msgID = d.option<string>("wiadomosc");
  // deno-lint-ignore no-explicit-any
  const role = d.option("rola") as any;
  const channel = d.option<deploy.InteractionChannel>("kanał");

  d.defer();

  let message: deploy.Message;

  try {
    message = await deploy.client.rest.api
      .channels[channel.id]
      .messages[msgID].get();
  } catch (_e) {
    return await d.respond({
      content: "Złe id menu",
    });
  }

  const component: deploy.ButtonComponent = {
    type: deploy.MessageComponentType.Button,
    label: role.name,
    style: 1,
    customID: "a/" + role.id,
  };

  const flattenedComponents: deploy.ButtonComponent[] = message.components
    .flatMap((elt) =>
      (elt as deploy.ActionRowComponent).components
    ) as unknown as deploy.ButtonComponent[];

  const alreadyExists = flattenedComponents.find((elt) =>
    elt.customID === component.customID
  ) !== undefined;

  if (alreadyExists) {
    return await d.respond({
      content: "Przycisk z tą rolą już istnieje...",
    });
  }

  flattenedComponents.push(component);

  if (flattenedComponents.length > 25) {
    return await d.respond({
      content: "Nie można dodać więcej przyciskow...",
    });
  }

  const splitted = chunk(flattenedComponents, 5);
  const components = [];

  for (const arr of splitted) {
    components.push({
      type: deploy.MessageComponentType.ActionRow,
      components: arr,
    });
  }
  console.log({ embeds: message.embeds, components })

  await deploy.client.rest.api.channels[channel.id].messages[msgID]
    .patch({ embeds: message.embeds, components });

  await d.editResponse({
    content: "Zrobione!",
  });
});

deploy.handle("autorole usun", (d: deploy.SlashCommandInteraction) => {
  d.reply("XD2");
});

deploy.client.on("interaction", (i) => {
  if (!i.isMessageComponent()) return;

  if (i.data.custom_id === "atak/r") {
    const data = i.message.embeds[0].footer!.text
      .split("|")
      .map((elt) => ~~elt);

    const okay = genRandom(0, 40) + data[1];
    const lvl = data[0] - 1;
    let dmg = genRandom(0, lvl * 5) + lvl * 10 + data[2] + 30;

    const crit = data[3];
    const critVal = data[4];
    const goCrit = (genRandom(0, 100) > crit && crit > 0) || crit == 100;

    if (goCrit) dmg *= critVal <= 0 ? 2 : critVal / 100;

    const embed = new deploy.Embed().setTitle("No siemka");

    if (okay >= 15) {
      embed.addField(
        "Informacje:",
        `[${okay}] Trafiłeś${
          goCrit ? " krytycznie" : ""
        }, zadałeś ${dmg} obrażeń.`,
      ).setColor("#00ff00").setFooter(i.message.embeds[0].footer!.text);
    } else {
      embed.addField("Informacje:", `[${okay}] Niestety, atak się nie udał...`)
        .setColor("#ff0000").setFooter(i.message.embeds[0].footer!.text);
    }

    return i.respond({
      embeds: [embed],
      components: [
        {
          type: deploy.MessageComponentType.ActionRow,
          components: [
            {
              type: deploy.MessageComponentType.Button,
              label: "Jeszcze raz",
              style: deploy.ButtonStyle.PRIMARY,
              customID: "atak/r",
            },
          ],
        },
      ],
    });
  }

  if (i.data.custom_id === "unik/r") {
    const data = i.message.embeds[0].footer!.text
      .split("|")
      .map((elt) => ~~elt);

    const snek = data[0];
    let dmg = data[1];
    const armor = data[2];

    //80 - 100% żeby lekko zmniejszyć dmg
    dmg = Math.floor(dmg * (0.8 + (genRandom(0, 20) / 100)));

    const okay = genRandom(1, 100);

    if (okay > snek) {
      if (armor > 0) {
        dmg = dmg * (100 / (100 + armor));
      }
      return i.respond({
        embeds: [
          new deploy.Embed().setTitle("No siemka").addField(
            "Informacje:",
            `[${
              Math.floor(okay / 2.5)
            }] Niestety, unik się nie udał...\n Otrzymałeś od życia ${
              Math.floor(dmg)
            } w tyłek`,
          ).setColor("#ff0000").setFooter(i.message.embeds[0].footer!.text),
        ],
        components: [
          {
            type: deploy.MessageComponentType.ActionRow,
            components: [
              {
                type: deploy.MessageComponentType.Button,
                label: "Jeszcze raz",
                style: deploy.ButtonStyle.PRIMARY,
                customID: "unik/r",
              },
            ],
          },
        ],
      });
    } else {
      return i.respond({
        embeds: [
          new deploy.Embed().setTitle("No siemka").addField(
            "Informacje:",
            `[${Math.floor(okay / 2.5)}] Twój unik się udał!`,
          ).setColor("#00ff00").setFooter(i.message.embeds[0].footer!.text),
        ],
        components: [
          {
            type: deploy.MessageComponentType.ActionRow,
            components: [
              {
                type: deploy.MessageComponentType.Button,
                label: "Jeszcze raz",
                style: deploy.ButtonStyle.PRIMARY,
                customID: "unik/r",
              },
            ],
          },
        ],
      });
    }
  }
});
