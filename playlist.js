export const playlist = [
  'https://www.youtube.com/watch?v=9kK86zmhpWc',
  'https://www.youtube.com/watch?v=3i8bfYdAMjg',
  'https://www.youtube.com/watch?v=M32egVO2bok',
  'https://www.youtube.com/watch?v=JRnDYB28bL8&list=RDJRnDYB28bL8&start_radio=1&t=3290s',
];

export let currentIndex = 0;
export let isPlaying = true;
export let startedAt = null; // Date.now()
export let pausedAt = 0;

export function getCurrentVideo() {
  return playlist[currentIndex];
}

export function getCurrentTime() {
  if (!isPlaying) return pausedAt;
  return (Date.now() - startedAt) / 1000;
}
