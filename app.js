/*---------------------------------------------------------
TO DO:
*Last seen in top list
*Better randomness for audio clips
*Add check if song is playable(ex. not avalible in country or private)
    *Half done, error msg added
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
var next;
var playing = false;
var paused = false;
var loop = false;
var kilo = 1;
var queue = [];
var queueItem = {
    type: null,
    value: null
};
var times = [];
var time = {
    in: 0,
    out: 0
};

//App is ready
client.on('ready', () => {
    logPrint(`App started! Connected as BOT:[${client.user.tag}]`);
});

client.on('message', async message => {
    // Check if message is from guild(server) otherwise return;
    if (!message.guild) return;

    //Easter egg when mentioning "mjöl"
    if (message.content.toLowerCase().includes("1kg mjöl") || message.content.toLowerCase().includes("1kilo mjöl") || message.content.toLowerCase().includes("1kgmjöl") || message.content.toLowerCase().includes("1kilomjöl") || message.content.toLowerCase().includes("1kg") || message.content.toLowerCase().includes("1kilo") || message.content.toLowerCase().includes("mjöl")) {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {

            //For random sound clip
            kilo = Math.floor(Math.random()*3)+5;

            queueItem.type =  "ee";
            queueItem.value = './src/kilo/' + kilo + '.mp3';
            queue.unshift(queueItem);
            queueItem = {type: null, value: null};

            playFromQueue(message, true);

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
                logPrint("Deleting: "+message.id + " " + count + " of "+ amount);
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

            var t_s = convertTime(diff);

            logPrint(message.author.username + ": Uppdaterat räkning. Current: " + t_s.h + "h " + t_s.m + "m " + t_s.s + "s.");

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

        var t_s = convertTime(currDiff);

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

            var t_s = convertTime(element.time);

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

    if (command === "say") {

        if (!args.length) {
            return message.channel.send(`Jaha, ska jag bara vara tyst då eller? ${message.author}!`);
        }

        var text = message.content.replace("?say ", "");

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {

            say.export(text, null, 1, './src/'+ queue.length +'temp.wav', async (err) => {
                if (err) {
                    return console.error(err);
                }
                logPrint('Text to speach processing done!');
                queueItem.type = "say";
                queueItem.value = './src/'+ queue.length +'temp.wav';
                queue.push(queueItem);
                queueItem = {type: null, value: null};

                if (!playing) {
                    playFromQueue(message);
                }else{
                    message.channel.send("Tillagd i kön.");
                }
            });

        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    if (command === "play") {

        if (!args.length) {
            return playFromQueue(message);
            // return message.channel.send(`En länk brukar behövas... ${message.author}!`);
        }

        var text = message.content.replace(prefix + "play ", "");

        if (!ytdl.validateURL(text)) {
            return message.channel.send(`Konstigaste youtube länken jag sett på länge. ${message.author}!`);
        }

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
                queueItem.type = "ytdl";
                queueItem.value = text;
                queue.push(queueItem);
                queueItem = {type: null, value: null};

                if (!playing) {
                    playFromQueue(message);
                }else{
                    message.channel.send("Tillagd i kön.");
                }
        } else {
            message.reply('Vart fan vill du att jag ska då?');
        }
    }

    if (command === "search") {

        if (!args.length) {
            return message.channel.send(`Jaha, vad tycker du jag ska söka efter då, ${message.author}!`);
        }

        var text = message.content.replace(prefix + "search ", "");

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            //resolve and add to queue
            const res = await ytsr(text, {limit: 1});
            if (res.items.length == 0) {
                message.channel.send(`Kass jävla sökning, jag hittade inte ett skit. ${message.author}!`);
            }else {
                queueItem.type = "ytdl";
                queueItem.value = res.items[0].url;
                queue.push(queueItem);
                queueItem = {type: null, value: null};

                if (!playing) {
                    playFromQueue(message);
                }else{
                    message.channel.send("Tillagd i kön.");
                }
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
                    queueItem.type = "ytdl";
                    queueItem.value = item.shortUrl;
                    queue.push(queueItem);
                    queueItem = {type: null, value: null};
                });
            }else {
                queueItem.type = "ytdl";
                queueItem.value = arg;
                queue.push(queueItem);
                queueItem = {type: null, value: null};
            }
        });

        //delay issue due to await -- for now bad temp fix
        if (!playing) {
            setTimeout(function() {
                playFromQueue(message);
            }, 1000);  
        }
        
    }

    if (command === "classic") {
        //Refactor with functions instead of reusing code
        const playlist = await ytpl("https://www.youtube.com/playlist?list=PL3NF4GNWwH4gCsNfFWj-Kco40PfvSRTyq");
                playlist.items.forEach(item => {
                    queueItem.type = "ytdl";
                    queueItem.value = item.shortUrl;
                    queue.push(queueItem);
                    queueItem = {type: null, value: null};
                });
                message.channel.send("Added music to queue!");
        //delay issue due to await -- for now bad temp fix
        if (!playing) {
            shuffleArray(queue);
            message.channel.send("Shuffled the queue!");

            setTimeout(function() {
                message.channel.send("Playing!");
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
        if(loop) {
            next = queue.shift();
            queue.push(next);
            next = {type: null, value: null};
        }else {
            queue.shift();
        }
        playing = false;
    }

    if (command === "pause") {
        if(playing){
            dispatcher.pause();
            paused = true;
            message.channel.send("Paused music!");
        }
        
    }

    if (command === "resume") {
        if (playing) {
            dispatcher.resume();
            paused = false;
            message.channel.send("Resumed music!");
        }
        
    }

    if (command === "skip") {
        message.channel.send("Yeeting this song!");
        if(loop) {
            next = queue.shift();
            queue.push(next);
            next = {type: null, value: null};
        }else {
            queue.shift();
        }
        playFromQueue(message, true);
    }

    if (command === "loop") {
        
        if (loop) {
            message.channel.send("Loop: off");
            loop = false;
        }else {
            message.channel.send("Loop: on");
            loop = true;
        }
        playFromQueue(message);
    }

    if (command === "shuffle") {
        if (playing || paused) {
            var temp = queue.shift();
            shuffleArray(queue);
            queue.unshift(temp);
        }else {
            shuffleArray(queue);
        }

        message.channel.send("Shuffled the queue!");
    }

    if (command === "sq") {
        logPrint("Songs in queue: " + queue.length);
        console.log(queue);
    }

});

client.on('voiceStateUpdate', async function (data, newdata) {

    //Log time in voice channel
    if (data.channelID != newdata.channelID) {

        const username = client.users.cache.get(data.id).username;

        //Switched voice channel
        if (newdata.channelID != null && data.channelID != null) {
            logPrint(username + ": Switched Channel");
        }

        //Joining voice channel
        if (newdata.channelID != null && !(newdata.channelID != null && data.channelID != null)) {
            logPrint(username + ": Joined");

            time.in = Date.now();
            times[data.id] = time;
        }

        //Leaving voice channel
        if (newdata.channelID == null) {
            logPrint(username + ": Left");

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

            var t_s = convertTime(diff);

            logPrint(username + ": In voice for: " + t_s.h + "h " + t_s.m + "m " + t_s.s + "s.");

            var t_s = convertTime(currDiff);

            logPrint(username + ": Total: " + t_s.h + "h " + t_s.m + "m " + t_s.s + "s.");
        }

    }

    //Easteregg when muted
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
                        logPrint('Finished playing and leaving voice');
                        data.member.voice.channel.leave();
                        playing = false;
                    });
                }
            } 
        }

        // if (newdata.selfMute == false) {
        //     logPrint("Unmuted!");
        // }
    }
});

client.login(token);

//General functions
function logPrint(message) {
    let time = new Date();
    console.log("<" + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds() + "> " + message);
}

function convertTime(time_msec) {
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

function shuffleArray(arr) {
    arr = arr.sort(() => Math.random() - 0.5);
}

//App specific functions
async function playFromQueue(message, skip) {
    if (!playing || skip) {

        if (queue[0] == null) {

            queueItem.type = "ee";
            queueItem.value = "./src/empty.mp3";
            next = queueItem;
            queueItem = {type: null, value: null};

            // return message.channel.send("Kö tom");
        }else {
            next = queue[0];
        }

        // message.channel.send("Playing from queue: "+next.value);

        playing = true;
        const connection = await message.member.voice.channel.join();

        if (next.type == "ytdl") {
            dispatcher = connection.play(ytdl(next.value, {
                filter: 'audioonly'
            }));
        }else if (next.type == "say" || next.type == "ee") {
            dispatcher = connection.play(next.value);
        }

        dispatcher.setVolume(0.1);
        dispatcher.on('error', (err) => {
            console.log(err);
            message.member.voice.channel.leave();
            playing = false;
            return message.channel.send("Åh fy fan, jag satt i halsen!");
        });
        dispatcher.on('finish', () => {
            if(loop) {
                queue.push(next);
            }else {
                queue.shift();
            }

            if (queue[0] == null) {
                logPrint('Finished playing and leaving voice');
                message.member.voice.channel.leave();
                playing = false;
            }else {
                logPrint('Songs still in queue playing next');
                playing = false;
                playFromQueue(message);
            }
        });
    }
}