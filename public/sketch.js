// Create connection to Node.JS Server
const socket = io();
// Youtube video settings
let ytDiv;
// Seat settings
const seatSize = 100;
const rows = 3;
const cols = 10;

let seats = [];
let seatMap = [];
let mySeat = null;
let username = '';

// Youtube
let player;
let playerReady = false; // YouTube ready
let serverState = null; // last player-state from server
let audioUnlocked = false;

let playlist = [];
let currentIndex = 0;
let currentVideoUrl = null;

let userReady = false;

// Grab DOM elements
const popupContainer = document.querySelector('.popup-container');
const popupInput = document.querySelector('.popup input');
const popupButton = document.querySelector('.popup button');

popupButton.addEventListener('click', () => {
  const value = popupInput.value.trim();
  if (!value) return;

  username = value;
  popupContainer.style.display = 'none';
  userReady = true;

  socket.emit('register-user', { name: username });

  socket.emit('request-playlist');

  // DIRECTLY load and play video as part of this user gesture
  if (playerReady && !audioUnlocked) {
    const { videoUrl, isPlaying, time } = serverState || {};
    const videoId = getYouTubeID(videoUrl || '9kK86zmhpWc'); // fallback

    if (videoId) {
      // load video and unmute in same user gesture
      player.loadVideoById(videoId, time || 0);
      player.unMute();
      player.setVolume(50);
      audioUnlocked = true;
    }
  }
});

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
    videoId: '9kK86zmhpWc', // temporary id. Otherwise it breaks.

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
}

function onPlayerReady() {
  console.log('Player ready');
  playerReady = true;

  if (userReady) {
    trySyncPlayer();
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  setSeats();
}

function draw() {
  
  if (!userReady) return;
  
  console.log(serverState.time);
  background(20);

  // Draw screen frame
  // fill(30) didn't work, so I had to use the drawingContext to set the fill color
  drawingContext.fillStyle = 'rgb(48, 48, 48)';
  rect(width / 2 - 340, 35, 680, 440, 20);

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
    const seatUser = seatMap[i];

    if (seatUser) {
      textAlign(CENTER);
      textSize(15);

      if (seatUser.id === socket.id) {
        fill(0, 200, 255); // me
        arc(x + seatSize / 2 - 3, y + seatSize / 2 - 50, 50, 50, PI, TWO_PI);
        text(seatUser.name, x + seatSize / 2 - 6, y - seatSize / 2 + 2);
      } else {
        fill(200); // others
        arc(x + seatSize / 2 - 3, y + seatSize / 2 - 50, 50, 50, PI, TWO_PI);
        text(seatUser.name, x + seatSize / 2 - 6, y - seatSize / 2 + 2);
      }
    }
    pop();
  }
}

function setSeats() {
  const startX = width / 2 - (cols * seatSize) / 2;
  const startY = height - rows * seatSize;

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
  // only sync if player ready AND user ready
  if (playerReady && userReady) {
    trySyncPlayer();
  }
});

// Sync the YouTube player based on the latest server state
function trySyncPlayer() {
  if (!playerReady || !serverState || !userReady) return;

  const { videoUrl, isPlaying, time } = serverState;
  const videoId = getYouTubeID(videoUrl);

  if (!videoId) return;

  const current = player.getVideoData()?.video_id;

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
