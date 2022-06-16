import { config } from "./config.ts";
import {
  GuildManager,
  HeroManager,
  ItemManager,
  MoneyManager,
  MonsterManager,
} from "./dataManager.ts";
import {
  ActionRowComponent,
  ApplicationCommandPartial,
  AutocompleteInteraction,
  ButtonComponent,
  CommandClient,
  Embed,
  Intents,
  InteractionChannel,
  InteractionResponseFlags,
  Member,
  MessageAttachment,
  MessageComponentData,
  MessageComponentType,
  PermissionFlags,
  Role,
  SlashCommandInteraction,
  User,
  Webhook,
} from "./deps.ts";
import {
  convertItemsToEmbeds,
  formatHero,
  formatMoney,
  heroWithMember,
  resolveAccount,
  resolveHero,
  resolveItem,
  resolveMonster,
} from "./roleplayUtils.ts";
import { chunk, createButton, genRandom, graphql } from "./utils.ts";

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

function calculateDamage(
  lvl: number,
  ad: number,
  crit: number,
  critVal: number,
): [boolean, number] {
  let dmg = genRandom(0, lvl * 5) + lvl * 10 + ad + 30;
  const goCrit = crit == 100 || (genRandom(0, 100) > crit && crit > 0);

  if (goCrit) dmg *= critVal <= 0 ? 2 : critVal / 100;

  return [goCrit, dmg];
}

function generateAttaackEmbed(okay: number, crit: boolean, dmg: number): Embed {
  const embed = new Embed().setTitle("No siemka").setColor(
    okay >= 15 ? "#00ff00" : "#ff0000",
  );

  let message = `[${okay}]`;

  if (okay >= 15) {
    message += " Trafiłeś" + (crit
          ? " krytycznie"
          : "") + `, zadałeś ${dmg} obrażeń.`;
  } else {
    message += " Niestety, atak się nie udał...";
  }

  embed.addField("Informacje", message);

  return embed;
}

client.interactions.handle("atak", (d: SlashCommandInteraction) => {
  const okay = genRandom(0, 40) + ~~d.option<number>("modif");
  const lvl = d.option<number>("lvl") - 1;
  const [crit, dmg] = calculateDamage(
    lvl,
    ~~d.option<number>("dmg"),
    ~~d.option<number>("krytyczne"),
    ~~d.option<number>("wartosc-kryt"),
  );

  const embed = generateAttaackEmbed(okay, crit, dmg);

  embed.setFooter(
    `${~~d.option<number>("lvl")}|${~~d.option<number>("modif")}|${~~d.option<
      number
    >("dmg")}|${~~d.option<number>("krytyczne")}|${~~d.option<number>(
      "wartosc-kryt",
    )}`,
  );

  d.respond({
    embeds: [embed],
    components: replayComponent("atak"),
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
  const pvpPoints = Math.floor(okay / 2.5);

  const embed = new Embed().setTitle("No siemka");

  if (okay > snek) {
    if (armor > 0) {
      dmg = Math.floor(dmg * (100 / (100 + armor)));
    }

    embed.addField(
      "Informacje:",
      `[${pvpPoints}] Niestety, unik się nie udał...\n Otrzymałeś od życia ${dmg} w tyłek`,
    ).setColor("#ff0000").setFooter(`${snek}|${dmg}|${armor}`);
  } else {
    embed.addField(
      "Informacje:",
      `[${pvpPoints}] Twój unik się udał!`,
    ).setColor("#00ff00").setFooter(`${snek}|${dmg}|${armor}`);
  }

  d.respond({
    embeds: [embed],
    components: replayComponent("unik"),
  });
});

client.interactions.handle(
  "autorole stworz",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
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
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
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

    const newButton = createButton({
      label: role.name,
      customID: "a/" + role.id,
    });

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
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    const guild = d.guild!;

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

    const newButton = createButton({
      label: role.name,
      customID: "a/" + role.id,
    });

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

  const [account, hero] = await resolveAccount(
    d.guild.id,
    anotherUser?.id ?? d.user.id,
    d.option<string | undefined>("postac"),
  );

  const embed = new Embed().setTitle("No siemka").addField(
    "Balans",
    await formatMoney(d.guild.id, account.value),
  ).addField(
    "Konto bohatera?",
    hero !== undefined ? "Tak" : "Nie",
  );

  if (hero !== undefined) {
    embed.addField(
      "Bohater",
      `${hero.name} ${hero.data.nickname || `<${hero.data.nickname}>`} `,
    );
  }

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

    const [account, hero] = await resolveAccount(
      d.guild.id,
      anotherUser.id,
      d.option("postac"),
    );

    account.value += moneyValue;

    await MoneyManager.getInstance().update(account);

    return await d.respond({
      content: `Dodano ${await formatMoney(d.guild.id, moneyValue)}, dla ${
        heroWithMember(hero, "(`", ")`", anotherUser.id)
      }`,
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

    const [account, hero] = await resolveAccount(
      d.guild.id,
      anotherUser.id,
      d.option("postac"),
    );

    account.value -= moneyValue;

    await MoneyManager.getInstance().update(
      account,
    );

    return await d.respond({
      content: `Zabrano ${await formatMoney(d.guild.id, moneyValue)}, od ${
        heroWithMember(hero, "(`", ")`", anotherUser.id)
      }`,
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

    const [account, hero] = await resolveAccount(
      d.guild.id,
      anotherUser.id,
      d.option("postac"),
    );

    const { money } =
      (await GuildManager.getInstance().getOrCreate(d.guild.id));

    account.value = money.startingMoney;

    await MoneyManager.getInstance().update(
      account,
    );

    return await d.respond({
      content: `Zresetowano stan konta na: ${
        await formatMoney(d.guild.id, account.value)
      } dla ${anotherUser.toString()} ${
        heroWithMember(hero, "(`", ")`", anotherUser.id)
      }`,
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

    const [giverAccount, giverHero] = await resolveAccount(
      d.guild.id,
      d.user.id,
      d.option("dawca"),
    );

    const [receiverAccount, receiverHero] = await resolveAccount(
      d.guild.id,
      anotherUser.id,
      d.option("biorca"),
    );

    if (giverAccount.value < moneyValue) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Ale ty tyle nie masz...",
      });
    }

    giverAccount.value -= moneyValue;

    await MoneyManager.getInstance().update(
      giverAccount,
    );

    receiverAccount.value += moneyValue;

    await MoneyManager.getInstance().update(
      receiverAccount,
    );

    return await d.respond({
      content: `Dałeś ${await formatMoney(d.guild.id, moneyValue)}${
        formatHero(giverHero, "(`", "`)")
      }, dla ${heroWithMember(receiverHero, "(`", "`)", anotherUser.id)}`,
    });
  },
);

client.interactions.handle(
  "money stworz",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const hero = await resolveHero(d.guild.id, d.option<string>("postac"));
    if (hero === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "No ok ale nie ma takiego bohatera...",
      });
    }

    if (hero.uid !== d.user.id) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "To nie twój bohater...",
      });
    }

    const userMoney = await MoneyManager.getInstance().getOrCreate(
      d.guild.id,
      d.user.id,
    );

    if (
      userMoney.findIndex((elt) => elt.heroID === hero["@metadata"]["@id"]) !==
        -1
    ) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Ten bohater ma już konto...",
      });
    }

    const guildData =
      (await GuildManager.getInstance().getOrCreate(d.guild.id));

    await MoneyManager.getInstance().create({
      gid: d.guild.id,
      uid: d.user.id,
      heroID: hero["@metadata"]["@id"],
      items: [],
      value: guildData.money.startingMoney,
      "@metadata": { "@collection": null, "@id": "" },
    });

    d.respond({ content: "Stworzono konto dla: " + hero.name });
  },
);

