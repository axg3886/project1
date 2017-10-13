/* global myKeys, io, Constants */

let socket;

let canvas;
let ctx;

let canvas2;
let background;
let redrawBackground;

const scale = 10;
const fov = 100;

const map = {};
let mapSize = 32;

let entityList = {};
let user;

// Thanks Cody-sempai!
const lerp = (v0, v1, alpha) => (1 - alpha) * v0 + alpha * v1;

const readMap = (data) => {
  map.bounds = data.bounds;
  map.name = data.name;

  map.arr = data.arr;
  map.get = (x, y) => map.arr[(x * map.bounds) + y];
  map.set = (x, y, v) => { map.arr[(x * map.bounds) + y] = v; };
};

const getColor = (x, y) => {
  const v = map.get(x, y);
  if (v === Constants.TYPES.dirt) {
    return 'black';
  }
  if (v === Constants.TYPES.air) {
    return 'white';
  }
  if (v === Constants.TYPES.wall) {
    return 'red';
  }
  if (v === Constants.TYPES.stairs) {
    return 'green';
  }
  return 'blue';
};

const redraw = () => {
  // Draw background tiles if needed
  // Generally only once per level.
  if (redrawBackground) {
    background.fillStyle = 'black';
    background.clearRect(0, 0, canvas2.width, canvas2.height);

    for (let i = 0; i < mapSize; i++) {
      for (let j = 0; j < mapSize; j++) {
        background.fillStyle = getColor(i, j);
        background.fillRect(i * scale, j * scale, scale, scale);
      }
    }
    redrawBackground = false;
  }

  // Fill overlaying canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clear up FOV
  ctx.clearRect(user.x * scale - fov, user.y * scale - fov, fov * 2, fov * 2);

  // Draw world name
  ctx.fillStyle = 'white';
  ctx.fillText(map.name, (mapSize - 7) * scale, (mapSize - 1) * scale);

  // Quasi-debug "destination" square
  ctx.fillStyle = 'yellow';
  ctx.fillRect(user.destX * scale, user.destY * scale, scale, scale);

  const keys = Object.keys(entityList);
  for (let i = 0; i < keys.length; i++) {
    const entity = entityList[keys[i]];

    // Update alpha
    if (entity.alpha < 1) {
      entity.alpha += 0.05;
    }

    // Lerp position
    entity.x = lerp(entity.prevX, entity.destX, entity.alpha);
    entity.y = lerp(entity.prevY, entity.destY, entity.alpha);

    if (!Constants.canWalk(map, entity.x, entity.y)) {
      entity.x = entity.prevX;
      entity.y = entity.prevY;
    }

    // If self, blue, otherwise gray
    ctx.fillStyle = (entity.id === user.id) ? 'blue' : '#aaa';
    // Draw box
    ctx.fillRect(entity.x * scale, entity.y * scale, scale, scale);
    ctx.fillStyle = 'gray';
    ctx.fillText(entity.name, entity.x * scale, (entity.y * scale) - 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(entity.x * scale, (entity.y * scale) - 7, entity.hp * 3, 5);
  }
};

const tick = () => {
  user.prevX = user.x;
  user.prevY = user.y;

  const prevDestX = user.destX;
  const prevDestY = user.destY;

  // Key input
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_LEFT]) {
    user.destX = Math.max(0, user.destX - 0.1);
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_UP]) {
    user.destY = Math.max(0, user.destY - 0.1);
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_RIGHT]) {
    user.destX = Math.min(mapSize, user.destX + 0.1);
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN]) {
    user.destY = Math.min(mapSize, user.destY + 0.1);
  }

  if (!Constants.canWalk(map, user.destX, user.destY)) {
    user.destX = prevDestX;
    user.destY = prevDestY;
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
    // Map update
    // Set entity data
    entityList = data.entities;
    user = entityList[data.id];

    // Set map data
    readMap(data.map);
    mapSize = map.bounds;
    canvas.width = mapSize * scale;
    canvas.height = mapSize * scale;
    canvas2.width = canvas.width;
    canvas2.height = canvas.height;
    redrawBackground = true;

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
  if (entity.lastUpdate >= data.lastUpdate) {
    return;
  }
  entity.lastUpdate = data.lastUpdate;
  entity.x = data.x;
  entity.y = data.y;
  entity.prevX = data.prevX;
  entity.prevY = data.prevY;
  entity.destX = data.destX;
  entity.destY = data.destY;
  entity.hp = data.hp;
  entity.alpha = 0;
};

const init = () => {
  canvas = document.querySelector('#entity');
  ctx = canvas.getContext('2d');
  canvas2 = document.querySelector('#background');
  background = canvas2.getContext('2d');

  socket = io.connect();

  socket.on('connect', () => {
    socket.emit('join', { name: `Player${Math.floor(Math.random() * 100)}` });
  });

  socket.on('update', onUpdate);

  socket.on('kill', (data) => {
    if (entityList[data.id]) {
      delete entityList[data.id];
    }
  });
};

window.onload = init;
