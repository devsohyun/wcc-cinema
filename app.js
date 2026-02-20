import express from 'express';
import http, { get } from 'http';
import { Server } from 'socket.io';
import {
  playlist,
  currentIndex,
  isPlaying,
  getCurrentVideo,
  getCurrentTime,
  startPlayback,
  nextVideoIndex,
} from './playlist.js';

//// REMOVE IF YOU PUT ON RENDER //////
import open, { openApp, apps } from 'open'; //only needed for a simple development tool remove if hosting online see above
import { start } from 'repl';
//// REMOVE IF YOU PUT ON RENDER //////

const app = express();
const server = http.createServer(app); //socket.io needs an http server
const io = new Server(server);
const port = process.env.PORT || 3500;

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

// Seat configuration
const seatRows = 3;
const seatCols = 10;
const totalSeats = seatRows * seatCols;

let seats = Array(totalSeats).fill(null);
let users = {};
let advancingVideo = false;

// Socket connections
io.on('connection', (socket) => {
  // immediately send current state on connection
  console.log('New connection:', socket.id);

  // Send current state immediately
  socket.emit('player-state', {
    video: getCurrentVideo(),
    isPlaying,
    time: getCurrentTime(),
  });

  // Register user
  socket.on('register-user', ({ name, url, title }) => {
    // Check seat availability FIRST
    const freeSeats = seats
      .map((v, i) => (v === null ? i : null))
      .filter((v) => v !== null);

    if (freeSeats.length === 0) {
      socket.emit('room-full');
      return;
    }

    // Register user
    users[socket.id] = { name };

    // Add video to playlist
    playlist.push({ url, title });

    if (playlist.length === 1) {
      startPlayback();
    }

    // Assign random seat
    const seatIndex = freeSeats[Math.floor(Math.random() * freeSeats.length)];

    seats[seatIndex] = {
      id: socket.id,
      name,
    };

    socket.emit('seat-assignment', seatIndex);
    io.emit('seat-update', seats);

    io.emit('playlist-update', {
      currentIndex,
      playlist,
    });

    io.emit('player-state', {
      video: getCurrentVideo(),
      isPlaying,
      time: getCurrentTime(),
    });
  });

  // Handle video end
  socket.on('video-ended', () => {
    if (advancingVideo) return;
    advancingVideo = true;

    const nextVideo = nextVideoIndex(); // remove current, advance

    // Broadcast updated playlist
    io.emit('playlist-update', {
      currentIndex,
      playlist,
    });

    // Broadcast new player state
    io.emit('player-state', {
      video: nextVideo,
      isPlaying,
      time: getCurrentTime(),
    });

    // release lock shortly after to allow next video to advance when it ends
    setTimeout(() => {
      advancingVideo = false;
    }, 500);
  });

  socket.on('disconnect', () => {
    delete users[socket.id];

    const index = seats.findIndex((seat) => seat?.id === socket.id);

    if (index !== -1) seats[index] = null;

    io.emit('seat-update', seats);
  });
});