client.interactions.handle(
  "money usun",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const hero = await resolveHero(d.guild.id, d.option<string>("postac"));
    if (hero === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "No ok ale nie ma takiego bohatera...",
      });
    }

    if (hero.uid !== d.user.id) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "To nie twój bohater...",
      });
    }

    const userMoney = await MoneyManager.getInstance().getOrCreate(
      d.guild.id,
      d.user.id,
    );

    const accIndex = userMoney.findIndex((elt) =>
      elt.heroID === hero["@metadata"]["@id"]
    );

    if (
      accIndex === -1
    ) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Ten bohater nie ma konta...",
      });
    }

    await MoneyManager.getInstance().deleteByID(
      userMoney[accIndex]["@metadata"]["@id"],
    );

    d.respond({ content: "Usunięto konto: " + hero.name });
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

    const items = await ItemManager.getInstance().getPage(d.guild.id, 0);

    const embed = new Embed().setTitle("No siemka!");

    if (items.TotalResults === 0) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie ma żadnych przedmiotów",
      });
    }

    items.Results.map(convertItemsToEmbeds).forEach((field) =>
      embed.addField(field)
    );

    d.reply({
      embeds: [embed],
      components: createPagination(items.TotalResults, 5, 0, "shop"),
    });
  },
);

client.interactions.handle("sklep kup", async (d: SlashCommandInteraction) => {
  if (d.guild === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś w serwerze...",
    });
  }

  await d.defer();

  const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

  if (item === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Taki przedmiot nie istnieje...",
    });
  }

  const [account, hero] = await resolveAccount(
    d.guild.id,
    d.user.id,
    d.option("postac"),
  );

  const tags = [
    ...new Set((await Promise.all(account.items.map(async (elt) => ({
      item: await ItemManager.getInstance().getByID(elt.hash),
      count: elt.quantinity,
    })))).flatMap((elt) => elt.item?.data.tags ?? [])).values(),
  ];

  if (
    tags.length + item.data.tags.length !==
      new Set([...tags, ...item.data.tags]).size
  ) {
    return await d.editResponse({
      content: "Masz przedmiot z tym tagiem...",
    });
  }

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

  const count = d.option<number>("ilosc");

  const itemCost = membersItemCost || rolesItemCost || allItemCost ||
    item.data.price as number;

  if (account.value - (itemCost * count) < 0) {
    const itemCount = Math.floor(account.value / itemCost);
    if (itemCount === 0) {
      return await d.editResponse({
        content: "Nie stać cię...",
      });
    }
    if (hero !== undefined) {
      return await d.editResponse({
        content:
          `Nie stać cię na podaną ilość przedmiotów (nie mogę ci doradzić co do ilości)`,
      });
    }
    return await d.editResponse({
      content:
        `Nie stać cię na to... Moge zamiast tego sprzedać ci ${itemCount} sztuk. Chcesz tyle kupić?`,
      components: confirmationComponent(
        `buy/${item["@metadata"]["@id"]}/${item.data.stock}`,
      ),
    });
  }

  if (count > item.data.stock && item.data.stock !== -1) {
    if (item.data.stock === 0) {
      return await d.editResponse({
        content: "Nie mam nic w magazynie...",
      });
    }
    if (hero !== undefined) {
      return await d.editResponse({
        content:
          `Nie stać cię na podaną ilość przedmiotów (nie mogę ci doradzić co do ilości)`,
      });
    }
    return await d.editResponse({
      content:
        `W magazynie mam tylko ${item.data.stock}. Chcesz kupić wszystkie pozostałe sztuki?`,
      components: confirmationComponent(
        `buy/${item["@metadata"]["@id"]}/${item.data.stock}`,
      ),
    });
  }

  const items = account.items;

  const itemIndex = items.findIndex((it) =>
    it.hash === item!["@metadata"]["@id"]
  );

  if (itemIndex === -1) {
    items.push({ hash: item!["@metadata"]["@id"], quantinity: count });
  } else {
    items[itemIndex].quantinity = items[itemIndex].quantinity + count;
  }

  account.value -= itemCost * count;
  account.items = items;

  await MoneyManager.getInstance().update(
    account,
  );

  await d.editResponse({
    content: `Kupiono: ${item.name} x${count} za ${
      await formatMoney(d.guild.id, count * itemCost)
    } ${hero !== undefined ? ", dla postaci: " + hero.name : ""}`,
  });
});

