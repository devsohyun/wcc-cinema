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

function setup() {
  createCanvas(windowWidth, windowHeight);

  ytDiv = createDiv(`<iframe width="560" height="315" src="https://www.youtube.com/embed/JRnDYB28bL8?si=eKzIVotZNsroEMnv" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`);
  ytDiv.position(width /2 - 280, 40);
  ytDiv.style('position', 'absolute');
  ytDiv.style('z-index', '1');

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
      } else {
        fill(200); // others
      }

      circle(x + seatSize / 2 - 3, y + seatSize / 2 - 3, 18);
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

// ----- UTILITY FUNCTIONS ----- //
function getYouTubeID(url) {
  try {
    const parsed = new URL(url);

    // youtu.be/<id>
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1);
    }

    // youtube.com/watch?v=<id>
    if (parsed.searchParams.has('v')) {
      return parsed.searchParams.get('v');
    }

    // youtube.com/embed/<id>
    if (parsed.pathname.includes('/embed/')) {
      return parsed.pathname.split('/embed/')[1];
    }
  } catch (e) {
    console.warn('Invalid URL');
  }

  return null;
}

function buildEmbedURL(videoId) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
}

// Tutorial: https://youtu.be/-MUOweQ6wac?si=OMJoxkXFqYlMGpmw
function linearGradient(sX, sY, eX, eY, colorS, colorE) {
  let gradient = drawingContext.createLinearGradient(sX, sY, eX, eY);
  gradient.addColorStop(0, colorS);
  gradient.addColorStop(1, colorE);

  // need to use push and pop to prvent state leakage for multiple clients' draw order
  push();
  drawingContext.fillStyle = gradient;
  pop();
}

// Connect to Node.JS Server
socket.on('connect', () => {
  console.log(socket.id);
});

socket.on('assignment', (seatIndex) => {
  mySeat = seatIndex;
  console.log('Assigned seat:', seatIndex);
});

socket.on('seat-update', (serverSeats) => {
  seatMap = serverSeats;
  
});

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
