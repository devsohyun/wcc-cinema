# Cinema
Cinema for everyone!

Link to Git [repository](https://github.com/devsohyun/wcc-cinema)

You can try it [here](https://wcc-cinema.onrender.com/).

## Description
This project was created as a term-time project for the Workshop for Creative Coding at Goldsmiths, University of London.

Upon entering the cinema, you are prompted to enter a username and a YouTube video link. The video will be added to a shared playlist and played in order. Everyone in the cinema watches the same video at the same timestamp, making it a truly shared viewing experience.

## Getting Started

### Dependencies
- `express`
- `http`

### Installing
Install dependencies by running:
```bash
npm install
```

### Running the Program
```bash
node app.js
```

## Help

### Cinema Rules and Limitations
1. A username and a YouTube video link are required to enter the cinema.
2. You can pause and play the video using the on-screen controls. To re-sync with other viewers, refresh the page and re-enter the cinema.
3. There is no system to clear previously added videos from the playlist.
4. If someone adds very long videos or repeatedly adds the same video, the only way to reset the playlist is to restart the server.
5. Seat display may occasionally show incorrect user information — the cause is currently unknown.
