import { config } from "./config.ts";
import {
  ActionRowComponent,
  ApplicationCommandPartial,
  ButtonComponent,
  ButtonStyle,
  CommandClient,
  Embed,
  Intents,
  InteractionChannel,
  InteractionResponseFlags,
  MessageComponentType,
  Role,
  SlashCommandInteraction,
  User,
} from "./deps.ts";
import {
  getMoney,
  getMoneyOrCreate,
  getMoneyOrDefault,
} from "./roleplayUtils.ts";
import { chunk, genRandom, graphql } from "./utils.ts";

const client = new CommandClient({ token: config.TOKEN, prefix: "keiko!" });

client.on("ready", async () => {
  const commands = await client.interactions.commands.all();

  const slashCommands: ApplicationCommandPartial[] = [
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
    {
      name: "autorole",
      description: "Autorolowańsko",
      options: [
        {
          type: "SUB_COMMAND",
          name: "dodaj",
          description: "Dodaj role do menu",
          options: [
            {
              type: "ROLE",
              name: "rola",
              description: "Rola jaką dodać",
              required: true,
            },
            {
              type: "STRING",
              name: "wiadomosc",
              description: "ID menu",
              required: true,
            },
            {
              name: "kanał",
              description: "Kanał na którym znajduje się menu",
              type: "CHANNEL",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "usun",
          description: "Usun role z menu",
          options: [
            {
              type: "ROLE",
              name: "rola",
              description: "Rola jaką usunąć",
              required: true,
            },
            {
              type: "STRING",
              name: "wiadomosc",
              description: "ID menu",
              required: true,
            },
            {
              name: "kanał",
              description: "Kanał na którym znajduje się menu",
              type: "CHANNEL",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "stworz",
          description: "Stworz nowe menu",
          options: [
            {
              name: "tytuł",
              description: "Tytuł wiadomości",
              type: "STRING",
              required: true,
            },
            {
              name: "opis",
              description: "Opis menu",
              type: "STRING",
              required: true,
            },
            {
              name: "kanał",
              description: "Kanał na który wysłać wiadomość",
              type: "CHANNEL",
              required: false,
            },
          ],
        },
      ],
    },
    {
      name: "money",
      description: "Zarządzanie pieniędzmi!",
      options: [
        {
          type: "SUB_COMMAND",
          name: "dodaj",
          description: "Druknij komuś pieniążki!",
          options: [
            {
              name: "osoba",
              description: "Komu dać?",
              type: "USER",
              required: true,
            },
            {
              type: "NUMBER",
              name: "wartosc",
              description: "Ile mu dać?",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "zabierz",
          description: "Zabierz komuś pieniążki!",
          options: [
            {
              name: "osoba",
              description: "Komu zabrać?",
              type: "USER",
              required: true,
            },
            {
              type: "NUMBER",
              name: "wartosc",
              description: "Ile mu zabrać?",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "reset",
          description: "Przywróć wartości do ustawień początkowych",
          options: [
            {
              name: "osoba",
              description: "Komu zresetować?",
              type: "USER",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "stworz",
          description: "Stworz konto dla bohatera",
          options: [
            {
              name: "postac",
              description: "Bohater dla jakiego konto założyć",
              type: "STRING",
              autocomplete: true,
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "usun",
          description: "Usuń konto bohatera",
          options: [
            {
              name: "postac",
              description: "Bohater dla jakiego konto usunąć",
              type: "STRING",
              autocomplete: true,
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "daj",
          description: "Daj komuś pieniądze",
          options: [
            {
              name: "osoba",
              description: "Komu dać?",
              type: "USER",
              required: true,
            },
            {
              type: "NUMBER",
              name: "wartosc",
              description: "Ile mu dać?",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "stan",
          description: "Sprawdź stan konta",
          options: [
            {
              name: "osoba",
              description: "Kogo konto sprawdzić?",
              type: "USER",
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "tabela",
          description: "Zobacz tabelkę",
        },
      ],
    },
  ];

  if (commands.size != slashCommands.length) {
    console.log("updated commands");
    client.interactions.commands.bulkEdit(slashCommands);
  }

  console.log("Hi, I'm " + client.user?.tag);
});

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
  });

  d.defer();

  const res = (await req.then((resp) => resp.json()));

  if (res.errors && res.errors.length > 0) {
    return d.editResponse({
      content: "Nie znalazłam tego anime...",
    });
  }

  const data = res.data.Media;

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
    // deno-lint-ignore no-explicit-any
    data.studios.nodes.map((elt: any) => elt.name).join(", "),
    true,
  );

  d.editResponse({
    embeds: [embed],
  });
});

client.interactions.handle("atak", (d: SlashCommandInteraction) => {
  const okay = genRandom(0, 40) + ~~d.option<number>("modif");
  const lvl = d.option<number>("lvl") - 1;
  let dmg = genRandom(0, lvl * 5) + lvl * 10 + ~~d.option<number>("dmg") + 30;

  const crit = ~~d.option<number>("krytyczne");
  const critVal = ~~d.option<number>("wartosc-kryt");
  const goCrit = (genRandom(0, 100) > crit && crit > 0) || crit == 100;

  if (goCrit) dmg *= critVal <= 0 ? 2 : critVal / 100;

  const embed = new Embed().setTitle("No siemka");

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
        type: MessageComponentType.ActionRow,
        components: [
          {
            type: MessageComponentType.Button,
            label: "Jeszcze raz",
            style: ButtonStyle.PRIMARY,
            customID: "atak/r",
          },
        ],
      },
    ],
  });
});

client.interactions.handle("dice", (d: SlashCommandInteraction) => {
  const max = Math.abs(d.option<number>("max"));
  const min = Math.abs(~~d.option<number>("min"));

  return d.respond({
    embeds: [
      new Embed().setTitle("No siemka").addField(
        "Informacje:",
        `Wylosowałam: __***\`${genRandom(min, max)}\`***__.`,
      ).setColor("#00ff00"),
    ],
  });
});

client.interactions.handle("pancerz", (d: SlashCommandInteraction) => {
  const pancerz = d.option<number>("pancerz");

  return d.respond({
    embeds: [
      new Embed().setTitle("No heja").addField(
        "Redukcja obrażeń:",
        `${Math.floor(100 / (100 + pancerz) * 100)}%`,
      ),
    ],
  });
});

client.interactions.handle("unik", (d: SlashCommandInteraction) => {
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
        new Embed().setTitle("No siemka").addField(
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
          type: MessageComponentType.ActionRow,
          components: [
            {
              type: MessageComponentType.Button,
              label: "Jeszcze raz",
              style: ButtonStyle.PRIMARY,
              customID: "unik/r",
            },
          ],
        },
      ],
    });
  } else {
    d.respond({
      embeds: [
        new Embed().setTitle("No siemka").addField(
          "Informacje:",
          `[${Math.floor(okay / 2.5)}] Twój unik się udał!`,
        ).setColor("#00ff00").setFooter(`${snek}|${dmg}|${armor}`),
      ],
      components: [
        {
          type: MessageComponentType.ActionRow,
          components: [
            {
              type: MessageComponentType.Button,
              label: "Jeszcze raz",
              style: ButtonStyle.PRIMARY,
              customID: "unik/r",
            },
          ],
        },
      ],
    });
  }
});

client.interactions.handle(
  "autorole stworz",
  async (d: SlashCommandInteraction) => {
    if (d.user.id !== d.guild?.ownerID) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś właścicielem",
      });
    }

    d.defer();

    const embed = new Embed().setTitle(d.option<string>("tytuł"))
      .addField("Opis", d.option<string>("opis"));

    if (d.option<InteractionChannel | undefined>("kanał") !== undefined) {
      const channel = d.option<InteractionChannel>("kanał");

      const message = await client.channels.sendMessage(channel.id, {
        embeds: [embed],
      });

      await message.edit({ embeds: [embed.setFooter(`ID: ${message.id}`)] });
    } else {
      //Won't be empty string
      const channelID = d.channel?.id ?? "";

      const message = await client.channels.sendMessage(channelID, {
        embeds: [embed],
      });

      await message.edit({ embeds: [embed.setFooter(`ID: ${message.id}`)] });
    }

    d.editResponse({
      content: "Zrobione!",
    });
  },
);

client.interactions.handle(
  "autorole dodaj",
  async (d: SlashCommandInteraction) => {
    if (d.user.id !== d.guild?.ownerID) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś właścicielem",
      });
    }

    const guild = d?.guild!;

    const msgID = d.option<string>("wiadomosc");

    const role = d.option<Role>("rola");
    const channel = d.option<InteractionChannel>("kanał");

    await d.defer();

    const resolvedChannel = (await guild.channels.fetch(channel.id))!;

    if (!resolvedChannel.isText()) {
      return await d.respond({
        content: "Zły kanał",
      });
    }

    let msg;

    try {
      msg = await resolvedChannel.messages.fetch(msgID);
    } catch (_e) {
      return await d.respond({
        content: "Złe id menu",
      });
    }

    if (msg.author.id !== "622783718783844356") {
      return await d.respond({
        content: "To menu nie jest moje...",
      });
    }

    const newButton: ButtonComponent = {
      type: MessageComponentType.Button,
      label: role.name,
      style: 1,
      customID: "a/" + role.id,
    };

    const flatComponents = msg.components.flatMap((elt) =>
      (elt as ActionRowComponent).components
    );

    const alreadyExists =
      flatComponents.find((elt) =>
        (elt as ButtonComponent).customID === newButton.customID
      ) !== undefined;

    if (alreadyExists) {
      return await d.respond({
        content: "Przycisk z tą rolą już istnieje...",
      });
    }

    flatComponents.push(newButton);

    if (flatComponents.length > 25) {
      return await d.respond({
        content: "Nie można dodać więcej przyciskow...",
      });
    }

    const splitted = chunk(flatComponents, 5);
    const components: ActionRowComponent[] = [];

    for (const arr of splitted) {
      components.push({
        type: MessageComponentType.ActionRow,
        components: arr,
      });
    }

    try {
      await d.editResponse({
        content: "Zrobione!",
      });

      msg.edit({
        content: msg.content,
        embeds: msg.embeds,
        components,
      });
    } catch (e) {
      console.log(e);
      await d.editResponse(
        {
          content:
            `Nie mam uprawnienień do tego (usuwanie wiadomości, tworzenie nowych wiadomości na <#${resolvedChannel.id}>)`,
        },
      );
    }
  },
);

