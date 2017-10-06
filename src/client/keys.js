const myKeys = {};

myKeys.KEYBOARD = Object.freeze({
  KEY_LEFT: 37,
  KEY_UP: 38,
  KEY_RIGHT: 39,
  KEY_DOWN: 40,
  KEY_SPACE: 32,
  KEY_SHIFT: 16,
});
myKeys.keydown = [];

// event listeners
window.addEventListener('keydown', (e) => {
  myKeys.keydown[e.keyCode] = true;
});
window.addEventListener('keyup', (e) => {
  myKeys.keydown[e.keyCode] = false;
});
