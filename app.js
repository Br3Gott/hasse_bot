/*---------------------------------------------------------
TO DO:
*Last seen in top list
*Better randomness for audio clips
*Add check if song is playable(ex. not avalible in country or private)
*Add short command to play "Klassiker" pre shuffled
*Repeat function
*Make function for time tracking
---------------------------------------------------------*/
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

//Youtube search init
const ytsr = require('ytsr');

//Youtube playlist resolver init
const ytpl = require('ytpl');

//App Variables
var dispatcher;
var playing = false;
var kilo = 1;
var queue = [];

//App is ready
client.on('ready', () => {
    console.log(`App started! Connected as BOT:[${client.user.tag}]`);
});

client.on('message', async message => {
    // Check if message is from guild(server) otherwise return;
    if (!message.guild) return;

    //Easter egg when mentioning "mjöl"
    if (message.content.toLowerCase().includes("1kg mjöl") || message.content.toLowerCase().includes("1kilo mjöl") || message.content.toLowerCase().includes("1kgmjöl") || message.content.toLowerCase().includes("1kilomjöl") || message.content.toLowerCase().includes("1kg") || message.content.toLowerCase().includes("1kilo") || message.content.toLowerCase().includes("mjöl")) {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            if (!playing) {
                playing = true;

                //For random sound clip
                kilo = Math.floor(Math.random()*3)+5;

                const connection = await message.member.voice.channel.join();
                dispatcher = connection.play('./src/kilo/' + kilo + '.mp3');
                dispatcher.setVolume(0.1);
                dispatcher.on('finish', () => {
                    kilo++
                    if(kilo > 8){
                        message.reply('Mjölet är nu slut!'); 
                        kilo = 1;
                    }
                    console.log('Finished playing and leaving voice');
                    message.member.voice.channel.leave();
                    playing = false;
                });
            }
        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    //Check if message starts with configured prefix and is not from bot.
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    //Split message into variables.
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift().toLowerCase();

    if (command === "beep") {
        message.channel.send('Boop.🤖');
    }

    if (command === "roll") {
        message.channel.send('🎲 säger ' + getRandomInt(6));
    }

    if (command === "clearchat") {
        //This can probably be optimized for faster removal.
        
        if (!args.length) {
            return message.channel.send("How many?");
        }

        var channel = message.channel;
        var amount = parseInt(args[0]) + 1;
        var count = 1;

        channel.messages.fetch({ limit: amount }).then(async messages => {
            messages.forEach(message => {
                console.log("Deleting: "+message.id + " " + count + " of "+ amount);
                message.delete();
                count++;
            });
          })
          .catch(console.error);

    }

    if (command === "mystats") {
        //If you are in a voice channel, update your online time.
        if (times[message.author.id] != null) {

            //Store time untill now
            times[message.author.id].out = Date.now();

            var diff = times[message.author.id].out - times[message.author.id].in;

            var t_s = time_convert(diff);

            console.log(message.author.username + ": Uppdaterat räkning. Current: " + t_s.h + "h " + t_s.m + "m " + t_s.s + "s.");

            var currentTime = db.get("users").find({
                id: message.author.id
            }).value();

            if (currentTime == null) {
                currDiff = diff;
                db.get("users").push({
                    id: message.author.id,
                    name: message.author.username,
                    time: diff
                }).write();
            } else {
                var currDiff = currentTime.time + diff;
                db.get("users").find({
                    id: message.author.id
                }).assign({
                    time: currDiff
                }).write();
            }

            //Start counting again
            time.in = Date.now();
            times[message.author.id] = time;

        }  

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

        var t_s = time_convert(currDiff);

        message.reply("In voice-chat for: " + t_s.h + "h " + t_s.m + "m " + t_s.s + "s.");
    }

    if (command === "stats") {

        //FIX: update db before print ?loop through times variable...

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

            var t_s = time_convert(element.time);

            if (elementNum < 6) {
                embed.fields.push({
                    "name": "#" + elementNum,
                    "value": element.name + ", **" + t_s.h + "h " + t_s.m + "m " + t_s.s + "s**"
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

    if (command === "pick") {
        // Only try to pick if the the sender is in a voice channel
        if (message.member.voice.channel) {

            var channelMembers = message.member.voice.channel.members;
            var users = "";
            var usersArr = [];
            var count = 0;
            channelMembers.forEach(member => {
                users += member.user.username + ", ";
                count++;
                usersArr[count] = member.user.username;
            });
            message.channel.send("Om jag skulle välja mellan: " + users);

            var randomNum = getRandomInt(count);
            message.channel.send("Så väljer jag: " + usersArr[randomNum]);

        } else {
            message.reply('Vart fan vill du att jag ska kolla då?');
        }
    }

    if (command === "join") {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            if (!playing) {
                playing = true;
                const connection = await message.member.voice.channel.join();
                dispatcher = connection.play('./music.mp3');
                dispatcher.setVolume(0.1);
                dispatcher.on('finish', () => {
                    console.log('Finished playing and leaving voice');
                    message.member.voice.channel.leave();
                    playing = false;
                });
            }
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
            if (!playing) {
                playing = true;
                say.export(text, null, 1, './src/temp.wav', async (err) => {
                    if (err) {
                        return console.error(err)
                    }
                    console.log('Text exported to temp.wav.')
                    const connection = await message.member.voice.channel.join();
                    dispatcher = connection.play('./src/temp.wav');
                    dispatcher.setVolume(0.1);
                    dispatcher.on('finish', () => {
                        console.log('Finished playing and leaving voice');
                        message.member.voice.channel.leave();
                        playing = false;
                    });
                })
            }
        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    if (command === "play") {

        if (!args.length) {
            return message.channel.send(`No arguments, ${message.author}!`);
        }

        var text = message.content.replace(prefix + "play ", "");

        if (!ytdl.validateURL(text)) {
            return message.channel.send(`Unknown URL, ${message.author}!`);
        }

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            if (!playing) {
                playing = true;
                const connection = await message.member.voice.channel.join();
                dispatcher = connection.play(ytdl(text, {
                    filter: 'audioonly'
                }));
                dispatcher.setVolume(0.1);
                dispatcher.on('finish', () => {
                    console.log('Finished playing and leaving voice');
                    message.member.voice.channel.leave();
                    playing = false;
                });
            }else{
                //add to queue
            }
        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    if (command === "search") {

        if (!args.length) {
            return message.channel.send(`No arguments, ${message.author}!`);
        }

        var text = message.content.replace(prefix + "search ", "");

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            if (!playing) {
                playing = true;
                const connection = await message.member.voice.channel.join();
                const res = await ytsr(text, {limit: 1})
                dispatcher = connection.play(ytdl(res.items[0].url, {
                    filter: 'audioonly'
                }));
                dispatcher.setVolume(0.1);
                dispatcher.on('finish', () => {
                    console.log('Finished playing and leaving voice');
                    message.member.voice.channel.leave();
                    playing = false;
                });
            }else{
                //add to queue
            }
        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    if (command === "queue" || command === "q") {

        if (!args.length) {
            //show what is in queue
            return message.channel.send(`No arguments, ${message.author}!`);
        }

        var statusUrl = true;
        args.forEach(arg => {
            if (!ytdl.validateURL(text)) {
                statusUrl = false;
            }
        });

        if(statusUrl){
            return message.channel.send(`Unknown URL, ${message.author}!`);
        }

        args.forEach( async function(arg) {
            if (arg.includes("list=")) {
                const playlist = await ytpl(arg);
                playlist.items.forEach(item => {
                    queue.push(item.shortUrl);
                });
            }else {
                queue.push(arg);
            }
        });

        //delay issue due to await -- for now bad temp fix
        if (!playing) {
            setTimeout(function() {
                playFromQueue(message);
            }, 1000);  
        }
        
    }

    if (command === "clear") {
        queue = [];
        message.channel.send("Cleared the queue!");

    }

    if (command === "stop") {
        message.member.voice.channel.leave();
        playing = false;
    }

    if (command === "pause") {
        if(playing){
            dispatcher.pause();
            message.channel.send("Paused music!");
        }
        
    }

    if (command === "resume") {
        if (playing) {
            dispatcher.resume();
            message.channel.send("Resumed music!");
        }
        
    }

    if (command === "skip") {
        message.channel.send("Skipping current song!");
        playFromQueue(message, true);
    }

    if (command === "shuffle") {
        queue = queue.sort(() => Math.random() - 0.5);
        message.channel.send("Shuffled the queue!");
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

        //Switched voice channel
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

            if (times[data.id] == null) {
                return;
            }

            times[data.id].out = Date.now();

            var diff = times[data.id].out - times[data.id].in;

            var currentTime = db.get("users").find({
                id: data.id
            }).value();

            if (currentTime == null) {
                currDiff = diff;
                db.get("users").push({
                    id: data.id,
                    name: username,
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

            var t_s = time_convert(diff);

            console.log(username + ": In voice for: " + t_s.h + "h " + t_s.m + "m " + t_s.s + "s.");

            var t_s = time_convert(currDiff);

            console.log(username + ": Total: " + t_s.h + "h " + t_s.m + "m " + t_s.s + "s.");
        }

    }

    if (data.selfMute != newdata.selfMute && data.selfMute != null) {

        const username = client.users.cache.get(data.id);

        if (newdata.selfMute == true) {

            if (data.member.voice.channel) {
                if (!playing) {
                    playing = true;
                    const connection = await data.member.voice.channel.join();
                    dispatcher = connection.play('./src/' + getRandomInt(8) + '.mp3');
                    dispatcher.setVolume(0.1);
                    dispatcher.on('finish', () => {
                        console.log('Finished playing and leaving voice');
                        data.member.voice.channel.leave();
                        playing = false;
                    });
                }
            } 
        }

        // if (newdata.selfMute == false) {
        //     console.log("Unmuted!");
        // }
    }
});

function time_convert(time_msec) {
    var t_s = {
        h: 0,
        m: 0,
        s: 0
    };

    var msec = time_msec;
    t_s.h = Math.floor(msec / 1000 / 60 / 60);
    msec -= t_s.h * 1000 * 60 * 60;
    t_s.m = Math.floor(msec / 1000 / 60);
    msec -= t_s.m * 1000 * 60;
    t_s.s = Math.floor(msec / 1000);
    msec -= t_s.s * 1000; 

    return t_s;
}

function getRandomInt(max) {
    var random;
    for (let i = 0; i < Math.floor(Math.random() * 100); i++) {
        random = Math.floor(Math.random() * Math.floor(max)) + 1;
    }
    return random;
}

async function playFromQueue(message, next) {
    if (!playing || next) {

        var url = queue.shift();

        if (url == null) {
            return message.channel.send("Queue is empty!");
        }

        // message.channel.send("Playing from queue: "+url);

        playing = true;
        const connection = await message.member.voice.channel.join();
        dispatcher = connection.play(ytdl(url, {
            filter: 'audioonly'
        }));
        dispatcher.setVolume(0.1);
        dispatcher.on('finish', () => {
            if (queue[0] == null) {
                console.log('Finished playing and leaving voice');
                message.member.voice.channel.leave();
                playing = false;
            }else {
                console.log('Songs still in queue playing next');
                playing = false;
                playFromQueue(message);
            }
        });
    }
}

client.login(token);