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

// User
let username = '';
let userReady = false;

// Seats
const seatSize = 100;
const seatRows = 3;
const seatCols = 10;
const totalSeats = seatRows * seatCols;

let seats = [];
let seatMap = [];
let mySeat = null;

// ----- GRAB DOM ELEMENTS ----- //
const popupContainer = document.querySelector('.popup-container');
const popupUsernameInput = document.querySelector('.popup .username');
const popupUrlInput = document.querySelector('.popup .url');
const popupButton = document.querySelector('.popup button');

// ----- FETCH YOUTUBE TITLE BEFORE SENDING TO SERVER ----- //
async function fetchYouTubeTitle(url) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${url}&format=json`,
    );
    const data = await res.json();
    return data.title;
  } catch (err) {
    console.error('Failed to fetch title', err);
    return url; // fallback
  }
}

/// ----- EVENT LISTENERS ----- //
// popup click handler
popupButton.addEventListener('click', async() => {
  const usernameValue = popupUsernameInput.value.trim();
  const urlValue = popupUrlInput.value.trim();
  const isYtUrl = urlValue.startsWith('https://www.youtube.com');
  
  if (!usernameValue || !urlValue || !isYtUrl) return;

  username = usernameValue;
  userReady = true;
  
  popupContainer.style.display = 'none';

  // Fetch YouTube title before sending to server
  const ytTitle = await fetchYouTubeTitle(urlValue);

  // Register user to server
  socket.emit('register-user', {
    name: username,
    url: urlValue,
    title: ytTitle,
  });

  // Unlock audio (required by browser)
  if (playerReady && !audioUnlocked) {
    player.unMute();
    player.setVolume(50);
    audioUnlocked = true;
  }
});

// ----- SOCKETS ----- //
socket.on('seat-assignment', (seatIndex) => {
  mySeat = seatIndex;
  userReady = true;
  popupContainer.style.display = 'none';

  if (playerReady && !audioUnlocked) {
    player.unMute();
    player.setVolume(50);
    audioUnlocked = true;
  }
});

socket.on('room-full', () => {
  alert('Cinema is full.');
  location.reload();
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
      onStateChange: onPlayerStateChange,
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

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    socket.emit('video-ended');
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

  // Draw seats
  for (let i = 0; i < seats.length; i++) {
    let x = seats[i].x;
    let y = seats[i].y;

    const rowIndex = Math.floor(i / seatCols);
    y -= rowIndex * 20;

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
  const startX = width / 2 - (seatCols * seatSize) / 2;
  const startY = height - seatRows * seatSize;

  for (let r = 0; r < seatRows; r++) {
    for (let c = 0; c < seatCols; c++) {
      seats.push({
        x: startX + c * seatSize,
        y: startY + r * seatSize,
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

  // current
  currentVideo.textContent = playlist[currentIndex]?.title || 'None';

  // next queue
  nextVideoList.innerHTML = '';

  for (let i = currentIndex + 1; i < playlist.length; i++) {
    const li = document.createElement('li');
    li.textContent = playlist[i].title;
    nextVideoList.appendChild(li);
  }
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
