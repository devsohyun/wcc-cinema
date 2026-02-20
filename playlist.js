export const playlist = [
  // { url: '...', title: '...' }
];

export let currentIndex = 0;
export let isPlaying = false; // start as NOT playing
export let startedAt = null;

// Start playback from first video (or current index)
export function startPlayback() {
  if (playlist.length === 0) return;
  currentIndex = 0;
  startedAt = Date.now();
  isPlaying = true;
}

// Move to next video, remove current video from playlist
export function nextVideoIndex() {
  if (playlist.length === 0) return null;

  // Remove the video that just ended
  playlist.shift();

  // Reset currentIndex to 0
  currentIndex = 0;

  if (playlist.length === 0) {
    isPlaying = false;
    startedAt = null;
    return null; // no video left
  }

  // Start next video
  startedAt = Date.now();
  isPlaying = true;

  return playlist[0]; // return next video
}

// Return full video object
export function getCurrentVideo() {
  if (playlist.length === 0) return null;
  return playlist[currentIndex] || null;
}

export function getCurrentTime() {
  if (!startedAt) return 0;
  if (!isPlaying) return pausedAt;
  return (Date.now() - startedAt) / 1000;
}