client.interactions.handle(
  "sklep dodaj",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
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
    const anotherUser = d.option<User | undefined>("osoba");

    const [account, hero] = await resolveAccount(
      d.guild.id,
      anotherUser?.id ?? d.user.id,
      d.option("postac"),
    );

    const userItems = await Promise.all(account.items.map(async (elt) => ({
      item: await ItemManager.getInstance().getByID(elt.hash),
      count: elt.quantinity,
    })));

    const embed = new Embed().setTitle("No hej").addField(
      "Przedmioty",
      userItems.length > 0
        ? userItems.map((elt) => `${elt.item!.name} ${elt.count}x`).join("\n")
        : "Brak",
    );

    if (hero !== undefined) {
      embed.addField("Należy do:", hero.name);
    }

    return d.respond({ embeds: [embed] });
  },
);

client.interactions.handle("sklep info", async (d: SlashCommandInteraction) => {
  if (d.guild === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś w serwerze...",
    });
  }

  const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

  // const detailed = d.option("szczegolowe") as unknown as boolean;

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

  async function parseRecipes(): Promise<string> {
    return (await Promise.all(item!.data.recipes.map(async (elt) => {
      const component1 = await ItemManager.getInstance().getByID(elt.item);
      const component2 = elt.item1 === null
        ? null
        : await ItemManager.getInstance().getByID(elt.item1);

      return item!.data.recipes.map((elt) =>
        `\`${item!.name}x${elt.result} = ${
          component1?.name ?? "Usunięty przedmiot"
        }x${elt.countItem} + ${
          component2 === null
            ? "Powietrze"
            : (component2?.name ?? "Usunięty przedmiot")
        }${component2 === null ? "" : "x" + elt.countItem1} + ${
          await formatMoney(d.guild!.id, elt.additionalCost)
        }\``
      );
    }))).join("\n");
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
        ).addField(
          "Tagi",
          item.data.tags.length === 0
            ? "Brak"
            : item.data.tags.map((elt) => `\`${elt}\``).join(", "),
        ).addField(
          "Receptury",
          item.data.recipes.length === 0 ? "Brak" : await parseRecipes(),
        ),
    ],
  });
});

client.interactions.handle(
  "sklep edytuj",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    d.showModal({
      title: "Edytuj przedmiot",
      customID: "item/edit/" + item["@metadata"]["@id"],
      components: [{
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Opis (zostaw puste jeśli nie chcesz zmieniać)",
          customID: "description",
          style: "PARAGRAPH",
        }],
      }, {
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Cena (zostaw puste jeśli nie chcesz zmieniać)",
          customID: "price",
          style: "SHORT",
        }],
      }],
    });
  },
);

