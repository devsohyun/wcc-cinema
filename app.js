import express from 'express';
import http, { get } from 'http';
import { Server } from 'socket.io';
import {
  playlist,
  currentIndex,
  isPlaying,
  startedAt,
  pausedAt,
  getCurrentVideo,
  getCurrentTime,
} from './playlist.js';

//// REMOVE IF YOU PUT ON RENDER //////
import open, { openApp, apps } from 'open'; //only needed for a simple development tool remove if hosting online see above
//// REMOVE IF YOU PUT ON RENDER //////

const app = express();
const server = http.createServer(app); //socket.io needs an http server
const io = new Server(server);
const port = process.env.PORT || 3500;

let gameState = 'waiting'; // 'waiting', 'playing', 'ended'
let users = {};

const totalSeats = 40;
let seats = Array(totalSeats).fill(null);

//Tell our Node.js Server to host our P5.JS sketch from the public folder
app.use(express.static('public'));

// Setup Our Node.js server to listen to connections
server.listen(port, () => {
  console.log('listening on: ' + port);
});

//// REMOVE IF YOU PUT ON RENDER //////
//open in browser: dev environment only!
await open(`http://localhost:${port}`); //opens in your default browser
//// REMOVE IF YOU PUT ON RENDER //////

// Callback function for when our P5.JS sketch connects
io.on('connection', (socket) => {
  socket.on('register-user', ({ name }) => {
    users[socket.id] = { name };
    console.log('User registered:', name);

    // ---- SEAT ASSIGNMENT ----
    const freeSeats = seats
      .map((v, i) => (v === null ? i : null))
      .filter((v) => v !== null);

    if (freeSeats.length === 0) {
      console.log('cinema full');
      return;
    }

    const seatIndex = freeSeats[Math.floor(Math.random() * freeSeats.length)];
    seats[seatIndex] = {
      id: socket.id,
      name,
    };

    socket.emit('seat-assignment', seatIndex);
    io.emit('seat-update', seats);
  });

  // Send playback state (this is fine on connect)
  socket.emit('player-state', {
    videoUrl: getCurrentVideo(),
    isPlaying,
    time: getCurrentTime(),
  });

  socket.emit('playlist-update', {
    currentIndex,
    playlist,
  });

  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id);
    delete users[socket.id];

    const index = seats.findIndex((seat) => seat?.id === socket.id);
    if (index !== -1) seats[index] = null;

    io.emit('seat-update', seats);
  });
});

// ----- VIDEO PLAYBACK CONTROL FROM SERVER ----- //
function playVideo() {
  startedAt = Date.now() - pausedAt * 1000;
  isPlaying = true;

  io.emit('player-state', {
    videoUrl: getCurrentVideo(),
    isPlaying: true,
    time: getCurrentTime(),
  });
}

function pauseVideo() {
  pausedAt = getCurrentTime();
  isPlaying = false;

  io.emit('player-state', {
    videoUrl: getCurrentVideo(),
    isPlaying: false,
    time: pausedAt,
  });
}
