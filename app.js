
//Discord init
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');

//Discord voice & ytdl & ytsr
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');
const {
    AudioPlayerStatus,
    StreamType,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    getVoiceConnection,
} = require('@discordjs/voice');

let playing = false;
const playingStatus = 'something';
const waitingStatus = 'eternal nothingness'

const client = new Client({ intents: 641 });

client.once('ready', () => {
    console.log('Ready!');
    client.user.setActivity(waitingStatus, {type: "LISTENING"});
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply({content: `Pong! (${client.ws.ping}ms.)`, ephemeral: true});
    }
    else if (commandName === 'server') {
        await interaction.reply({content: `Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`, ephemeral: true});
    }
    else if (commandName === 'user') {
        await interaction.reply({content: `Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`, ephemeral: true});
    }
    else if (commandName === "test") {
        await interaction.reply(`test döh`);
    }
    else if (commandName === "q") {

        if(interaction.member.voice.channelId != null) {

            const query = interaction.options.getString('search');

            if(query != null) {
                await playFromQueue(query, interaction);
            }  else {
                await interaction.reply("Dude, i need something to search for...(Make sure you select search when running command.)")
            }

        } else {
            await interaction.reply(`Join a voice channel first!`);
        }

    }
    else if (commandName === "stop") {

        const connection = getVoiceConnection(interaction.guildId);

        connection.destroy();
        client.user.setActivity(waitingStatus, {type: "LISTENING"});

        await interaction.reply({content: `Stopped playback!`, ephemeral: true});
    }
});

client.login(token);


async function playFromQueue(input, interaction) {

    //check if the input contains a playlist link, a video link or a search query
    if(ytpl.validateID(input)) {

        console.log("Found playlist!");

        //TODO parse into individual videos and add to queue
        input = "https://www.youtube.com/watch?v=NrI-UBIB8Jk";

    } else if (ytdl.validateURL(input)) {

        console.log("Found yt link!");

        //fetch basic info so we can tell what we're playing
        const videoData = await ytdl.getBasicInfo(input)
        await interaction.reply({content: `Started playing: ${videoData.videoDetails.title}`, ephemeral: true});

    } else {

        //search youtube with input as search query, current search limit 10 mostly for efficiency.
        let res = await ytsr(input, { limit: 10 });

        //check that the search were successful
        if(res.items.length > 0 ) {

            //try to make sure that the result is a video otherwise remove channels and playlists.
            while(res.items[0].type != "video") {
                res.items.shift();
            }

            await interaction.reply({content: `Started playing: ${res.items[0].title}`, ephemeral: true});

            //reassign the found link to the input variable.
            input = res.items[0].url;
        } else {
            await interaction.reply({content: `No match for: ${input}`, ephemeral: true});
            return;
        }
    }

    const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channelId,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    client.user.setActivity(playingStatus, { type: 'LISTENING' });

    const stream = ytdl(input, { filter: 'audioonly' });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
        client.user.setActivity(waitingStatus, {type: "LISTENING"});
    });

}