client.interactions.handle(
  "sklep usun",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    await ItemManager.getInstance().deleteByID(item["@metadata"]["@id"]);

    return d.respond({
      content: "Pomyślnie usunięto przedmiot o nazwie: " + item.name,
    });
  },
);

client.interactions.handle(
  "sklep sprzedaj",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    await d.defer();

    const count = d.option<number>("ilosc");

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    const [account, hero] = await resolveAccount(
      d.guild.id,
      d.user.id,
      d.option("postac"),
    );

    const items = account.items;

    if (!item.data.sell.canSell) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Tego przedmiotu nie można sprzedać...",
      });
    }

    const itemIndex = items.findIndex((elt) =>
      elt.hash === item!["@metadata"]["@id"]
    );
    if (itemIndex === -1) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz tego przedmiotu...",
      });
    }

    let actualCount = count;

    if (items[itemIndex].quantinity <= count) {
      actualCount = items[itemIndex].quantinity;
      items.splice(itemIndex, 1);
    } else {
      items[itemIndex].quantinity -= count;
    }

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

    let value = 0;

    if (typeof item.data.sell.for === "string") {
      value = (~~item.data.sell.for / 100) * itemCost;
    } else {
      value = item.data.sell.for;
    }

    if (item.data.stock !== -1) {
      item.data.stock += actualCount;
      ItemManager.getInstance().update(item);
    }

    account.value += value * actualCount;
    account.items = items;

    await MoneyManager.getInstance().update(
      account,
    );

    await d.editResponse({
      content: `Sprzedano: ${item.name} x${actualCount} za ${
        await formatMoney(d.guild.id, value * actualCount)
      } ${hero !== undefined ? ", z konta postaci: " + hero.name : ""}`,
    });
  },
);

client.interactions.handle(
  "sklep uzyj",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const count = d.option<number>("ilosc");

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    const [account, hero] = await resolveAccount(
      d.guild.id,
      d.user.id,
      d.option("postac"),
    );

    const items = account.items;

    if (!item.data.inventory) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Tego przedmiotu nie można użyć...",
      });
    }

    const itemIndex = items.findIndex((elt) =>
      elt.hash === item!["@metadata"]["@id"]
    );

    if (itemIndex === -1) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz tego przedmiotu...",
      });
    }

    let actualCount = count;

    if (items[itemIndex].quantinity <= count) {
      actualCount = items[itemIndex].quantinity;
      items.splice(itemIndex, 1);
    } else {
      items[itemIndex].quantinity -= count;
    }

    account.items = items;

    await MoneyManager.getInstance().update(
      account,
    );

    await d.editResponse({
      content: `Użyto: ${item.name} x${actualCount}${
        hero !== undefined ? ", z konta postaci: " + hero.name : ""
      }`,
    });
  },
);

client.interactions.handle(
  "sklep daj",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    const count = d.option<number>("ilosc");

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    const anotherUser = d.option<User>("osoba");

    const [account, hero] = await resolveAccount(
      d.guild.id,
      anotherUser.id,
      d.option("postac"),
    );

    const items = account.items;

    const itemIndex = items.findIndex((elt) =>
      elt.hash === item!["@metadata"]["@id"]
    );

    if (itemIndex === -1) {
      items.push({ hash: item!["@metadata"]["@id"], quantinity: count });
    } else {
      items[itemIndex].quantinity = items[itemIndex].quantinity + count;
    }

    account.items = items;

    await MoneyManager.getInstance().update(
      account,
    );

    await d.respond({
      content: `Dano: ${item.name} x${count}, dla ${
        heroWithMember(hero, "(", ")", anotherUser.id)
      }`,
    });
  },
);

client.interactions.handle(
  "sklep tag dodaj",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    await d.defer();

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    const tag = d.option<string>("tag");

    if (item.data.tags.includes(tag)) {
      return await d.editResponse({
        content: "Ten przedmiot ma już ten tag...",
      });
    }

    item.data.tags.push(tag);

    await ItemManager.getInstance().update(item);

    d.editResponse({
      content: `Usunięto tag \`${tag}\` z przedmiotu: \`${item.name}\``,
    });
  },
);

client.interactions.handle(
  "sklep tag usun",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    await d.defer();

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    const tag = d.option<string>("tag");

    if (!item.data.tags.includes(tag)) {
      return await d.editResponse({
        content: "Ten przedmiot ma już ten tag...",
      });
    }

    item.data.tags.splice(item.data.tags.indexOf(tag), 1);

    await ItemManager.getInstance().update(item);

    d.editResponse({
      content: `Dodano tag \`${tag}\` do przedmiotu: \`${item.name}\``,
    });
  },
);

