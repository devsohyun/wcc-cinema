export const playlist = [
  // { url: '...', title: '...' }
];

export let currentIndex = 0;
export let isPlaying = false; // start as NOT playing
export let startedAt = null;
export let pausedAt = 0;

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

// ---- CONTROL FUNCTIONS (IMPORTANT) ---- //

export function startPlayback() {
  startedAt = Date.now();
  pausedAt = 0;
  isPlaying = true;
}

export function nextVideoIndex() {
  if (playlist.length === 0) return;

  currentIndex = (currentIndex + 1) % playlist.length;
  startedAt = Date.now();
  pausedAt = 0;
  isPlaying = true;
}
