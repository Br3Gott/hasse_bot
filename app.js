/*---------------------------------------------------------
TO DO:
*Youtube request queue
    *Request playlist
*Youtube pause/unpause function

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

//App Variables
var playing = false;
var kilo = 1;

//App is ready
client.on('ready', () => {
    console.log(`App started! Connected as BOT:[${client.user.tag}]`);
});

client.on('message', async message => {
    // Check if message is from guild(server) otherwise return;
    if (!message.guild) return;

    if (message.content.includes("1kg mjöl") || message.content.includes("1kilo mjöl") || message.content.includes("1kgmjöl") || message.content.includes("1kilomjöl") || message.content.includes("1kg") || message.content.includes("1kilo") || message.content.includes("mjöl")) {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            if (!playing) {
                playing = true;
                
                //For random sound clip
                kilo = Math.floor(Math.random()*3)+5;

                const connection = await message.member.voice.channel.join();
                const dispatcher = connection.play('./src/kilo/' + kilo + '.mp3');
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

    if (command === "mystats") {

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

        //FIX: update db before print ?loopa genom times variable...

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
            message.channel.send("Mellan dessa idioter: " + users);

            var randomNum = Math.floor((Math.random()* count)+1);
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
                const dispatcher = connection.play('./music.mp3');
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
                    const dispatcher = connection.play('./src/temp.wav');
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

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            if (!playing) {
                playing = true;
                const connection = await message.member.voice.channel.join();
                const dispatcher = connection.play(ytdl(text, {
                    filter: 'audioonly'
                }));
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
                const dispatcher = connection.play(ytdl(res.items[0].url, {
                    filter: 'audioonly'
                }));
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

    if (command === "stop") {
        message.member.voice.channel.leave();
        playing = false;
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
                    const dispatcher = connection.play('./src/' + (Math.floor(Math.random() * 7) + 1) + '.mp3');
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

client.login(token);