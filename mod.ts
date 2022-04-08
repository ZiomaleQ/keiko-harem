import { config } from "./config.ts";
import {
  GuildManager,
  ItemManager,
  MoneyManager,
  RavenItem,
} from "./dataManager.ts";
import {
  ActionRowComponent,
  ApplicationCommandPartial,
  AutocompleteInteraction,
  ButtonComponent,
  ButtonStyle,
  CommandClient,
  Embed,
  EmbedField,
  Intents,
  InteractionChannel,
  InteractionResponseFlags,
  MessageComponentType,
  Role,
  SlashCommandInteraction,
  User,
} from "./deps.ts";
import { chunk, genRandom, graphql } from "./utils.ts";

const client = new CommandClient({ token: config.TOKEN, prefix: "keiko!" });

client.on("ready", async () => {
  const commands = await client.interactions.commands.all();

  const keikoCommands = await import("./commands.json", {
    assert: { type: "json" },
  });

  if (commands.size != keikoCommands.default.length) {
    console.log("Updated commands");
    client.interactions.commands.bulkEdit(
      (keikoCommands.default) as ApplicationCommandPartial[],
    );
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

  const money = await MoneyManager.getOrCreate(
    d.guild.id,
    anotherUser?.id ?? d.user.id,
  );

  //TODO HERO FETCH AND GET

  const guildData = (await GuildManager.getOrCreate(d.guild.id));

  const currAcc = money.find((acc) => acc.heroID === null)!;

  const embed = new Embed().setTitle("No siemka").addField(
    "Balans",
    currAcc.value + (guildData.money.currency || "$"),
  ).addField(
    "Konto bohatera?",
    currAcc.heroID !== null ? "Tak" : "Nie",
  );

  return d.respond({ embeds: [embed] });
});

client.interactions.handle(
  "money dodaj",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const moneyValue = Math.abs(d.option<number>("wartosc"));
    const anotherUser = d.option<User>("osoba");
    const receiverMoney = await MoneyManager.getOrCreate(
      d.guild.id,
      anotherUser.id,
    );

    const receiverAccount = receiverMoney.find((elt) => elt.heroID === null)!;

    await MoneyManager.update(
      receiverAccount,
      receiverAccount.value + moneyValue,
    );

    const guildData = (await GuildManager.getOrCreate(d.guild.id));

    return await d.respond({
      content: `Dodano ${moneyValue}${
        guildData.money.currency || "$"
      }, dla ${anotherUser.toString()}`,
    });
  },
);

client.interactions.handle(
  "money zabierz",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const moneyValue = Math.abs(d.option<number>("wartosc"));
    const anotherUser = d.option<User>("osoba");
    const receiverMoney = await MoneyManager.getOrCreate(
      d.guild.id,
      anotherUser.id,
    );

    const receiverAccount = receiverMoney.find((elt) => elt.heroID === null)!;

    await MoneyManager.update(
      receiverAccount,
      receiverAccount.value - moneyValue,
    );

    const guildData = (await GuildManager.getOrCreate(d.guild.id));

    return await d.respond({
      content: `Zabrano ${moneyValue}${
        guildData.money.currency || "$"
      }, dla ${anotherUser.toString()}`,
    });
  },
);

client.interactions.handle(
  "money reset",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const anotherUser = d.option<User>("osoba");
    const receiverMoney = await MoneyManager.getOrCreate(
      d.guild.id,
      anotherUser.id,
    );

    const receiverAccount = receiverMoney.find((elt) => elt.heroID === null)!;
    const guildData = (await GuildManager.getOrCreate(d.guild.id));

    await MoneyManager.update(
      receiverAccount,
      guildData.money.startingMoney,
    );

    return await d.respond({
      content: `Zresetowano stan konta na: ${guildData.money.startingMoney}${
        guildData.money.currency || "$"
      } dla ${anotherUser.toString()}`,
    });
  },
);