client.interactions.handle(
  "sklep receptura dodaj",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje... (Finalny przedmiot)",
      });
    }

    const component1 = await resolveItem(
      d.guild.id,
      d.option<string | undefined>("skladnik-1") ?? "",
    );

    if (component1 === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje... (Składowa - 1)",
      });
    }

    const component2 = d.option<string>("skladnik-2") === undefined
      ? undefined
      : await resolveItem(
        d.guild.id,
        d.option<string>("skladnik-2"),
      );

    const cost = d.option<number>("koszt");
    const resultingItemsCount = d.option<number>("wartosc");
    const component1ItemsCount = d.option<number>("wartosc-1");
    const component2ItemsCount = d.option<number | undefined>("wartosc-2");

    item.data.recipes.push({
      additionalCost: cost,
      countItem: component1ItemsCount,
      countItem1: component2ItemsCount === undefined
        ? null
        : component2ItemsCount,
      item: component1["@metadata"]["@id"],
      item1: component2 === undefined ? null : component2["@metadata"]["@id"],
      result: resultingItemsCount,
    });

    await ItemManager.getInstance().update(item);

    return await d.respond({
      content:
        `Dodano recepture: \`${item.name}x${resultingItemsCount} = ${component1.name}x${component1ItemsCount} ${
          component2 === undefined
            ? ""
            : `+ ${component2.name}x${component2ItemsCount}`
        } + ${await formatMoney(d.guild.id, cost)}\``,
    });
  },
);

client.interactions.handle(
  "sklep stworz",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    if (item.data.recipes.length === 0) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Ten przedmiot nie ma receptur...",
      });
    }

    const recipes = item.data.recipes;

    const [account, hero] = await resolveAccount(
      d.guild.id,
      d.user.id,
      d.option("postac"),
    );

    const userItems = account.items;

    function hasQuantity(hash: string, count: number): boolean {
      return ((userItems.find((elt) => elt.hash === hash)?.quantinity) ?? -1) >=
        count;
    }

    const recipeUsed = recipes.find((recipe) => {
      if (recipe.additionalCost > account.value) return false;
      if (!hasQuantity(recipe.item, recipe.countItem)) return false;
      if (
        recipe.item1 !== null && !hasQuantity(recipe.item1, recipe.countItem1!)
      ) {
        return false;
      }

      return true;
    });

    if (recipeUsed === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content:
          "Nie spełniasz żadnej z receptur (pieniądze lub przedmioty)...",
      });
    }

    const itemIndex = userItems.findIndex((elt) =>
      elt.hash === recipeUsed.item
    );

    if (userItems[itemIndex].quantinity <= recipeUsed.countItem) {
      userItems.splice(itemIndex, 1);
    } else {
      userItems[itemIndex].quantinity -= recipeUsed.countItem;
    }

    const item1Index = userItems.findIndex((elt) =>
      elt.hash === recipeUsed.item1
    );

    if (userItems[item1Index].quantinity <= recipeUsed.countItem) {
      userItems.splice(item1Index, 1);
    } else {
      userItems[item1Index].quantinity -= recipeUsed.countItem;
    }

    userItems.push({
      hash: item["@metadata"]["@id"],
      quantinity: recipeUsed.result,
    });

    account.items = userItems;

    await MoneyManager.getInstance().update(
      account,
    );

    d.respond({
      content: `Stworzono: ${item.name}x${recipeUsed.result} ${
        hero !== undefined ? ", na koncie postaci: " + hero.name : ""
      }`,
    });
  },
);

client.interactions.handle(
  "sklep zabierz",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    const count = d.option<number>("ilosc");

    const item = await resolveItem(d.guild.id, d.option<string>("nazwa"));

    if (item === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    const anotherUser = d.option<User>("osoba");

    const [account, hero] = await resolveAccount(
      d.guild.id,
      anotherUser.id,
      d.option("postac"),
    );

    const items = account.items;

    const itemIndex = items.findIndex((elt) =>
      elt.hash === item!["@metadata"]["@id"]
    );

    let actualCount = count;

    if (itemIndex === -1) {
      return d.respond({
        content: "Ten użytkownik nie ma takiego przedmiotu",
      });
    }

    if (items[itemIndex].quantinity <= count) {
      actualCount = items[itemIndex].quantinity;
      items.splice(itemIndex, 1);
    } else {
      items[itemIndex].quantinity -= count;
    }

    account.items = items;

    await MoneyManager.getInstance().update(
      account,
    );

    await d.respond({
      content: `Zabrano: ${item.name} x${actualCount}, od ${
        heroWithMember(hero, "(", ")", d.user.id)
      }`,
    });
  },
);

client.interactions.handle("hero lista", async (d: SlashCommandInteraction) => {
  if (d.guild === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś w serwerze...",
    });
  }

  const otherUser = d.option<User | undefined>("osoba");

  const heroes = await HeroManager.getInstance().getAll(
    d.guild.id,
    otherUser?.id ?? d.user.id,
  );

  if (heroes.length === 0) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Brak bohaterów",
    });
  }

  const embed = new Embed().setTitle("No siemka").addField(
    "Postacie",
    heroes.map((elt) =>
      `\`${elt.name}\` ${
        elt.data.nickname === "" ? "" : "AKA `" + elt.data.nickname + "`"
      }`
    ).join("\n"),
  );

  return await d.respond({ embeds: [embed] });
});