client.interactions.handle(
  "autorole usun",
  async (d: SlashCommandInteraction) => {
    if (d.user.id !== d.guild?.ownerID) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś właścicielem",
      });
    }

    const guild = d?.guild!;

    const msgID = d.option<string>("wiadomosc");

    const role = d.option<Role>("rola");
    const channel = d.option<InteractionChannel>("kanał");

    await d.defer();

    const resolvedChannel = (await guild.channels.fetch(channel.id))!;

    if (!resolvedChannel.isText()) {
      return await d.respond({
        content: "Zły kanał",
      });
    }

    let msg;

    try {
      msg = await resolvedChannel.messages.fetch(msgID);
    } catch (_e) {
      return await d.respond({
        content: "Złe id menu",
      });
    }

    if (msg.author.id !== "622783718783844356") {
      return await d.respond({
        content: "To menu nie jest moje...",
      });
    }

    const newButton: ButtonComponent = {
      type: MessageComponentType.Button,
      label: role.name,
      style: 1,
      customID: "a/" + role.id,
    };

    const flatComponents = msg.components.flatMap((elt) =>
      (elt as ActionRowComponent).components
    );

    const buttonIndex = flatComponents.findIndex((elt) =>
      (elt as ButtonComponent).customID === newButton.customID
    );

    if (buttonIndex === -1) {
      return await d.respond({
        content: "W menu nie ma takiej roli...",
      });
    }

    flatComponents.splice(buttonIndex, 1);

    const splitted = chunk(flatComponents, 5);
    const components: ActionRowComponent[] = [];

    for (const arr of splitted) {
      components.push({
        type: MessageComponentType.ActionRow,
        components: arr,
      });
    }

    try {
      await d.editResponse({
        content: "Zrobione!",
      });

      msg.edit({
        content: msg.content,
        embeds: msg.embeds,
        components,
      });
    } catch (_e) {
      await d.editResponse(
        {
          content:
            `Nie mam uprawnienień do tego (usuwanie wiadomości, tworzenie nowych wiadomości na <#${resolvedChannel.id}>)`,
        },
      );
    }
  },
);

