//fixa youtube sök
//hasse decieds

//Discord init
const Discord = require('discord.js');
const client = new Discord.Client();
const {
    prefix,
    token
} = require('./config.json');

//Database init
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

//Text to speech init
const say = require('say');

//Youtube downloader init
const ytdl = require('ytdl-core');

//App is ready
client.on('ready', () => {
    console.log(`App started! Connected as BOT:${client.user.tag}!`);
});

client.on('message', async message => {
    // Check if message is from guild(server) otherwise return;
    if (!message.guild) return;

    //Check if message starts with configured prefix and is not from bot.
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    //Split message into variables.
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift().toLowerCase();

    if (command === "beep") {
        message.channel.send('Boop.🤖');
    }

    if (command === "mystats") {

        var currentTime = db.get("users").find({
            id: message.author.id
        }).value();

        if (currentTime == null) {
            currDiff = 0;
            db.get("users").push({
                id: message.author.id,
                time: 0
            }).write();
        } else {
            var currDiff = currentTime.time;
        }

        var msec = currDiff;
        var hh = Math.floor(msec / 1000 / 60 / 60);
        msec -= hh * 1000 * 60 * 60;
        var mm = Math.floor(msec / 1000 / 60);
        msec -= mm * 1000 * 60;
        var ss = Math.floor(msec / 1000);
        msec -= ss * 1000;

        message.reply("In voice-chat for: " + hh + "h " + mm + "m " + ss + "s.");
    }

    if (command === "stats") {

        var elementNum = 1;

        const embed = {
            "title": "All-time Voice-chat stats:",
            "color": 16744448,
            "footer": {
                "text": "Hasse ser allt..."
            },
            "fields": []
        };

        const arr = db.get("users").value();

        arr.sort((a, b) => {
            if (a.time > b.time) return -1
            return a.name < b.name ? 1 : 0
        })

        arr.forEach(element => {

            const username = client.users.cache.get(element.id).username;

            var msec = element.time;
            var hh = Math.floor(msec / 1000 / 60 / 60);
            msec -= hh * 1000 * 60 * 60;
            var mm = Math.floor(msec / 1000 / 60);
            msec -= mm * 1000 * 60;
            var ss = Math.floor(msec / 1000);
            msec -= ss * 1000;

            if (elementNum < 4) {
                embed.fields.push({
                    "name": "#" + elementNum,
                    "value": username + ", **" + hh + "h " + mm + "m " + ss + "s**"
                });
            }

            elementNum++;
        });

        embed.fields.forEach(element => {
            element.name = element.name.replace("#1", "🥇 #1");
            element.name = element.name.replace("#2", "🥈 #2");
            element.name = element.name.replace("#3", "🥉 #3");
        });

        message.channel.send({
            embed
        });
    }

    if (command === "join") {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            const connection = await message.member.voice.channel.join();
            const dispatcher = connection.play('./music.mp3');
            dispatcher.setVolume(0.1);
            dispatcher.on('finish', () => {
                console.log('Finished playing and leaving voice');
                message.member.voice.channel.leave();
            });
        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    if (command === "say") {

        if (!args.length) {
            return message.channel.send(`No arguments, ${message.author}!`);
        }

        var text = message.content.replace("?say ", "");

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {

            say.export(text, null, 1, './src/temp.wav', async (err) => {
                if (err) {
                    return console.error(err)
                }
                console.log('Text exported to temp.wav.')
                const connection = await message.member.voice.channel.join();
                const dispatcher = connection.play('./src/temp.wav');
                dispatcher.setVolume(0.1);
                dispatcher.on('finish', () => {
                    console.log('Finished playing and leaving voice');
                    message.member.voice.channel.leave();
                });
            })
        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    if (command === "play") {

        if (!args.length) {
            return message.channel.send(`No arguments, ${message.author}!`);
        }

        var text = message.content.replace(prefix + "play ", "");

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            const connection = await message.member.voice.channel.join();
            const dispatcher = connection.play(ytdl(text, {
                filter: 'audioonly'
            }));
            dispatcher.setVolume(0.1);
            dispatcher.on('finish', () => {
                console.log('Finished playing and leaving voice');
                message.member.voice.channel.leave();
            });

        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    if (command === "stop") {
        message.member.voice.channel.leave();
    }

});

var times = [];
var time = {
    in: 0,
    out: 0
};

client.on('voiceStateUpdate', async function (data, newdata) {

    if (data.channelID != newdata.channelID) {

        const username = client.users.cache.get(data.id).username;

        //Switched voice hannel
        if (newdata.channelID != null && data.channelID != null) {
            console.log(username + ": Switched Channel");
        }

        //Joining voice channel
        if (newdata.channelID != null && !(newdata.channelID != null && data.channelID != null)) {
            console.log(username + ": Joined");

            time.in = Date.now();
            times[data.id] = time;
        }

        //Leaving voice channel
        if (newdata.channelID == null) {
            console.log(username + ": Left");

            times[data.id].out = Date.now();

            var diff = times[data.id].out - times[data.id].in;

            var currentTime = db.get("users").find({
                id: data.id
            }).value();

            if (currentTime == null) {
                currDiff = diff;
                db.get("users").push({
                    id: data.id,
                    time: diff
                }).write();
            } else {
                var currDiff = currentTime.time + diff;
                db.get("users").find({
                    id: data.id
                }).assign({
                    time: currDiff
                }).write();
            }

            var msec = diff;
            var hh = Math.floor(msec / 1000 / 60 / 60);
            msec -= hh * 1000 * 60 * 60;
            var mm = Math.floor(msec / 1000 / 60);
            msec -= mm * 1000 * 60;
            var ss = Math.floor(msec / 1000);
            msec -= ss * 1000;

            console.log(username + ": In voice for: " + hh + "h " + mm + "m " + ss + "s.");

            var msec = currDiff;
            var hh = Math.floor(msec / 1000 / 60 / 60);
            msec -= hh * 1000 * 60 * 60;
            var mm = Math.floor(msec / 1000 / 60);
            msec -= mm * 1000 * 60;
            var ss = Math.floor(msec / 1000);
            msec -= ss * 1000;

            console.log(username + ": Total: " + hh + "h " + mm + "m " + ss + "s.");
        }

    }

    if (data.selfMute != newdata.selfMute && data.selfMute != null) {

        const username = client.users.cache.get(data.id);

        if (newdata.selfMute == true) {

            if (data.member.voice.channel) {
                const connection = await data.member.voice.channel.join();
                const dispatcher = connection.play('./src/' + (Math.floor(Math.random() * 7) + 1) + '.mp3');
                dispatcher.setVolume(0.1);
                dispatcher.on('finish', () => {
                    console.log('Finished playing and leaving voice');
                    data.member.voice.channel.leave();
                });
            } 
        }

        // if (newdata.selfMute == false) {
        //     console.log("Unmuted!");
        // }
    }
});

client.login(token);