client.interactions.handle(
  "hero stworz",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const guildData =
      (await GuildManager.getInstance().getOrCreate(d.guild.id));
    const heroes = await HeroManager.getInstance().getAll(
      d.guild.id,
      d.user.id,
    );

    if (guildData.maxHeroes < (heroes.length + 1)) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Już masz maksymalną liczbe bohaterów",
      });
    }

    HeroManager.getInstance().create({
      "@metadata": {
        "@collection": null,
        "@id": "",
      },
      name: d.option<string>("nazwa"),
      uid: d.user.id,
      gid: d.guild.id,
      data: {
        nickname: d.option<string | undefined>("nick") || "",
        account: null,
        skills: [],
        avatarUrl: "",
      },
    });

    return d.respond({
      content: `Stworzono postać o nazwie \`${d.option<string>("nazwa")}\``,
    });
  },
);

client.interactions.handle("hero usun", async (d: SlashCommandInteraction) => {
  if (d.guild === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "Nie jesteś w serwerze...",
    });
  }

  const hero = await resolveHero(d.guild.id, d.option<string>("postac"));
  if (hero === undefined) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "No ok ale nie ma takiego bohatera...",
    });
  }

  if (hero.uid !== d.user.id) {
    return await d.respond({
      flags: InteractionResponseFlags.EPHEMERAL,
      content: "To nie twój bohater...",
    });
  }

  await HeroManager.getInstance().deleteByID(hero["@metadata"]["@id"]);

  d.respond({ content: `Usunięto bohatera \`${hero.name}\`` });
});

client.interactions.handle(
  "hero avatar",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    await d.defer();

    const hero = await resolveHero(d.guild.id, d.option<string>("postac"));
    if (hero === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "No ok ale nie ma takiego bohatera...",
      });
    }

    if (hero.uid !== d.user.id) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "To nie twój bohater...",
      });
    }
    await d.editResponse({ content: "Trybiki jeszcze się kręcą..." });

    // deno-lint-ignore no-explicit-any
    const attachments = (d.data.resolved as any).attachments;
    const avatarDiscord = attachments[Object.keys(attachments)[0]];
    const avatar = await MessageAttachment.load(avatarDiscord.url);
    const resp = await d.channel!.send({
      content: "Ustawiam avatar na: ",
      files: [avatar],
    });

    hero.data.avatarUrl = resp.attachments[0].url;

    await HeroManager.getInstance().update(hero);

    await d.editResponse({
      content: "Ustawiono! Nie usuwaj wiadomości poniżej bo avatar zniknie...",
    });
  },
);

client.interactions.handle(
  "hero udawaj",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const hero = await resolveHero(d.guild.id, d.option<string>("postac"));
    if (hero === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "No ok ale nie ma takiego bohatera...",
      });
    }

    if (hero.uid !== d.user.id) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "To nie twój bohater...",
      });
    }

    const guildData =
      (await GuildManager.getInstance().getOrCreate(d.guild.id));

    if (guildData.webhooks[d.channel!.id] === undefined) {
      const resp = await client.rest.api.channels[d.channel!.id].webhooks.post({
        name: "Keiko!",
      });

      const url = `https://discord.com/api/webhooks/${resp.id}/${resp.token}`;
      guildData.webhooks[d.channel!.id] = url;

      await GuildManager.getInstance().update(guildData);
    }

    return await d.showModal({
      title: "Pisz jako postać",
      customID: "impostor/" + hero["@metadata"]["@id"],
      components: [{
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Tekst (Max 2k znaków)",
          customID: "content",
          style: "PARAGRAPH",
        }],
      }],
    });
  },
);

client.interactions.handle(
  "settings role",
  async (d: SlashCommandInteraction) => {
    if (d.user.id !== d.guild?.ownerID) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś właścicielem",
      });
    }

    const role = d.option<Role | undefined>("modrole");
    const guildData =
      (await GuildManager.getInstance().getOrCreate(d.guild!.id));

    guildData.modrole = role?.id || "";
    await GuildManager.getInstance().update(guildData);

    d.respond({ content: "Zaktualizowano ustawienia" });
  },
);

client.interactions.handle(
  "settings hero",
  async (d: SlashCommandInteraction) => {
    if (d.user.id !== d.guild?.ownerID) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś właścicielem",
      });
    }

    const number = d.option<number | undefined>("max");
    const guildData =
      (await GuildManager.getInstance().getOrCreate(d.guild!.id));

    guildData.maxHeroes = number ?? 1;
    await GuildManager.getInstance().update(guildData);

    d.respond({ content: "Zaktualizowano ustawienia" });
  },
);

client.interactions.handle(
  "monster dodaj",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    d.showModal({
      title: "Stwórz potwora",
      customID: "monster/create",
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
      }],
    });
  },
);

client.interactions.handle(
  "monster usun",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    const monster = await resolveMonster(
      d.guild.id,
      d.option<string>("potwor"),
    );

    if (monster === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki potwór nie istnieje...",
      });
    }

    await MonsterManager.getInstance().deleteByID(monster["@metadata"]["@id"]);

    return d.respond({
      content: "Pomyślnie usunięto potwora o nazwie: " + monster.name,
    });
  },
);