client.interactions.handle("money stan", async (d: SlashCommandInteraction) => {
  if (d.guild === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś w serwerze...",
    });
  }

  const anotherUser = d.option<User | undefined>("osoba");
  const money = await getMoneyOrCreate(
    anotherUser?.id ?? d.user.id,
    d.guild.id,
  );

  d.respond({ content: "```json\n" + JSON.stringify(money) + "```" });
});

/*

    {
      name: "money",
      description: "Zarządzanie pieniędzmi!",
      options: [
        {
          type: "SUB_COMMAND",
          name: "dodaj",
          description: "Druknij komuś pieniążki!",
          options: [
            {
              name: "osoba",
              description: "Komu dać?",
              type: "USER",
              required: true,
            },
            {
              type: "NUMBER",
              name: "wartosc",
              description: "Ile mu dać?",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "zabierz",
          description: "Zabierz komuś pieniążki!",
          options: [
            {
              name: "osoba",
              description: "Komu zabrać?",
              type: "USER",
              required: true,
            },
            {
              type: "NUMBER",
              name: "wartosc",
              description: "Ile mu zabrać?",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "reset",
          description: "Przywróć wartości do ustawień początkowych",
          options: [
            {
              name: "osoba",
              description: "Komu zresetować?",
              type: "USER",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "stworz",
          description: "Stworz konto dla bohatera",
          options: [
            {
              name: "postac",
              description: "Bohater dla jakiego konto założyć",
              type: "STRING",
              autocomplete: true,
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "usun",
          description: "Usuń konto bohatera",
          options: [
            {
              name: "postac",
              description: "Bohater dla jakiego konto usunąć",
              type: "STRING",
              autocomplete: true,
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "daj",
          description: "Daj komuś pieniądze",
          options: [
            {
              name: "osoba",
              description: "Komu dać?",
              type: "USER",
              required: true,
            },
            {
              type: "NUMBER",
              name: "wartosc",
              description: "Ile mu dać?",
              required: true,
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "stan",
          description: "Sprawdź stan konta",
          options: [
            {
              name: "osoba",
              description: "Kogo konto sprawdzić?",
              type: "USER",
            },
          ],
        },
        {
          type: "SUB_COMMAND",
          name: "tabela",
          description: "Zobacz tabelkę",
        },
      ],
    },
 */