client.interactions.handle(
  "money daj",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const moneyValue = Math.abs(d.option<number>("wartosc"));
    const anotherUser = d.option<User>("osoba");

    const receiverMoney = await MoneyManager.getOrCreate(
      d.guild.id,
      anotherUser.id,
    );

    const giverMoney = await MoneyManager.getOrCreate(
      d.guild.id,
      d.user.id,
    );

    const receiverAccount = receiverMoney.find((elt) => elt.heroID === null)!;

    const giverAccount = giverMoney.find((elt) => elt.heroID === null)!;

    if (giverAccount.value < moneyValue) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Ale ty tyle nie masz...",
      });
    }

    await MoneyManager.update(
      giverAccount,
      giverAccount.value - moneyValue,
    );

    await MoneyManager.update(
      receiverAccount,
      receiverAccount.value + moneyValue,
    );

    const guildData = (await GuildManager.getOrCreate(d.guild.id));

    return await d.respond({
      content: `Dałeś ${moneyValue}${
        guildData.money.currency || "$"
      }, dal ${anotherUser.toString()}`,
    });
  },
);

client.interactions.handle(
  "sklep przegladaj",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const items = await ItemManager.get(d.guild.id, 0);
    const guildData = await GuildManager.getOrCreate(d.guild.id);

    const embed = new Embed().setTitle("No siemka!");

    if (items.allItems === 0) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie ma żadnych przedmiotów",
      });
    }

    items.data.map((item) =>
      convertItemsToEmbeds(item, guildData.money.currency)
    ).forEach((field) => embed.addField(field));

    d.reply({
      embeds: [embed],
      components: [{
        type: "ACTION_ROW",
        components: [
          {
            type: MessageComponentType.Button,
            label: "Poprzednia strona",
            style: ButtonStyle.PRIMARY,
            customID: "shop/0",
            disabled: true,
          },
          {
            type: MessageComponentType.Button,
            label: "Kolejna strona",
            style: ButtonStyle.PRIMARY,
            customID: "shop/1",
            disabled: items.allItems <= items.data.length,
          },
        ],
      }],
    });
  },
);

function convertItemsToEmbeds(
  item: RavenItem,
  guildCurrency: string | null,
): EmbedField {
  return {
    name: item.name + " - " + item.data.price + (guildCurrency || "$"),
    value: item.data.description,
  };
}

