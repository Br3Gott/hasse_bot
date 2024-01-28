//TODO start work on web app integration

//Discord init
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');

//Discord voice, ytdl , ytsr & ytpl
const ytdl = require('@distube/ytdl-core');
// const ytdlexec = require('youtube-dl-exec');
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

//Easter eggs
const imageSearch = require('image-search-engine');
const gis = require('g-i-s');

//Bot specific variables
let queue = [];
let nowPlayingItem = {
    title: "",
    link: ""
}
let playing = false;
let paused = false;
let loop = false;
const playingStatus = 'something';
const waitingStatus = 'eternal nothingness';

const player = createAudioPlayer();

const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
    const newUdp = Reflect.get(newNetworkState, 'udp');
    clearInterval(newUdp?.keepAliveInterval);
}

let lastInteraction;

const client = new Client({ intents: 33477 });

client.once('ready', () => {
    console.log('Discord: Ready!');
    client.user.setPresence({ activities: [{ name: waitingStatus, type: 2 }] });
});

client.on('messageCreate', async message => {

    //respond to messages containing 'ge mig x' with an image matching x
    function reply(error, results) {
        if (error) {
            console.log(error);
        } else {
            message.reply({ content: results[0].url});
        }
    }
    let index = message.content.indexOf("ge mig");
    if(index != -1 && message.type == 0 && message.content.substring(index+7) != "") {
        gis(message.content.substring(index+7), reply);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) {
        return;
    }

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
    else if (commandName === 'q' || commandName === 'klassiker' || commandName === 'zombies') {

        if(interaction.member.voice.channelId != null) {

            const query = interaction.options.getString('search');

            if(query != null || commandName === 'klassiker' || commandName === 'zombies') {
                lastInteraction = interaction;

                let search = query;

                if(commandName === 'klassiker') {
                    search = 'https://www.youtube.com/watch?v=NrI-UBIB8Jk&list=PL3NF4GNWwH4gCsNfFWj-Kco40PfvSRTyq';
                } else if(commandName === 'zombies') {
                    search = 'https://www.youtube.com/watch?v=rDtDKuOGE40&list=PLphIVgFFFw7WnQ9A0tLRbcMEeufwnXqfK';
                }


                const res = await addToQueue(search);

                //This might not happen in the right order?
                if(commandName === 'klassiker' || commandName === 'zombies') {
                    queue.sort(() => Math.random() - 0.5);
                }

                if(queue.length > 0 && !playing) {
                    await playFromQueue();
                }

                await interaction.reply(res);


            }  else {

                await interaction.reply({content: "Dude, i need something to search for...(Make sure you select **search:** when running command.)", ephemeral: true})
            }

        } else {
            await interaction.reply({content: `Join a voice channel first!`, ephemeral: true});
        }

    }
    else if (commandName === 'stop') {

        if(playing) {

            const connection = getVoiceConnection(interaction.guildId);

            playing = false;

            connection.destroy();
            client.user.setPresence({ activities: [{ name: waitingStatus, type: 2 }] });

            await interaction.reply({content: `Stopped playback!`, ephemeral: true});

        } else {
            await interaction.reply({content: `Nothing to stop!`, ephemeral: true});
        }
    }
    else if (commandName === 'play') {

        lastInteraction = interaction;

        if(queue.length > 0 && !playing) {

            playFromQueue();

            await interaction.reply({content: `Started playback!`, ephemeral: true});
        } else {
            await interaction.reply({content: `Nothing to play!`, ephemeral: true});
        }

    }
    else if (commandName === 'sq') {

        if(queue.length > 0 || playing) {

            let str = (`🎵 Now playing: ${nowPlayingItem.title}\n`);

            if (queue.length >= 1) {
                str += (`🎶 Currently in queue: \n`);
                let c = 1;

                queue.forEach((item) => {
                    if(c > 5) {
                        return;
                    } else {
                        // str += (`${c}. [${item.title}](${item.link})\n`); //Print with hyperlinks.
                        str += (`${c}. ${item.title}\n`); //Print with title only.
                        c++;
                    }
                });
            }

            if(queue.length > 5) {
                str += `... \n`;
                str += `(and ${queue.length} items in total)`;
            }

            interaction.reply({content: str, ephemeral: true});

        } else {
            interaction.reply({content: `🎶 Queue is empty.`, ephemeral: true});
        }

    }
    else if (commandName === 'skip') {

        const amount = interaction.options.getInteger('amount');

        let counter;

        if(amount != null) {
            if (amount > queue.length) {
                counter = queue.length;
            } else {
                counter = amount;
            }
            for (let i = 1; i < counter; i++) {
                if(loop) {
                    let temp = queue.shift();
                    queue.push({title: temp.title, link: temp.link});
                } else {
                    queue.shift();
                }
            }

        }

        if(queue.length > 0){
            if(playing) {

                if(loop) {
                    let tempItem = {
                        title: nowPlayingItem.title,
                        link: nowPlayingItem.link
                    }
                    queue.push(tempItem);
                }
                await playFromQueue();

            } else {
                if(loop) {
                    let temp = queue.shift();
                    queue.push({title: temp.title, link: temp.link});
                } else {
                    queue.shift();
                }
            }
            await interaction.reply({content: `Skipping current song!`, ephemeral: true});

        } else {

            if(playing) {

                const connection = getVoiceConnection(interaction.guildId);

                playing = false;

                connection.destroy();
                client.user.setPresence({ activities: [{ name: waitingStatus, type: 2 }] });

                await interaction.reply({content: `Skipping current song!`, ephemeral: true});

            }else {
                await interaction.reply({content: `Nothing to skip!`, ephemeral: true});
            }

        }

    }
    else if (commandName === 'shuffle') {

        if(queue.length > 0){

            //Sort with randomness for shuffle effect
            queue.sort(() => Math.random() - 0.5);

            await interaction.reply({content: `Shuffled the queue!`, ephemeral: true});

        } else {

            await interaction.reply({content: `Nothing to shuffle!`, ephemeral: true});

        }

    }
    else if (commandName === 'pause') {
        if(playing && !paused){
            paused = true;
            player.pause(true);
            interaction.reply({content: `Paused the music!`, ephemeral: true});
        } else {
            interaction.reply({content: `Music not playing or already paused!`, ephemeral: true});
        }
    }
    else if (commandName === 'resume') {
        if(playing && paused) {
            paused = false;
            player.unpause();
            interaction.reply({content: `Unpaused the music!`, ephemeral: true});
        } else {
            interaction.reply({content: `Music not playing or not paused!`, ephemeral: true});
        }


    }
    else if (commandName === 'clear') {
        if(queue.length > 0) {
            queue = [];
            interaction.reply({content: `Queue is cleared!`, ephemeral: true});
        } else {
            interaction.reply({content: `Queue is empty!`, ephemeral: true});
        }
    }
    else if (commandName === 'loop') {
        if(!loop) {
            loop = true;
            interaction.reply({content: `Looping enabled!`, ephemeral: true});
        } else {
            loop = false;
            interaction.reply({content: `Looping disabled!`, ephemeral: true});
        }
    }
});