client.on("interactionCreate", async (i) => {
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

    const embed = new Embed().setTitle("No siemka");

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
          type: MessageComponentType.ActionRow,
          components: [
            {
              type: MessageComponentType.Button,
              label: "Jeszcze raz",
              style: ButtonStyle.PRIMARY,
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
          new Embed().setTitle("No siemka").addField(
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
            type: MessageComponentType.ActionRow,
            components: [
              {
                type: MessageComponentType.Button,
                label: "Jeszcze raz",
                style: ButtonStyle.PRIMARY,
                customID: "unik/r",
              },
            ],
          },
        ],
      });
    } else {
      return i.respond({
        embeds: [
          new Embed().setTitle("No siemka").addField(
            "Informacje:",
            `[${Math.floor(okay / 2.5)}] Twój unik się udał!`,
          ).setColor("#00ff00").setFooter(i.message.embeds[0].footer!.text),
        ],
        components: [
          {
            type: MessageComponentType.ActionRow,
            components: [
              {
                type: MessageComponentType.Button,
                label: "Jeszcze raz",
                style: ButtonStyle.PRIMARY,
                customID: "unik/r",
              },
            ],
          },
        ],
      });
    }
  }

  if (i.data.custom_id.startsWith("a/")) {
    const roleID = i.data.custom_id.split("/")[1]!;
    if (i.member === undefined) {
      return await i.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Użyj w serwerze...",
      });
    }

    try {
      const hasRole = (await i.member.roles.array()).find((elt) =>
        elt.id === roleID
      ) !== undefined;

      if (hasRole) {
        await i.member.roles.remove(roleID);
      } else {
        await i.member.roles.add(roleID);
      }

      return await i.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: hasRole ? "Zabrano role" : "Dodano role",
      });
    } catch (_e) {
      await i.respond(
        {
          content: `Nie mam uprawnienień do tego (edytowanie roli na <#${
            i.channel!.id
          }>)`,
        },
      );
    }
  }
});

client.on("debug", console.log);
await client.connect(undefined, Intents.NonPrivileged);
