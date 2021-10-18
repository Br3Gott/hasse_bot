//TODO start work on web app integration

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

let lastInteraction;

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

                await addToQueue(search, interaction).then( async () => {

                    if(commandName === 'klassiker' || commandName === 'zombies') {
                        queue.sort(() => Math.random() - 0.5);
                    }

                    if(queue.length > 0 && !playing) {
                        await playFromQueue();
                    }

                });


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
            client.user.setActivity(waitingStatus, {type: "LISTENING"});

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
                client.user.setActivity(waitingStatus, {type: "LISTENING"});
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


//TODO return title instead of direct response
async function addToQueue(input, interaction) {
    //check if the input contains a playlist link, a video link or a search query
    if(ytpl.validateID(input)) {

        console.log("Found playlist!");

        let playlist = await ytpl(input);

        playlist.items.forEach((item) => {
            let newItem = {
                title: item.title,
                link: item.shortUrl
            }
            queue.push(newItem);
        });

        interaction.reply({content: `Added playlist: ${playlist.title} (${playlist.estimatedItemCount} videos)`, ephemeral: true});

    } else if (ytdl.validateURL(input)) {

        console.log("Found yt link!");

        //fetch basic info so we can tell what we're playing
        const videoData = await ytdl.getBasicInfo(input)
        await interaction.reply({content: `Added: ${videoData.videoDetails.title}`, ephemeral: true});

        queue.push({title: videoData.videoDetails.title, link: input});

    } else {

        //search youtube with input as search query, current search limit 10 mostly for efficiency.
        let res = await ytsr(input, { limit: 10 });

        //check that the search were successful
        if(res.items.length > 0 ) {

            //try to make sure that the result is a video otherwise remove channels and playlists.
            while(res.items[0].type != "video") {
                res.items.shift();
            }

            await interaction.reply({content: `Added: ${res.items[0].title}`, ephemeral: true});

            //add to queue
            queue.push({title: res.items[0].title, link: res.items[0].url});

        } else {
            await interaction.reply({content: `No match for: ${input}`, ephemeral: true});
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

    client.user.setActivity(playingStatus, { type: 'LISTENING' });

    const stream = ytdl(nowPlayingItem.link, { filter: 'audioonly' });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

    player.play(resource);
    connection.subscribe(player);

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
            client.user.setActivity(waitingStatus, {type: "LISTENING"});
        }

    });

    stream.on('error', (error) => {

        console.log(error);

        if(queue.length > 0) {
            playFromQueue(interaction);
        } else {
            playing = false;
            connection.destroy();
            client.user.setActivity(waitingStatus, {type: "LISTENING"});
        }
    });

}