client.interactions.handle("sklep kup", async (d: SlashCommandInteraction) => {
  if (d.guild === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś w serwerze...",
    });
  }

  //TODO HERO SHOP

  await d.defer();

  let item: RavenItem | undefined = (await ItemManager.getByName(
    d.guild.id,
    d.option<string>("nazwa"),
  ));
  const count = d.option<number>("ilosc");

  if (item === undefined) {
    item = await ItemManager.getByID(d.option<string>("nazwa"));
  }

  if (item === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Taki przedmiot nie istnieje...",
    });
  }

  const guildData = (await GuildManager.getOrCreate(d.guild.id));
  const userMoney = await MoneyManager.getOrCreate(
    d.guild.id,
    d.user.id,
  );

  const userAcc = userMoney.find((elt) => elt.heroID === null)!;

  let membersItemCost: number | undefined = undefined;
  let rolesItemCost: number | undefined = undefined;
  let allItemCost: number | undefined = undefined;

  if (typeof item.data.price === "object") {
    membersItemCost = item.data.price.find((elt) =>
      elt.entity === "USER" && elt.id === d.user.id
    )?.price;

    const rolePrices = item.data.price.filter((elt) => elt.entity === "ROLE");
    if (rolePrices.length > 0) {
      const memberRoles = (await d.member!.roles.array()).map((role) =>
        role.id
      );

      const memberRolePrices = rolePrices.filter((elt) =>
        memberRoles.includes(elt.id)
      );

      if (memberRolePrices.length !== 0) {
        if (memberRolePrices.length === 1) {
          rolesItemCost = memberRolePrices[0].price;
        } else {
          rolesItemCost = memberRolePrices.reduce((acc, cur) =>
            acc.price > cur.price
              ? cur
              : acc
          ).price;
        }
      }
    }

    allItemCost = item.data.price.find((elt) => elt.entity === "ALL")!.price;
  }

  const itemCost = membersItemCost || rolesItemCost || allItemCost ||
    item.data.price as number;

  if (userAcc.value - (itemCost * count) < 0) {
    const itemCount = Math.floor(userAcc.value / itemCost);
    if (itemCount === 0) {
      return await d.editResponse({
        content: "Nie stać cię...",
      });
    }
    return await d.editResponse({
      content:
        `Nie stać cię na to... Moge zamiast tego sprzedać ci ${itemCount} sztuk. Chcesz tyle kupić?`,
      components: [{
        type: "ACTION_ROW",
        components: [
          {
            type: MessageComponentType.Button,
            label: "Tak",
            style: ButtonStyle.PRIMARY,
            customID: `buy/${item["@metadata"]["@id"]}/${item.data.stock}`,
          },
          {
            type: MessageComponentType.Button,
            label: "Nie",
            style: ButtonStyle.PRIMARY,
            customID: "cancel",
          },
        ],
      }],
    });
  }

  if (count > item.data.stock && item.data.stock !== -1) {
    if (item.data.stock === 0) {
      return await d.editResponse({
        content: "Nie mam nic w magazynie...",
      });
    }
    return await d.editResponse({
      content:
        `W magazynie mam tylko ${item.data.stock}. Chcesz kupić wszystkie pozostałe sztuki?`,
      components: [{
        type: "ACTION_ROW",
        components: [
          {
            type: MessageComponentType.Button,
            label: "Tak",
            style: ButtonStyle.PRIMARY,
            customID: `buy/${item["@metadata"]["@id"]}/${item.data.stock}`,
          },
          {
            type: MessageComponentType.Button,
            label: "Nie",
            style: ButtonStyle.PRIMARY,
            customID: "cancel",
          },
        ],
      }],
    });
  }

  const items = userAcc.items;

  const itemIndex = items.findIndex((it) =>
    it.hash === item!["@metadata"]["@id"]
  );

  if (itemIndex === -1) {
    items.push({ hash: item!["@metadata"]["@id"], quantinity: count });
  } else {
    items[itemIndex].quantinity = items[itemIndex].quantinity + count;
  }

  await MoneyManager.update(
    userAcc,
    userAcc.value - itemCost * count,
    items,
  );

  await d.editResponse({
    content: `Kupiono: ${item.name} x${count} za ${count * itemCost}${
      guildData.money.currency || "$"
    }`,
  });
});

client.interactions.handle(
  "sklep dodaj",
  async (d: SlashCommandInteraction) => {
    if (d.user.id !== d.guild?.ownerID) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś właścicielem",
      });
    }

    d.showModal({
      title: "Stwórz przedmiot",
      customID: "item/create",
      components: [{
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Nazwa",
          customID: "name",
          style: "SHORT",
          minLength: 3,
          maxLength: 100,
        }],
      }, {
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Opis",
          customID: "description",
          style: "PARAGRAPH",
        }],
      }, {
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Cena",
          customID: "price",
          style: "SHORT",
        }],
      }],
    });
  },
);

client.interactions.handle(
  "sklep ekwipunek",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze",
      });
    }

    const userMoney = await MoneyManager.getOrCreate(
      d.guild.id,
      d.user.id,
    );

    const userAcc = userMoney.find((elt) => elt.heroID === null)!;
    const userItems = await Promise.all(userAcc.items.map(async (elt) => ({
      item: await ItemManager.getByID(elt.hash),
      count: elt.quantinity,
    })));

    const embed = new Embed().setTitle("No hej").addField(
      "Przedmioty",
      userItems.length > 0
        ? userItems.map((elt) => `${elt.item!.name} ${elt.count}x`).join("\n")
        : "Brak",
    );

    d.respond({ embeds: [embed] });
  },
);