client.login(token);

async function addToQueue(input) {
    //check if the input contains a playlist link, a video link or a search query
    if(ytpl.validateID(input)) {

        let playlist = await ytpl(input);

        playlist.items.forEach((item) => {
            let newItem = {
                title: item.title,
                link: item.shortUrl
            }
            queue.push(newItem);
        });

        return {content: `Added playlist: ${playlist.title} (${playlist.estimatedItemCount} videos)`, ephemeral: true};

    } else if (ytdl.validateURL(input)) {

        //fetch basic info so we can tell what we're playing
        const videoData = await ytdl.getBasicInfo(input)

        queue.push({title: videoData.videoDetails.title, link: input});

        return {content: `Added: ${videoData.videoDetails.title}`, ephemeral: true};

    } else {

        //search youtube with input as search query, current search limit 10 mostly for efficiency.
        let res = await ytsr(input, { limit: 10 });

        //check that the search were successful
        if(res.items.length > 0 ) {

            //try to make sure that the result is a video otherwise remove channels and playlists.
            while(res.items[0].type != "video") {
                res.items.shift();
            }

            //add to queue
            queue.push({title: res.items[0].title, link: res.items[0].url});

            return {content: `Added: ${res.items[0].title}`, ephemeral: true};

        } else {
            return {content: `No match for: ${input}`, ephemeral: true};
        }
    }
}

