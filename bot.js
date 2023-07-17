const { Client, Intents, MessageEmbed } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

const emojiId = '1129774978691252285'; // Идентификатор эмодзи для регистрации

client.once('ready', () => {
  console.log(`Бот ${client.user.tag} готов к работе!`);
});

client.on('ready', async () => {
  const guildId = '872606676908408843';
  const commands = [
    {
      name: 'регистрация',
      description: 'Регистрация на клозы',
    },
  ];

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error('Указанный ID сервера недействителен.');
    return;
  }

  try {
    await guild.commands.set(commands);
    console.log('Слэш-команда успешно добавлена на сервер!');
  } catch (error) {
    console.error('Ошибка при добавлении слэш-команды:', error);
  }
});

const registeredMembers = new Set();
const memberMessages = new Map(); // Мапа для хранения сообщений участников

const updateRegistrationMessage = async () => {
  if (!registrationMsg) return;

  const reactions = registrationMsg.reactions.cache.get(emojiId);

  if (reactions) {
    await reactions.users.fetch();
    reactions.users.cache.forEach((user) => {
      if (!user.bot && !registeredMembers.has(user.id)) {
        reactions.users.remove(user.id);
      }
    });
  }

  const registeredUsers = registrationMsg.reactions.cache.get(emojiId)?.users.cache.filter((user) => !user.bot && registeredMembers.has(user.id));

  if (!registeredUsers || registeredUsers.size === 0) {
    registrationMsg.edit('Нажмите на реакцию, чтобы зарегистрироваться');
  } else {
    const registeredList = Array.from(registeredUsers.values())
      .map((user, index) => `${index + 1}. <@${user.id}>`)
      .join('\n');
    const embed = new MessageEmbed()
      .setColor('#2b2d31') // Устанавливаем цвет эмбеда
      .setTitle('Регистрация на клозы')
      .setDescription(registeredList)
      .setImage('https://cdn.discordapp.com/attachments/1082748798121562142/1129910554354520114/anounce.gif');
    registrationMsg.edit({ embeds: [embed] });
  }
};

let registrationMsg = null;

let isRegistrationInProgress = false;
const maxRegistrations = 50;
let totalRegistrations = 0;

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || !interaction.guild) return;

  const { commandName } = interaction;

  if (commandName === 'регистрация') {
    const allowedRoles = ['1024692488012845159', '886603783986110486'];
    const hasPermission = interaction.member.roles.cache.some((role) => allowedRoles.includes(role.id));

    if (!hasPermission) {
      interaction.reply('У вас нет доступа к этой команде!');
      return;
    }

    if (isRegistrationInProgress) {
      interaction.reply('Процесс регистрации уже идет. Пожалуйста, дождитесь его завершения.');
      return;
    }

    isRegistrationInProgress = true;
    const embed = new MessageEmbed()
      .setColor('#2b2d31') // Устанавливаем цвет эмбеда
      .setTitle('Регистрация на клозы')
      .setDescription('Нажмите на реакцию, чтобы зарегистрироваться')
      .setImage('https://cdn.discordapp.com/attachments/1082748798121562142/1129910554354520114/anounce.gif');

    registrationMsg = await interaction.reply({ embeds: [embed], fetchReply: true });

    const emoji = '<:red_yes:1129774978691252285>';

    await registrationMsg.react(emoji);

    const collector = registrationMsg.createReactionCollector({
      filter: (reaction, user) => reaction.emoji.id === emojiId && !user.bot && (!registeredMembers.has(user.id) || user.id === interaction.user.id),
      time: 60000,
      max: maxRegistrations - totalRegistrations,
    });

    collector.on('collect', async (reaction, user) => {
      const newUsernameWithNumber = `<:red_dot:1129771304044732436> ${registeredMembers.size + 1}. <@${user.id}>`;
      registeredMembers.add(user.id);
      totalRegistrations++;
      const message = await reaction.message.channel.send(`${newUsernameWithNumber}`);
      memberMessages.set(user.id, message); // Сохраняем сообщение участника
      updateRegistrationMessage();
    });

    collector.on('end', () => {
      isRegistrationInProgress = false;
    });
  }
});

client.on('messageReactionAdd', (reaction, user) => {
  if (reaction.message === registrationMsg && reaction.emoji.id === emojiId && !user.bot) {
    updateRegistrationMessage();
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (reaction.message === registrationMsg && reaction.emoji.id === emojiId && !user.bot) {
    registeredMembers.delete(user.id); // Удаляем участника из набора зарегистрированных
    totalRegistrations--;
    const message = memberMessages.get(user.id); // Получаем сообщение участника
    if (message) {
      await message.delete(); // Удаляем сообщение
      memberMessages.delete(user.id); // Удаляем запись о сообщении из мапы
    }
    updateRegistrationMessage();
  }
});

const TOKEN = 'MTEyOTA4NDI2Mjg4MTE4NTgyMg.G_VcMw.zMak-xPmy9KyeckR6Exo9bizRLYGgJ_DCNtAJU';
client.login(TOKEN);