client.interactions.handle("sklep info", async (d: SlashCommandInteraction) => {
  if (d.guild === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś w serwerze...",
    });
  }

  let item: RavenItem | undefined = (await ItemManager.getByName(
    d.guild.id,
    d.option<string>("nazwa"),
  ));

  // const detailed = d.option("szczegolowe") as unknown as boolean;

  if (item === undefined) {
    item = await ItemManager.getByID(d.option<string>("nazwa"));
  }

  if (item === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Taki przedmiot nie istnieje...",
    });
  }

  function parseCost(): string {
    const entities = {
      "ROLE": "Rola",
      "USER": "Użytkownik",
      "ALL": "W ostateczności",
    };

    return Array.isArray(item!.data.price)
      ? item!.data.price.map((elt) =>
        `${entities[elt.entity]} ${
          elt.id === "" ? "" : `- <@${elt.id}>`
        }: ${elt.price}`
      ).join("\n")
      : item!.data.price + "";
  }

  return d.respond({
    embeds: [
      new Embed()
        .setTitle("No siemka")
        .addField("Nazwa", item.name)
        .addField(
          "Opis",
          item.data.description || "Brak",
        ).addField(
          "Koszt",
          parseCost(),
        ),
    ],
  });
});

client.interactions.handle(
  "sklep edytuj",
  async (d: SlashCommandInteraction) => {
    if (d.user.id !== d.guild?.ownerID) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś właścicielem",
      });
    }

    d.showModal({
      title: "Edytuj przedmiot",
      customID: "item/edit",
      components: [{
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Opis",
          customID: "description",
          style: "PARAGRAPH",
        }],
      }, {
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Cena",
          customID: "price",
          style: "SHORT",
        }],
      }],
    });
  },
);

client.interactions.autocomplete("sklep", "*", autocompleteItem);

async function autocompleteItem(d: AutocompleteInteraction): Promise<void> {
  const items = await ItemManager.startWith(d.guild!.id, d.focusedOption.value);
  await d.autocomplete(items.map((elt) => ({
    name: elt.name,
    value: elt["@metadata"]["@id"],
  })));
}

