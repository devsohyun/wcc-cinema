// Create connection to Node.JS Server
const socket = io();
// Youtube video settings
let ytDiv;
// Seat settings
const seatSize = 100;
const seatRadius = 8;
const rows = 4;
const cols = 10;

let seats = [];
let seatMap = [];
let mySeat = null;
let username = '';
let isDebugging = true;

// Youtube
let player;
let playerReady = false; // YouTube ready
let serverState = null; // last player-state from server
let audioUnlocked = false;

let playlist = [];
let currentIndex = 0;
let currentVideoUrl = null;

var done = false;
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING && !done) {
    setTimeout(stopVideo, 6000);
    done = true;
  }
}

function onYouTubeIframeAPIReady() {
  console.log('YouTube API ready');

  // Documentation: https://developers.google.com/youtube/iframe_api_reference
  player = new YT.Player('player', {
    width: '640',
    height: '390',
    videoId: 'JRnDYB28bL8', // TEMPORARY bootstrap video (never relied on)

    playerVars: {
      playsinline: 1,
      autoplay: 0,
      mute: 1, // necessary for autoplay
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: onPlayerReady,
    },
  });

  console.log(player);
}

function onPlayerReady() {
  console.log('Player ready');
  playerReady = true; 
  trySyncPlayer(); 
}

function setup() {
  if (!isDebugging) {
    username = prompt("What's your username?");
    alert('Welcome to the cinema, ' + username + '!');
  } else {
    username = 'Guest';
  }

  createCanvas(windowWidth, windowHeight);
  setSeats();

  
}

function draw() {
  background(20);

  // Draw screen frame
  // fill(30) didn't work, so I had to use the drawingContext to set the fill color
  drawingContext.fillStyle = 'rgb(48, 48, 48)';
  rect(width / 2 - 320, 20, 640, 360, 20, 20, 0, 0);

  // Draw seats
  for (let i = 0; i < seats.length; i++) {
    let x = seats[i].x;
    let y = seats[i].y;

    if (i >= 10 && i < 20) y -= 20;
    if (i >= 20 && i < 30) y -= 40;
    if (i >= 30 && i < 40) y -= 60;

    // draw seat
    // Tutorial: https://youtu.be/-MUOweQ6wac?si=OMJoxkXFqYlMGpmw
    let g = drawingContext.createLinearGradient(x, y, x, y + seatSize);
    g.addColorStop(0, 'rgb(204,36,36)');
    g.addColorStop(1, 'rgb(109,6,6)');

    // need to use push and pop to prvent state leakage for multiple clients' draw order
    push();
    drawingContext.fillStyle = g;

    rect(x, y, seatSize - 6, seatSize - 6, 20, 20, 5, 5);

    // draw user if occupied
    if (seatMap[i]) {
      if (seatMap[i] === socket.id) {
        fill(0, 200, 255); // me
        circle(x + seatSize / 2 - 3, y + seatSize / 2 - 3, 18);
        text(username, x + 10, y + seatSize / 2 + 5);
      } else {
        fill(200); // others
        circle(x + seatSize / 2 - 3, y + seatSize / 2 - 3, 18);
      }
    }
    pop();
  }
}

function setSeats() {
  const startX = width / 2 - (cols * seatSize) / 2;
  const startY = height / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({
        x: startX + c * seatSize,
        y: startY + r * seatSize,
        userId: null,
      });
    }
  }
}

// Connect to Node.JS Server
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('assignment', (seatIndex) => {
  mySeat = seatIndex;
  console.log('Assigned seat:', seatIndex);
});

socket.on('seat-update', (serverSeats) => {
  seatMap = serverSeats;
});

socket.on('playlist-update', (data) => {
  playlist = data.playlist;
  currentIndex = data.currentIndex;
});

socket.on('player-state', (state) => {
  console.log('player-state received', state);
  serverState = state;            
  trySyncPlayer();                
});

// Sync the YouTube player based on the latest server state
function trySyncPlayer() {
  if (!playerReady || !serverState) return;

  const { videoUrl, isPlaying, time } = serverState;
  const videoId = getYouTubeID(videoUrl);

  if (!videoId) return;

  const current = player.getVideoData()?.video_id;
  console.log(current);
  console.log(videoId);
  
  if (current !== videoId) {
    player.loadVideoById(videoId, time);
  } else {
    player.seekTo(time, true);
    isPlaying ? player.playVideo() : player.pauseVideo();
  }
}

// ----- UTILITY FUNCTIONS ----- //
function getYouTubeID(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1);
    if (parsed.searchParams.has('v')) return parsed.searchParams.get('v');
    if (parsed.pathname.includes('/embed/'))
      return parsed.pathname.split('/embed/')[1];
  } catch {}
  return null;
}

// ----- KEYBOARD INTERACTIONS ----- //
function keyPressed() {
  //toggle fullscreen on or off
  if (key == 'f' || key == 'F') {
    //get current full screen state https://p5js.org/reference/#/p5/fullscreen
    let fs = fullscreen(); //true or false

    //switch it to the opposite of current value
    console.log('Full screen getting set to: ' + !fs);
    fullscreen(!fs);
  }
}

function mousePressed() {
  if (!audioUnlocked && playerReady) {
    player.unMute();
    player.setVolume(20);
    player.playVideo();
    audioUnlocked = true;
  }
}