async function playFromQueue() {

    let interaction = lastInteraction;

    playing = true;

    nowPlayingItem = queue.shift();

    const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channelId,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    // Fix for audio disappearing after a minute
    connection.on('stateChange', (oldState, newState) => {
        const oldNetworking = Reflect.get(oldState, 'networking');
        const newNetworking = Reflect.get(newState, 'networking');
    
        oldNetworking?.off('stateChange', networkStateChangeHandler);
        newNetworking?.on('stateChange', networkStateChangeHandler);
    });

    client.user.setPresence({ activities: [{ name: nowPlayingItem.title, type: 2 }] });

    const stream = ytdl(nowPlayingItem.link, { quality: "highestaudio", dlChunkSize: 0 });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

    player.play(resource);
    connection.subscribe(player);

    //Remove all previous listeners before registering new ones.
    player.removeAllListeners(AudioPlayerStatus.Idle);

    player.on(AudioPlayerStatus.Idle, () => {

        if(loop) {
            let tempItem = {
                title: nowPlayingItem.title,
                link: nowPlayingItem.link
            }
            queue.push(tempItem);
        }

        if(queue.length > 0) {
            playFromQueue(interaction);
        } else {
            playing = false;
            connection.destroy();
            client.user.setPresence({ activities: [{ name: waitingStatus, type: 2 }] });
        }

    });

    stream.on('error', (error) => {

        console.log(error);

        if(queue.length > 0) {
            playFromQueue(interaction);
        } else {
            playing = false;
            connection.destroy();
            client.user.setPresence({ activities: [{ name: waitingStatus, type: 2 }] });
        }
    });

}

//Express app
const express = require('express');
const {param} = require("express/lib/router");
const app = express();
let curr_con = null;

app.get('/', (req, res) => {
    let str = '';
    const Guilds = client.guilds.cache.map(guild => guild.id);

    // console.log(Guilds);
    Guilds.forEach( (id) => {
        const server = client.guilds.resolve(id);
       // console.log(client.guilds.fetch(id));
       // console.log(server.name);
       str += `<a href="/server/${id}">${server.name}</a><br>`;
    });
    if(curr_con != null) {
        str += `<a href="/disconnect">Disconnect from current!</a>`;
    }
    res.send(str);
});

app.get('/server/:id', (req, res) => {
    let str = '';
    const id = req.params.id;
    // console.log(req);

    const server = client.guilds.resolve(id);

    let channels = server.channels.cache.map(channel => channel.id);

    channels.forEach( (channel_id) => {
        const channel = server.channels.resolve(channel_id)
        if(channel.type === 'GUILD_VOICE') {
            str += `<a href="/channel/${channel_id}/${id}">${channel.name}</a><br>`;
        }
    });

    res.send(str);
});

app.get('/channel/:id/:server', (req, res) => {
    res.redirect(`/`);

    if (req.params.id != null && req.params.server != null) {
        const channel = client.channels.resolve(req.params.id);
        curr_con = {
            channelId: req.params.id,
            guildId: req.params.server,
            adapterCreator: channel.guild.voiceAdapterCreator,
        };
        const connection = joinVoiceChannel(curr_con);
    }

});

app.get('/disconnect', (req, res) => {
    res.redirect(`/`);

    if(curr_con != null) {
        const connection = getVoiceConnection(curr_con.guildId);
        connection.destroy();
        curr_con = null;
    }

});

app.listen(3001, () => {
    console.log(`Web: Ready!`);
});