/*

  {
    "name": "sklep",
    "description": "Zarządzanie przedmiotami!",
    "options": [
      {
        "type": "SUB_COMMAND",
        "name": "edytuj",
        "description": "Edytuj przedmiot ze sklepu",
        "options": [
          {
            "type": "STRING",
            "name": "nazwa",
            "description": "Nazwa przedmiotu",
            "required": true
          }
        ]
      },
      {
        "type": "SUB_COMMAND",
        "name": "usun",
        "description": "Usuń przedmiot ze sklepu",
        "options": [
          {
            "type": "STRING",
            "name": "nazwa",
            "description": "Nazwa przedmiotu",
            "required": true
          }
        ]
      },
      {
        "type": "SUB_COMMAND",
        "name": "sprzedaj",
        "description": "Sprzedaj przedmiot z ekwipunku",
        "options": [
          {
            "type": "STRING",
            "name": "nazwa",
            "description": "Nazwa przedmiotu",
            "required": true
          },
          {
            "type": "INTEGER",
            "name": "ilosc",
            "description": "Ilość przedmiotów",
            "required": true
          },
          {
            "type": "STRING",
            "name": "postac",
            "description": "Nazwa postaci",
            "autocomplete": true
          }
        ]
      },
      {
        "type": "SUB_COMMAND",
        "name": "uzyj",
        "description": "Użyj przedmiot z ekwipunku",
        "options": [
          {
            "type": "STRING",
            "name": "nazwa",
            "description": "Nazwa przedmiotu",
            "required": true
          },
          {
            "type": "INTEGER",
            "name": "ilosc",
            "description": "Ilość przedmiotów",
            "required": true
          },
          {
            "type": "STRING",
            "name": "postac",
            "description": "Nazwa postaci",
            "autocomplete": true
          }
        ]
      },
      {
        "type": "SUB_COMMAND",
        "name": "daj",
        "description": "Daj komus przedmiot ze sklepu",
        "options": [
          {
            "type": "STRING",
            "name": "nazwa",
            "description": "Nazwa przedmiotu",
            "required": true
          },
          {
            "type": "INTEGER",
            "name": "ilosc",
            "description": "Ilość przedmiotów",
            "required": true
          },
          {
            "name": "osoba",
            "description": "Komu dać?",
            "type": "USER",
            "required": true
          },
          {
            "type": "STRING",
            "name": "postac",
            "description": "Nazwa postaci",
            "autocomplete": true
          }
        ]
      },
      {
        "type": "SUB_COMMAND",
        "name": "zabierz",
        "description": "Zabierz komuś przedmiot z ekwipunku",
        "options": [
          {
            "type": "STRING",
            "name": "nazwa",
            "description": "Nazwa przedmiotu",
            "required": true
          },
          {
            "type": "INTEGER",
            "name": "ilosc",
            "description": "Ilość przedmiotów",
            "required": true
          },
          {
            "name": "osoba",
            "description": "Komu dać?",
            "type": "USER",
            "required": true
          },
          {
            "type": "STRING",
            "name": "postac",
            "description": "Nazwa postaci",
            "autocomplete": true
          }
        ]
      }
    ]
  }

 */

client.interactions.handle("*", (d: SlashCommandInteraction) => {
  d.reply({ content: "Jeszcze nie zrobione, wróć później" });
});

// //TODO HERO AUTOCOMPLETION
// client.interactions.autocomplete(
//   "money stan",
//   "postac",
//   (d: AutocompleteInteraction) => {
//     if (d.guild === undefined) return d.autocomplete([]);

//     //TODO HERO FETCH AND GET

//     return d.autocomplete([]);
//   },
// );

client.on("interactionCreate", async (i) => {
  if (i.isModalSubmit()) {
    if (i.data.custom_id === "item/create") {
      const name = i.getComponent("name")!.value;
      const description = i.getComponent("description")!.value;
      const price = i.getComponent("price")!.value;

      await ItemManager.create({
        name,
        data: { description, price: parseFloat(price) },
        gid: i.guild!.id,
      });
      return i.reply("Stworzono przedmiot z nazwą: " + name);
    }
  }

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

  if (i.data.custom_id.startsWith("shop/")) {
    const page = ~~i.data.custom_id.split("/")[1]!;

    const items = await ItemManager.get(i.guild!.id, page);
    const guildData = await GuildManager.getOrCreate(i.guild!.id);

    const embed = new Embed().setTitle("No siemka!");

    items.data.map((item) =>
      convertItemsToEmbeds(item, guildData.money.currency)
    ).forEach((field) => {
      embed.addField(field);
    });

    await i.deferredMessageUpdate();

    i.message.edit({
      embeds: [embed],
      components: [{
        type: "ACTION_ROW",
        components: [
          {
            type: MessageComponentType.BUTTON,
            label: "Poprzednia strona",
            style: ButtonStyle.PRIMARY,
            customID: "shop/" + (page - 1),
            disabled: (page - 1) < 0,
          },
          {
            type: MessageComponentType.BUTTON,
            label: "Kolejna strona",
            style: ButtonStyle.PRIMARY,
            customID: "shop/" + (page + 1),
            disabled: items.allItems - (items.data.length + page * 5) <= 0,
          },
        ],
      }],
    });
  }
});

client.on("debug", console.log);
await client.connect(undefined, Intents.NonPrivileged);