client.interactions.handle(
  "monster lista",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }
    const monsters = await MonsterManager.getInstance().getPage(d.guild.id);

    const components: ButtonComponent[] = [];

    const embed = new Embed().setTitle("No hej").addField(
      "Info",
      "Kliknij odpowiedni przycisk żeby pokazać informacje",
    );

    monsters.Results.forEach((monster) => {
      components.push(createButton({
        label: monster.name.length > 77
          ? monster.name.substring(0, 77) + "..."
          : monster.name,
        customID: "mo/info/" + monster["@metadata"]["@id"],
      }));
    });

    return await d.respond({
      embeds: [embed],
      components: [
        { type: MessageComponentType.ACTION_ROW, components },
        ...createPagination(monsters.TotalResults, 5, 0, "monster"),
      ],
    });
  },
);

client.interactions.handle(
  "monster edytuj",
  async (d: SlashCommandInteraction) => {
    if (d.member === undefined) return;
    if (d.guild === undefined) return;

    if (!(await hasPerms(d.member))) {
      return d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie masz uprawnienień",
      });
    }

    const monster = await resolveMonster(
      d.guild.id,
      d.option<string>("potwor"),
    );

    if (monster === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki potwór nie istnieje...",
      });
    }

    d.showModal({
      title: "Edytuj przedmiot",
      customID: "monster/edit/" + monster["@metadata"]["@id"],
      components: [{
        type: "ACTION_ROW",
        components: [{
          type: "TEXT_INPUT",
          label: "Opis (zostaw puste jeśli nie chcesz zmieniać)",
          customID: "description",
          style: "PARAGRAPH",
        }],
      }],
    });
  },
);

client.interactions.handle(
  "monster info",
  async (d: SlashCommandInteraction) => {
    if (d.guild === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Nie jesteś w serwerze...",
      });
    }

    const monster = await resolveMonster(
      d.guild.id,
      d.option<string>("potwor"),
    );

    if (monster === undefined) {
      return await d.respond({
        flags: InteractionResponseFlags.EPHEMERAL,
        content: "Taki przedmiot nie istnieje...",
      });
    }

    return d.respond({
      embeds: [
        new Embed()
          .setTitle("No siemka")
          .addField("Nazwa", monster.name)
          .addField(
            "Opis",
            monster.data.description || "Brak",
          ),
      ],
    });
  },
);

client.interactions.handle("*", (d: SlashCommandInteraction) => {
  d.reply({
    flags: InteractionResponseFlags.EPHEMERAL,
    content: "Jeszcze nie zrobione, wróć później",
  });
});

