// ----- SOCKET CONNECTION ----- //
const socket = io();

// ----- GLOBAL STATE ----- //
// Youtube
let player;
let playerReady = false;
let serverState = {
  video: null,
  isPlaying: false,
  time: 0,
};
let audioUnlocked = false;

// Playlist
let playlist = [];
let currentIndex = 0;
let currentVideoUrl = null;

// User
let username = '';
let userReady = false;

// Seats
const seatSize = 100;
const rows = 3;
const cols = 10;

let seats = [];
let seatMap = [];
let mySeat = null;

// ----- GRAB DOM ELEMENTS ----- //
const popupContainer = document.querySelector('.popup-container');
const popupUsernameInput = document.querySelector('.popup .username');
const popupUrlInput = document.querySelector('.popup .url');
const popupButton = document.querySelector('.popup button');

/// ----- EVENT LISTENERS ----- //
// popup click handler
popupButton.addEventListener('click', () => {
  const usernameValue = popupUsernameInput.value.trim();
  const urlValue = popupUrlInput.value.trim();
  const isYtUrl = urlValue.startsWith('https://www.youtube.com');

  if (!usernameValue || !urlValue || !isYtUrl) return;

  username = usernameValue;
  userReady = true;

  popupContainer.style.display = 'none';

  // Register user to server
  socket.emit('register-user', {
    name: username,
    url: urlValue,
  });

  // Unlock audio (required by browser)
  if (playerReady && !audioUnlocked) {
    player.unMute();
    player.setVolume(50);
    audioUnlocked = true;
  }
});

// ----- SOCKETS ----- //
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('seat-update', (serverSeats) => {
  seatMap = serverSeats;
});

// Set server state
socket.on('player-state', (state) => {
  console.log('player-state received', state);
  // SETTING SERVER STATE
  serverState = state;
  // only sync if player ready AND user ready
  if (playerReady && userReady) {
    trySyncPlayer();
  }
});

socket.on('playlist-update', (data) => {
  currentIndex = data.currentIndex;
  playlist = data.playlist;

  updateScheduleUI();
});

// ----- YOUTUBE API ----- //
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

  player.addEventListener('playing', () => {
    console.log('playing');
  });

  player.addEventListener('pause', () => {
    console.log('paused');
  });

  player.addEventListener('ended', () => {
    console.log('video ended');
  });
}

function onPlayerReady() {
  console.log('Player ready');
  playerReady = true;

  if (userReady) {
    trySyncPlayer();
  }
}

// ----- P5 STANDARD FUNCTIONS ----- //
function setup() {
  createCanvas(windowWidth, windowHeight);
  setSeats();
}

function draw() {
  if (!userReady) return;

  background(20);

  // Draw schedule board
  // drawScheduleBoard(playlist[0], playlist);

  // Draw seats
  for (let i = 0; i < seats.length; i++) {
    let x = seats[i].x;
    let y = seats[i].y;

    if (i >= 10 && i < 20) y -= 20;
    if (i >= 20 && i < 30) y -= 40;

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

// ----- UI ----- //
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

function updateScheduleUI() {
  const currentVideo = document.getElementById('current-video');
  const nextVideoList = document.getElementById('next-list');

  if (!playlist || playlist.length === 0) {
    currentVideo.textContent = 'None';
    nextVideoList.innerHTML = '';
    return;
  }

  // Current
  currentVideo.textContent = playlist[currentIndex]?.title || 'None';

  // Next queue
  nextVideoList.innerHTML = '';

  for (let i = currentIndex + 1; i < playlist.length; i++) {
    const li = document.createElement('li');
    li.textContent = playlist[i].title;
    nextVideoList.appendChild(li);
  }
}

function drawScheduleBoard(currentVideo, playlist) {
  const margin = 20;
  const boardSize = 260;
  const x = width - boardSize - margin;
  const y = margin;

  // Remove current video from queue if it exists there
  let queue = playlist.filter((video) => video !== currentVideo);

  push();

  // Board
  fill(20, 20, 20, 220);
  stroke(255);
  strokeWeight(1);
  rect(x, y, boardSize, boardSize, 12);

  // Text style
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);

  let lineHeight = 22;
  let padding = 15;
  let textY = y + padding;

  // Title
  textStyle(BOLD);
  text('SCREENING SCHEDULE', x + padding, textY);
  textStyle(NORMAL);

  textY += lineHeight * 1.5;

  // Current
  text('Current:', x + padding, textY);
  text(currentVideo || 'None', x + padding + 70, textY);
  textY += lineHeight * 1.5;

  // Only show Next section if queue has videos
  if (queue.length > 0) {
    text('Next:', x + padding, textY);
    textY += lineHeight;

    for (let i = 0; i < min(4, queue.length); i++) {
      text(i + 1 + '. ' + queue[i], x + padding + 10, textY);
      textY += lineHeight;
    }
  }

  pop();
}

// ***** IMPORTANT *****
// ----- PLAYER SYNC LOGIC ----- //
function trySyncPlayer() {
  if (!playerReady || !serverState || !userReady) return;

  const { video, isPlaying, time } = serverState;

  if (!video || !video.url) return;

  const videoId = getYouTubeID(video.url);

  if (!videoId) return;

  const current = player.getVideoData()?.video_id;

  if (current !== videoId) {
    player.loadVideoById(videoId, time);
  } else {
    player.seekTo(time, true);
    if (isPlaying) player.playVideo();
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
