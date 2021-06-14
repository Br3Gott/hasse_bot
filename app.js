/*---------------------------------------------------------
TO DO:
*Last seen in top list
*Better randomness for audio clips
*Add check if song is playable(ex. not avalible in country or private)
    *Half done, error msg added
*Resume after ee on the right time(if yt);
*Make function for time tracking
*ge mig <search_term> -> sök bild
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

//Fetch for quotes
const fetch = require('node-fetch');

//Express webapp
const express = require('express')
const app = express()
const port = 2345
let busyAdd = false;

//App Variables
var connection;
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
var apiQueueItem = {
    song: null,
    thumbnail_url: null,
    artist: null
};
var times = [];
var time = {
    in: 0,
    out: 0
};

var lastMessage = 0;

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
            kilo = Math.floor(Math.random() * 3) + 5;

            queueItem.type = "ee";
            queueItem.value = './src/kilo/' + kilo + '.mp3';
            queue.unshift(queueItem);
            queueItem = {
                type: null,
                value: null
            };

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

    if (command === "quote") {

        const response = await fetch("https://api.quotable.io/random");
        const data = await response.json();

        message.channel.send(`"${data.content}" - ${data.author}`);

        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {

            say.export(data.content, null, 1, './src/' + queue.length + 'temp.wav', async (err) => {
                if (err) {
                    return console.error(err);
                }
                logPrint('Text to speach processing done!');
                queueItem.type = "say";
                queueItem.value = './src/' + queue.length + 'temp.wav';
                queue.unshift(queueItem);
                queueItem = {
                    type: null,
                    value: null
                };

                playFromQueue(message, true);
            });

        }
    }

    if (command === "radio") {

        let date = new Date();
        let current = encodeURIComponent(date.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }).substr(0,10) + " " + date.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }).substr(11,8));
        await fetch("https://listenapi.planetradio.co.uk/api9.2/events/rok/"+ current +"/25", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6,ru;q=0.5",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"90\", \"Google Chrome\";v=\"90\"",
                "sec-ch-ua-mobile": "?0",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "sec-gpc": "1"
            },
            "referrer": "https://radioplay.se/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors"
            })
            .then(res => res.json())
            .then(json => {
                json.forEach(async element => {

                    if (message.member.voice.channel) {
                        let text = element.nowPlayingTrack + " - " +element.nowPlayingArtist;
                        logPrint("[RADIO] Found: " + text);
                        //resolve and add to queue
                        const res = await ytsr(text, {
                            limit: 1
                        });
                        if (res.items.length == 0) {
                            console.log(`Kass jävla sökning, jag hittade inte ett skit. ${message.author}!`);
                        } else {
                            queueItem.type = "ytdl";
                            queueItem.value = res.items[0].url;
                            queue.push(queueItem);
                            resolveQueue();
                            queueItem = {
                                type: null,
                                value: null
                            };

                            if (!playing) {
                                playFromQueue(message);
                            } else {
                                // console.log("Tillagd i kön.");
                            }
                        }

                    } else {
                        // console.log('Vart fan vill du att jag ska då?');
                    }

                });
            });   
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

        channel.messages.fetch({
                limit: amount
            }).then(async messages => {
                messages.forEach(message => {
                    logPrint("Deleting: " + message.id + " " + count + " of " + amount);
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

            say.export(text, null, 1, './src/' + queue.length + 'temp.wav', async (err) => {
                if (err) {
                    return console.error(err);
                }
                logPrint('Text to speach processing done!');
                queueItem.type = "say";
                queueItem.value = './src/' + queue.length + 'temp.wav';
                queue.push(queueItem);
                resolveQueue();
                queueItem = {
                    type: null,
                    value: null
                };

                if (!playing) {
                    playFromQueue(message);
                } else {
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
            resolveQueue();
            queueItem = {
                type: null,
                value: null
            };

            if (!playing) {
                playFromQueue(message);
            } else {
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
            const res = await ytsr(text, {
                limit: 1
            });
            if (res.items.length == 0) {
                message.channel.send(`Kass jävla sökning, jag hittade inte ett skit. ${message.author}!`);
            } else {
                queueItem.type = "ytdl";
                queueItem.value = res.items[0].url;
                queue.push(queueItem);
                resolveQueue();
                queueItem = {
                    type: null,
                    value: null
                };

                if (!playing) {
                    playFromQueue(message);
                } else {
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
            // return message.channel.send(`No arguments, ${message.author}!`);
            message.channel.send(`Nu spelas: `);
            if (queue.length > 0) {
                message.channel.send(queue[0].value);
            }
            message.channel.send(`Nästa i kön är: `);
            if (queue.length > 1) {
                message.channel.send(queue[1].value);
            }
            return
        }

        var statusUrl = true;
        args.forEach(arg => {
            if (!ytdl.validateURL(text)) {
                statusUrl = false;
            }
        });

        if (statusUrl) {
            return message.channel.send(`Unknown URL, ${message.author}!`);
        }

        args.forEach(async function (arg) {
            if (arg.includes("list=")) {
                const playlist = await ytpl(arg);
                playlist.items.forEach(item => {
                    queueItem.type = "ytdl";
                    queueItem.value = item.shortUrl;
                    queue.push(queueItem);
                    resolveQueue();
                    queueItem = {
                        type: null,
                        value: null
                    };
                });
            } else {
                queueItem.type = "ytdl";
                queueItem.value = arg;
                queue.push(queueItem);
                resolveQueue();
                queueItem = {
                    type: null,
                    value: null
                };
            }
        });

        //delay issue due to await -- for now bad temp fix
        if (!playing) {
            setTimeout(function () {
                playFromQueue(message);
            }, 1000);
        }

    }

    if (command === "classic" || command === "klassiker") {
        //Refactor with functions instead of reusing code
        const playlist = await ytpl("https://www.youtube.com/playlist?list=PL3NF4GNWwH4gCsNfFWj-Kco40PfvSRTyq");
        playlist.items.forEach(item => {
            queueItem.type = "ytdl";
            queueItem.value = item.shortUrl;
            queue.push(queueItem);
            resolveQueue();
            queueItem = {
                type: null,
                value: null
            };
        });
        message.channel.send("Added music to queue!");
        //delay issue due to await -- for now bad temp fix
        if (!playing) {
            shuffleArray(queue);
            message.channel.send("Shuffled the queue!");

            setTimeout(function () {
                message.channel.send("Started playing!");
                playFromQueue(message);
            }, 1000);
        }

    }

    if (command === "zombies") {
        //Refactor with functions instead of reusing code
        const playlist = await ytpl("https://www.youtube.com/playlist?list=PLphIVgFFFw7WnQ9A0tLRbcMEeufwnXqfK");
        playlist.items.forEach(item => {
            queueItem.type = "ytdl";
            queueItem.value = item.shortUrl;
            queue.push(queueItem);
            resolveQueue();
            queueItem = {
                type: null,
                value: null
            };
        });
        message.channel.send("Added music to queue!");
        //delay issue due to await -- for now bad temp fix
        if (!playing) {
            shuffleArray(queue);
            message.channel.send("Shuffled the queue!");

            setTimeout(function () {
                message.channel.send("Started playing!");
                playFromQueue(message);
            }, 1000);
        }

    }

    if (command === "clear") {

        clear_queue();

        message.channel.send("Cleared the queue!");

    }

    if (command === "join") {
        lastMessage = message;
        connection = await message.member.voice.channel.join();
    }

    if (command === "stop") {
        lastMessage = 0;
        connection.disconnect();
        if (loop) {
            next = queue.shift();
            queue.push(next);
            next = {
                type: null,
                value: null
            };
        } else {
            queue.shift();
        }
        playing = false;
    }

    if (command === "pause") {
        if (playing) {
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
        if (loop) {
            next = queue.shift();
            queue.push(next);
            next = {
                type: null,
                value: null
            };
        } else {
            queue.shift();
        }
        playFromQueue(message, true);
    }

    if (command === "loop") {

        if (loop) {
            message.channel.send("Loop: off");
            loop = false;
        } else {
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
        } else {
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
    // if (message == 0) {
    //     message = lastMessage;
    // }else {
    //     if (lastmessage == 0) {
    //         return;
    //     }
    //     lastMessage = message;
    // }

    lastMessage = message;

    if (!playing || skip) {

        if (queue[0] == null) {

            queueItem.type = "ee";
            queueItem.value = "./src/empty.mp3";
            next = queueItem;
            queueItem = {
                type: null,
                value: null
            };

            // return message.channel.send("Kö tom");
        } else {
            next = queue[0];
        }

        // message.channel.send("Playing from queue: "+next.value);

        playing = true;
        //check if already connected then dont try to reconnect.
        // if (!connection) {
        connection = await message.member.voice.channel.join();
        // }

        if (next.type == "ytdl") {
            dispatcher = connection.play(ytdl(next.value, {
                filter: 'audio'
            }));
        } else if (next.type == "say" || next.type == "ee") {
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
            if (loop) {
                queue.push(next);
            }
            queue.shift();
            

            if (queue[0] == null) {
                logPrint('Finished playing and leaving voice');
                message.member.voice.channel.leave();
                playing = false;
            } else {
                logPrint('Songs still in queue playing next');
                playing = false;
                playFromQueue(message);
            }
        });
    }
}

async function resolveQueue() {

    for (let i = 0; i < queue.length; i++) {
        if (typeof queue[i].info === 'undefined') {
            if (queue[i].type == "ytdl") {
                //Stop resolving if queue is cleared
                if (queue.length > 0) {
                    apiQueueItem.artist = queue[i].value;
                    let info = await ytdl.getInfo(queue[i].value);
                    apiQueueItem.song = info.videoDetails.title;
                    apiQueueItem.thumbnail_url = info.videoDetails.thumbnails[(info.videoDetails.thumbnails.length-1)].url;
                    //Prevent missmatch when shuffle and resolving
                    if (typeof queue[i] != 'undefined' && queue[i].value == apiQueueItem.artist) {
                        queue[i].info = apiQueueItem;
                    }
                }
                apiQueueItem = {
                    song: null,
                    thumbnail_url: null,
                    artist: null
                };
            } else {
                apiQueueItem.song = queue[i].value;
                apiQueueItem.artist = queue[i].type;
                queue[i].info = apiQueueItem;
                apiQueueItem = {
                    song: null,
                    artist: null
                };
            }
        }
    };
}

function clear_queue() {

    if(queue.length > 0 ){
        let temp_song = queue.shift();
        queue = [];
        queue.push(temp_song);
    }

}

//Express webapp
//serve site
app.use("/", express.static('public'));

//api endpoints
app.get('/api', (req, res) => {
    resolveQueue();
    res.send({
        queue
    });
});

app.get('/status', (req, res) => {
    let lastMessageRecived = false;
    if (lastMessage != 0) {
        lastMessageRecived = true;
    }

    res.send({
        playing,
        paused,
        loop,
        lastMessageRecived
    });
});

app.get('/shuffle', (req, res) => {
    if (playing || paused) {
        var temp = queue.shift();
        shuffleArray(queue);
        queue.unshift(temp);
    } else {
        shuffleArray(queue);
    }
    // channel = client.channels.cache.get('800706486896558110');
    // channel.send("WEBUSER: Shuffled the queue!");
    res.send("shuffled");
});

app.get('/playtoggle', (req, res) => {
    console.log("playtoggle");
    res.send("playtoggle");
    // channel = client.channels.cache.get('800706486896558110');
    if (playing && !paused) {
        dispatcher.pause();
        paused = true;
        // channel.send("WEBUSER: Paused music!");
    } else {
        dispatcher.resume();
        paused = false;
        // channel.send("WEBUSER: Resumed music!");
    }
});

app.get('/skip', (req, res) => {
    res.send("skipping");
    // channel = client.channels.cache.get('800706486896558110');
    if (lastMessage == 0) {
        // channel.send("WEBUSER: Play something first!");
        return;
    }
    // channel.send("WEBUSER: Yeeting this song!");
    if (loop) {
        next = queue.shift();
        queue.push(next);
        next = {
            type: null,
            value: null
        };
    } else {
        queue.shift();
    }
    playFromQueue(lastMessage, true);
});

app.get('/clear', (req, res) => {
    console.log("clear");
    res.send("clear");
    clear_queue();
    // channel = client.channels.cache.get('800706486896558110');
    // channel.send("WEBUSER: Cleared the queue!");
});

app.get('/loop', (req, res) => {
    console.log("loop");
    res.send("loop");
    // channel = client.channels.cache.get('800706486896558110');
    if (loop) {
        // channel.send("WEBUSER: Loop: off");
        loop = false;
    } else {
        // channel.send("WEBUSER: Loop: on");
        loop = true;
    }
    playFromQueue(lastMessage);
});

app.get('/remove', (req, res) => {
    res.send("removing");
    queue.splice(req.query.id, 1);
});

app.get('/playnow', (req, res) => {
    res.send("playing");
    let temp = queue.splice(req.query.id, 1);
    queue.unshift(temp[0]);
    playFromQueue(lastMessage, true);
});

app.get('/search', async (req, res) => {
    res.send("searching");
    let text = req.query.q;
    const result = await ytsr(text, {
        limit: 1
    });

    queueItem.type = "ytdl";
    queueItem.value = result.items[0].url;
    queue.push(queueItem);
    resolveQueue();
    queueItem = {
        type: null,
        value: null
    };

    if (!playing) {
        playFromQueue(lastMessage);
    } else {
        // channel = client.channels.cache.get('800706486896558110');
        // channel.send("WEBUSER: Tillagd i kön.");
    }
});

app.get('/move', (req, res) => {
    res.send("moving");
    let from = req.query.from;
    let to = req.query.to;
    if (to >= 1 && to <= queue.length) {
        let element = queue[from];
        queue.splice(from, 1);
        queue.splice(to, 0, element);
    }
});

app.get('/preset', async (req, res) => {
    res.send("starting from preset");
    //Try to prevent adding multiples of songs.
    if(!busyAdd){
        busyAdd = true;
        if (req.query.id == 1) {
            console.log("klassiker");
            //Refactor with functions instead of reusing code
            const playlist = await ytpl("https://www.youtube.com/playlist?list=PL3NF4GNWwH4gCsNfFWj-Kco40PfvSRTyq");
            playlist.items.forEach(item => {
                queueItem.type = "ytdl";
                queueItem.value = item.shortUrl;
                queue.push(queueItem);
                resolveQueue();
                queueItem = {
                    type: null,
                    value: null
                };
            });

            busyAdd = false;

            // message.channel.send("Added music to queue!");
            //delay issue due to await -- for now bad temp fix
            if (!playing) {
                shuffleArray(queue);
                // message.channel.send("Shuffled the queue!");
    
                setTimeout(function () {
                    // message.channel.send("Started playing!");
                    playFromQueue(lastMessage);
                }, 1000);
            }
        } else if (req.query.id == 2) {
            //Refactor with functions instead of reusing code
            const playlist = await ytpl("https://www.youtube.com/playlist?list=PLphIVgFFFw7WnQ9A0tLRbcMEeufwnXqfK");
            playlist.items.forEach(item => {
                queueItem.type = "ytdl";
                queueItem.value = item.shortUrl;
                queue.push(queueItem);
                resolveQueue();
                queueItem = {
                    type: null,
                    value: null
                };
            });

            busyAdd = false;

            // message.channel.send("Added music to queue!");
            //delay issue due to await -- for now bad temp fix
            if (!playing) {
                shuffleArray(queue);
                // message.channel.send("Shuffled the queue!");
    
                setTimeout(function () {
                    // message.channel.send("Started playing!");
                    playFromQueue(lastMessage);
                }, 1000);
            }
        } else if (req.query.id == 3) {
            console.log("radio");
            
            let date = new Date();
            let current = encodeURIComponent(date.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }).substr(0,10) + " " + date.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }).substr(11,8));
            await fetch("https://listenapi.planetradio.co.uk/api9.2/events/rok/"+ current +"/25", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6,ru;q=0.5",
                    "cache-control": "no-cache",
                    "pragma": "no-cache",
                    "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"90\", \"Google Chrome\";v=\"90\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "cross-site",
                    "sec-gpc": "1"
                },
                "referrer": "https://radioplay.se/",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors"
                })
                .then(res => res.json())
                .then(json => {
                    json.forEach(async element => {

                        if (lastMessage.member.voice.channel) {
                            let text = element.nowPlayingTrack + " - " +element.nowPlayingArtist;
                            logPrint("[RADIO] Found: " + text);
                            //resolve and add to queue
                            const res = await ytsr(text, {
                                limit: 1
                            });
                            if (res.items.length == 0) {
                                console.log(`Kass jävla sökning, jag hittade inte ett skit.`);
                            } else {
                                queueItem.type = "ytdl";
                                queueItem.value = res.items[0].url;
                                queue.push(queueItem);
                                resolveQueue();
                                queueItem = {
                                    type: null,
                                    value: null
                                };

                                if (!playing) {
                                    playFromQueue(lastMessage);
                                } else {
                                    // console.log("Tillagd i kön.");
                                }
                            }

                        } else {
                            // console.log('Vart fan vill du att jag ska då?');
                        }

                    });
                });
        }
    }
});

//start app
app.listen(port, () => logPrint(`Website running on port:[${port}]`));