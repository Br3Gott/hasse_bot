//Discord init
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with pong! (and server ws heartbeat)'),
    new SlashCommandBuilder().setName('server').setDescription('Replies with server info!'),
    new SlashCommandBuilder().setName('user').setDescription('Replies with user info!'),
    new SlashCommandBuilder().setName('q').setDescription('Play music based on search query').addStringOption(option => option.setName('search').setDescription('Enter a search query')),
    new SlashCommandBuilder().setName('stop').setDescription('Stop music playback!'),
    new SlashCommandBuilder().setName('play').setDescription('Start music playback!'),
    new SlashCommandBuilder().setName('sq').setDescription('Show current queue.'),
    new SlashCommandBuilder().setName('skip').setDescription('Skip current song!').addIntegerOption( option => option.setName('amount').setDescription('Amount of songs to skip.(Default: 1)')),
    new SlashCommandBuilder().setName('clear').setDescription('Clear the queue!'),
    new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue!'),
    new SlashCommandBuilder().setName('klassiker').setDescription('Automatically queue and shuffle the classics playlist!'),
    new SlashCommandBuilder().setName('zombies').setDescription('Automatically queue and shuffle the zombies playlist!'),
    new SlashCommandBuilder().setName('pause').setDescription('Pause the music!'),
    new SlashCommandBuilder().setName('resume').setDescription('Resume the music!'),
    new SlashCommandBuilder().setName('loop').setDescription('Toggle loop-mode!'),
]
    .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);