client.on("interactionCreate", async (i) => {
  if (i.isModalSubmit()) {
    if (i.data.custom_id === "item/create") {
      const name = i.getComponent("name")!.value;
      const description = i.getComponent("description")!.value;
      const price = i.getComponent("price")!.value;

      await ItemManager.getInstance().create({
        name,
        data: {
          description,
          price: parseFloat(price),
        },
        gid: i.guild!.id,
      });
      return i.reply("Stworzono przedmiot z nazwą: " + name);
    }

    if (i.data.custom_id.startsWith("item/edit")) {
      const itemID = i.data.custom_id.substring("item/edit/".length);

      const item = (await ItemManager.getInstance().getByID(itemID))!;

      const description = i.getComponent("description")?.value;
      if (!description) {
        item.data.description = description!;
      }
      const price = i.getComponent("price")?.value;
      if (!price) {
        item.data.price = parseFloat(price!);
      }

      await ItemManager.getInstance().update(item);

      return i.reply("Zaktualizowano przedmiot z nazwą " + item.name);
    }

    if (i.data.custom_id.startsWith("impostor/")) {
      const heroID = i.data.custom_id.substring("impostor/".length);

      const hero = (await HeroManager.getInstance().getByID(heroID))!;

      const guildData =
        (await GuildManager.getInstance().getOrCreate(i.guild!.id));

      const webhook = await Webhook.fromURL(
        guildData.webhooks[i.channel!.id],
        client,
      );

      const whMessage = {
        avatar: hero.data.avatarUrl === "" ? undefined : hero.data.avatarUrl,
        name: hero.name,
      };

      await webhook.send(i.getComponent("content")!.value, whMessage);

      await i.respond({ content: "Prosz" });
      setTimeout(() => {
        i.deleteResponse();
      }, 1000);
    }
  }

  if (!i.isMessageComponent()) return;

  if (i.data.custom_id === "atak/r") {
    const data = i.message.embeds[0].footer!.text
      .split("|")
      .map((elt) => ~~elt);

    const okay = genRandom(0, 40) + data[1];
    const lvl = data[0] - 1;

    const [crit, dmg] = calculateDamage(
      lvl,
      data[2],
      data[3],
      data[4],
    );

    const embed = generateAttaackEmbed(okay, crit, dmg);

    embed.setFooter(i.message.embeds[0].footer!.text);

    return i.respond({
      embeds: [embed],
      components: replayComponent("atak"),
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
    const pvpPoints = Math.floor(okay / 2.5);

    const embed = new Embed().setTitle("No siemka");

    if (okay > snek) {
      if (armor > 0) {
        dmg = Math.floor(dmg * (100 / (100 + armor)));
      }

      embed.addField(
        "Informacje:",
        `[${pvpPoints}] Niestety, unik się nie udał...\n Otrzymałeś od życia ${dmg} w tyłek`,
      ).setColor("#ff0000").setFooter(i.message.embeds[0].footer!.text);
    } else {
      embed.addField(
        "Informacje:",
        `[${pvpPoints}] Twój unik się udał!`,
      ).setColor("#00ff00").setFooter(i.message.embeds[0].footer!.text);
    }

    i.respond({
      embeds: [embed],
      components: replayComponent("unik"),
    });
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

    const items = await ItemManager.getInstance().getPage(i.guild!.id, page);

    const embed = new Embed().setTitle("No siemka!");

    items.Results.map(convertItemsToEmbeds).forEach((field) => {
      embed.addField(field);
    });

    await i.deferredMessageUpdate();

    i.message.edit({
      embeds: [embed],
      components: createPagination(items.TotalResults, 5, page, "shop"),
    });
  }
});

client.on("debug", console.log);
await client.connect(undefined, Intents.NonPrivileged);

async function hasPerms(member: Member): Promise<boolean> {
  const roles = await member.roles.array();
  const guildData =
    (await GuildManager.getInstance().getOrCreate(member.guild!.id));

  if (member.guild.ownerID === member.id) {
    return true;
  }

  if (member.permissions.has(PermissionFlags.ADMINISTRATOR)) {
    return true;
  }

  if (roles.find((elt) => elt.id === guildData.modrole)) {
    return true;
  }

  return false;
}

function createPagination(
  allItems: number,
  perPage: number,
  currentPage: number,
  cid: string,
): MessageComponentData[] {
  return [{
    type: "ACTION_ROW",
    components: [
      createButton({
        label: "Poprzednia strona",
        customID: `${cid}/${currentPage - 1}`,
        disabled: (currentPage - 1) < 0,
      }),
      createButton({
        label: "Kolejna strona",
        customID: `${cid}/${currentPage + 1}`,
        disabled: allItems - (allItems + perPage * 5) >= 0,
      }),
    ],
  }];
}

function replayComponent(cid: string): MessageComponentData[] {
  return [
    {
      type: MessageComponentType.ActionRow,
      components: [
        createButton({
          label: "Jeszcze raz",
          customID: cid + "/r",
        }),
      ],
    },
  ];
}

function confirmationComponent(cid: string): MessageComponentData[] {
  return [{
    type: "ACTION_ROW",
    components: [
      createButton({
        label: "Tak",
        customID: cid,
      }),
      createButton({
        label: "Nie",
        customID: "cancel",
      }),
    ],
  }];
}

client.interactions.autocomplete("*", "*", autocomplete);

function autocomplete(d: AutocompleteInteraction) {
  const name = d.focusedOption.name;
  switch (name) {
    case "nazwa":
    case "skladnik-1":
    case "skladnik-2":
      return autocompleteItem(d);
    case "tag":
      return autocompleteTag(d);
    case "postac":
    case "dawca":
    case "biorca":
      return autocompleteHero(d);
    case "potwor":
      return autocompleteMonster(d);
  }
}

async function autocompleteItem(d: AutocompleteInteraction): Promise<void> {
  const items = await ItemManager.getInstance().getAutocompletitions(
    d.guild!.id,
    d.focusedOption.value,
  );
  await d.autocomplete(items.map((elt) => ({
    name: elt.name,
    value: elt["@metadata"]["@id"],
  })));
}

async function autocompleteTag(d: AutocompleteInteraction): Promise<void> {
  const tags = (await ItemManager.getInstance().getTags(d.guild!.id)).filter((
    elt,
  ) => elt.startsWith(d.focusedOption.value)).slice(0, 25);
  await d.autocomplete(tags.map((elt) => ({
    name: elt,
    value: elt,
  })));
}

async function autocompleteHero(d: AutocompleteInteraction): Promise<void> {
  const heroes = (await HeroManager.getInstance().getAutocompletitions(
    d.guild!.id,
    d.focusedOption.value,
  ));

  await d.autocomplete(heroes.map((elt) => ({
    name: elt.name,
    value: elt["@metadata"]["@id"],
  })));
}

async function autocompleteMonster(d: AutocompleteInteraction): Promise<void> {
  const monsters = (await MonsterManager.getInstance().getAutocompletitions(
    d.guild!.id,
    d.focusedOption.value,
  ));
  await d.autocomplete(monsters.map((elt) => ({
    name: elt.name,
    value: elt["@metadata"]["@id"],
  })));
}
