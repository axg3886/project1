/* global myKeys, io */

let socket;

let canvas;
let ctx;

let map = [];
let mapSize = 32;

let entityList = {};
let user;

// Thanks Cody-sempai!
const lerp = (v0, v1, alpha) => (1 - alpha) * v0 + alpha * v1;

const redraw = () => {
  ctx.clearRect(0, 0, mapSize * 10, mapSize * 10);

  for (let i = 0; i < mapSize; i++) {
    for (let j = 0; j < mapSize; j++) {
      if (map[i * mapSize + j] !== 0) {
        ctx.fillStyle = '#fff'; // TODO Tiles
        ctx.fillRect(i * 10, j * 10, 10, 10);
      }
    }
  }

  const keys = Object.keys(entityList);
  for (let i = 0; i < keys.length; i++) {
    const entity = entityList[keys[i]];

    // Update alpha
    if (entity.alpha < 1) { entity.alpha += 0.05; }

    // Lerp position
    entity.x = lerp(entity.prevX, entity.destX, entity.alpha);
    entity.y = lerp(entity.prevY, entity.destY, entity.alpha);
    // If self, red, otherwise black
    ctx.fillStyle = (entity.id === user.id) ? 'red' : '#aaa';
    // Draw box
    ctx.fillRect(entity.x, entity.y, 30, 30);
    ctx.fillStyle = 'black';
    ctx.fillText(entity.name, entity.x, entity.y - 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(entity.x, entity.y - 7, entity.hp * 3, 5);
  }
};

const tick = () => {
  user.prevX = user.x;
  user.prevY = user.y;


  // Key input
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_LEFT]) {
    user.destX = Math.max(0, user.destX - 2);
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_UP]) {
    user.destY = Math.max(0, user.destY - 2);
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_RIGHT]) {
    user.destX = Math.min(mapSize * 9, user.destX + 2);
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN]) {
    user.destY = Math.min(mapSize * 9, user.destY + 2);
  }

  // Reset alpha
  user.alpha = 0;

  // Emit update
  socket.emit('movement', user);

  // Redraw
  redraw();

  // Tick at 60 fps
  requestAnimationFrame(tick);
};

const onUpdate = (data) => {
  if (data.entities) {
    // Initial update only
    // Set entity data
    entityList = data.entities;
    user = entityList[data.id];

    // Set map data
    map = data.map;
    mapSize = data.bounds;
    canvas.width = mapSize * 10;
    canvas.height = mapSize * 10;

    // Start updates
    requestAnimationFrame(tick);
    return;
  }

  const entity = entityList[data.id];
  if (!entity) {
    entityList[data.id] = data;
    requestAnimationFrame(tick);
    return;
  }
  if (entity.lastUpdate >= data.lastUpdate) { return; }
  entity.lastUpdate = data.lastUpdate;
  entity.x = data.x;
  entity.y = data.y;
  entity.prevX = data.destX;
  entity.prevY = data.destY;
  entity.destX = data.destX;
  entity.destY = data.destY;
  entity.hp = data.hp;
  entity.alpha = 0;
};

const init = () => {
  canvas = document.querySelector('canvas');
  ctx = canvas.getContext('2d');

  socket = io.connect();

  socket.on('connect', () => {
    socket.emit('join', { name: `Player${Math.floor(Math.random() * 100)}` });
  });

  socket.on('update', onUpdate);

  socket.on('kill', (data) => {
    if (entityList[data.id]) { delete entityList[data.id]; }
  });
};

window.onload = init;
