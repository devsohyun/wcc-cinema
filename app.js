import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

//// REMOVE IF YOU PUT ON RENDER //////
import open, { openApp, apps } from 'open'; //only needed for a simple development tool remove if hosting online see above
//// REMOVE IF YOU PUT ON RENDER //////

const app = express();
const server = http.createServer(app); //socket.io needs an http server
const io = new Server(server);
const port = process.env.PORT || 3500;

let userId = [];

const totalSeats = 40;
let seats = Array(totalSeats).fill(null);

//Tell our Node.js Server to host our P5.JS sketch from the public folder
app.use(express.static("public"));

// Setup Our Node.js server to listen to connections
server.listen(port, () => {
  console.log("listening on: "+port);
});

//// REMOVE IF YOU PUT ON RENDER //////
//open in browser: dev environment only!
await open(`http://localhost:${port}`);//opens in your default browser
//// REMOVE IF YOU PUT ON RENDER //////

// Callback function for when our P5.JS sketch connects 
io.on("connection", (socket) => {
  console.log('client connected:', socket.id);
  // Add the new user's ID to the userId array
  userId.push(socket.id);

  // find free seats
  const freeSeats = seats
    .map((v, i) => v === null ? i : null)
    .filter(v => v !== null);

  if (freeSeats.length === 0) {
    console.log("cinema full");
    return;
  }

  const seatIndex = freeSeats[Math.floor(Math.random() * freeSeats.length)];
  seats[seatIndex] = socket.id;

  // Send the assigned seat index back to the client
  socket.emit('seat-assignment', seatIndex);

  // Broadcast the updated seats to all clients
  socket.emit('seat-update', seats);

  socket.broadcast.emit('seat-update', seats);

  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id);
    // Remove the disconnected user's ID from the userId array
    userId = userId.filter((id) => id !== socket.id);

    // Find the index of the seat assigned to the disconnected user and set it to null
    const index = seats.indexOf(socket.id);
    if (index !== -1) seats[index] = null;

    io.emit('seatUpdate', seats);
  });
});
