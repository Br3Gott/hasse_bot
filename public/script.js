//todo work on more button and status

let shuffle = document.querySelector(".shuffle");
shuffle.onclick = function () {
    shuffleQueue();
};
let play = document.querySelector(".play");
play.onclick = function () {
    playToggle();
};
let skipSong = document.querySelector(".skip");
skipSong.onclick = function () {
    skip();
};
let clearbtn = document.querySelector(".clear");
clearbtn.onclick = function () {
    clearQueue();
};
let loop = document.querySelector(".loop");
loop.onclick = function () {
    loopToggle();
};

let searchSubmit = document.querySelector(".searchbtn");
let searchText = document.querySelector(".searchtext");
searchSubmit.onclick = function () {
    search(searchText.value);
    searchText.value = "";
};

function shuffleQueue() {
    fetch("/shuffle");
}

function playToggle() {
    console.log("play");
    fetch("/playtoggle");
}

async function skip() {
    console.log("skip");
    fetch("/skip");
}

function remove(count) {
    fetch("/remove?id="+count);
}

function playnow(count) {
    fetch("/playnow?id="+count);
}

function clearQueue() {
    fetch("/clear");
}

function loopToggle() {
    fetch("/loop");
}

function search(q) {
    fetch("/search?q="+ encodeURIComponent(q));
}

function moveup(q) {
    fetch("/move?from=" + q + "&to=" + (q-1));
}

function movedown(q) {
    fetch("/move?from=" + q + "&to=" + (q+1));
}

function preset(id) {
    fetch("/preset?id="+ id);
}

let statusInterval = setInterval(() => {statusUpdate()}, 500);

async function statusUpdate() {
    let dataReturn = await fetch('/status')
        .then((response) => response.json())
        .then((data) => {
            return data;
        });
        let connectionAlert = document.querySelector(".connection-alert");
        if(dataReturn.lastMessageRecived == true){
            connectionAlert.style = "display: none";
        }else {
            connectionAlert.style = "display: flex";
        }

        let playingDot = document.querySelector(".playing-dot");
        if(dataReturn.playing == true){
            playingDot.style = "background-color: seagreen";
        }else {
            let nowPlaying = document.querySelector(".now-playing");
            nowPlaying.innerHTML = "Nothing";
            playingDot.style = "background-color: #bbb";
        }
        let pausedDot = document.querySelector(".paused-dot");
        if(dataReturn.paused == false){
            pausedDot.style = "background-color: seagreen";
        }else {
            pausedDot.style = "background-color: #bbb";
        }
        let loopDot = document.querySelector(".loop-dot");
        if(dataReturn.loop == true){
            loopDot.style = "background-color: seagreen";
        }else {
            loopDot.style = "background-color: #bbb";
        }
}

async function fetchData() {
    let dataReturn = await fetch('/api')
        .then((response) => response.json())
        .then((data) => {
            return data.queue;
        })
        return dataReturn;
}

function updateTable(arr) {
    let table = document.querySelector("tbody");
    table.innerHTML = "";
    let nowPlaying = document.querySelector(".now-playing");
    let count = 1;
    arr.forEach(element => {
        let row = document.createElement('tr');
        row.onclick = "alert(123)";
        table.appendChild(row);
        row.innerHTML += '<td>' + count++ + '</td>';

        if (typeof element.info !== 'undefined') {
            row.innerHTML += '<td class="song song'+ count +'">' + element.info.song + '</td>';
            row.innerHTML += '<td><span onClick="playnow('+(count-2)+')">▶️</span><span onClick="moveup('+(count-2)+')">🔼</span><br><span onClick="remove('+(count-2)+')">⛔</span><span onClick="movedown('+(count-2)+')">🔽</span></td>';

            // row.innerHTML += '<td>' + element.info.artist + '</td>';
            if (count == 2) {
                nowPlaying.innerHTML = element.info.song;
            }
        }else {
            row.innerHTML += '<td>Loading...</td>';
            // row.innerHTML += '<td>Loading...</td>';
            nowPlaying.innerHTML = "Loading...";
        }
    });
}

let queue = [];

let fetchInterval = setInterval(() => {fetchLoop()}, 1000);

async function fetchLoop(){
    let temp = await fetchData();
    if (!(JSON.stringify(temp) === JSON.stringify(queue))) {
        console.log("update detected");
        console.log(temp);
        updateTable(temp);
        queue = temp;
    }
}

// Warn if overriding existing method
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});

//modal fix
function openModal() {
    document.getElementById("backdrop").style.display = "block";
    document.getElementById("modal").style.display = "block";
    document.getElementById("modal").className += "show";
}
function closeModal() {
    document.getElementById("backdrop").style.display = "none";
    document.getElementById("modal").style.display = "none";
    document.getElementById("modal").className += document.getElementById("modal").className.replace("show", "");
}
// Get the modal
var modal = document.getElementById('modal');