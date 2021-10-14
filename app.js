
//Discord init
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');

//Discord voice & ytdl & ytsr
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const {
    AudioPlayerStatus,
    StreamType,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    getVoiceConnection,
} = require('@discordjs/voice');
const player = createAudioPlayer();

// const client = new Client({ intents: [Intents.FLAGS.GUILDS] }); intents: 14023
const client = new Client({ intents: 641 });

client.once('ready', () => {
    console.log('Ready!');
    client.user.setActivity('eternal nothingness', { type: 'LISTENING' });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply(`Pong! (${client.ws.ping}ms.)`);
    } else if (commandName === 'server') {
        await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
    } else if (commandName === 'user') {
        await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
    } else if (commandName === "test") {
        await interaction.reply(`test döh`);
    }
    else if (commandName === "search") {

        if(interaction.member.voice.channelId != null) {

            const query = interaction.options.getString('search');

            const res = await ytsr(query, { limit: 1 });

            await interaction.reply(`Started playing: ${res.items[0].title}`);

            const connection = joinVoiceChannel({
                channelId: interaction.member.voice.channelId,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            const stream = ytdl(res.items[0].url, { filter: 'audioonly' });
            const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => connection.destroy());

        } else {
            await interaction.reply(`Join a voice channel first!`);
        }

    } else if (commandName === "stop") {

        const connection = getVoiceConnection(interaction.guildId);

        connection.destroy();

        await interaction.reply(`Stopped playback!`);
    }
});

client.login(token);

