/* global myKeys, io, Constants */

let socket;

let canvas;
let ctx;

let canvas2;
let background;
let redrawBackground;

let messageBox;

const scale = 12;
const radius = 10;

const map = {};

let entityList = {};
let user;

const messageList = [];

// Thanks Cody-sempai!
const lerp = (v0, v1, alpha) => (1 - alpha) * v0 + alpha * v1;

const readMap = (data) => {
  map.bounds = data.bounds;
  map.name = data.name;

  map.arr = data.arr;
  map.get = (x, y) => map.arr[(x * map.bounds) + y];
  map.set = (x, y, v) => { map.arr[(x * map.bounds) + y] = v; };

  map.lit = [];
  map.getLit = (x, y) => map.lit[(x * map.bounds) + y];
  map.setLit = (x, y, v) => { map.lit[(x * map.bounds) + y] = v; };

  map.resetLit = () => {
    for (let x = 0; x < map.bounds; x++) {
      for (let y = 0; y < map.bounds; y++) {
        if (map.getLit(x, y) >= 0) {
          map.setLit(x, y, radius - 1);
        }
      }
    }
  };
  for (let x = 0; x < map.bounds; x++) {
    for (let y = 0; y < map.bounds; y++) {
      map.setLit(x, y, -1);
    }
  }
};

/* Obtained from: http://www.roguebasin.com/index.php?title=LOS_using_strict_definition */
const los = (x0, y0, x1, y1) => {
  const dx = x1 - x0;
  const dy = y1 - y0;

  // determine which quadrant to we're calculating: we climb in these two directions
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;

  let xnext = x0;
  let ynext = y0;

  // calculate length of line to cast (distance from start to final tile)
  const dist = Math.sqrt(dx * dx + dy * dy);

  // essentially casting a ray of length radius: (radius^3)
  while (xnext !== x1 || ynext !== y1) {
    if (map.get(xnext, ynext) !== Constants.TYPES.air) {
      return;
    }
    // Line-to-point distance formula < 0.5
    if (Math.abs(dy * (xnext - x0 + sx) - dx * (ynext - y0)) / dist < 0.5) {
      xnext += sx;
    } else if (Math.abs(dy * (xnext - x0) - dx * (ynext - y0 + sy)) / dist < 0.5) {
      ynext += sy;
    } else {
      xnext += sx;
      ynext += sy;
    }
  }
  map.setLit(x1, y1, Math.floor(dist));
};

/* Obtained from: http://www.roguebasin.com/index.php?title=LOS_using_strict_definition */
const fov = () => {
  map.resetLit();

  const x = Constants.floorLoc(user.x);
  const y = Constants.floorLoc(user.y);

  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      if (i * i + j * j < radius * radius) {
        los(x, y, x + i, y + j);
      }
    }
  }
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

    for (let i = 0; i < map.bounds; i++) {
      for (let j = 0; j < map.bounds; j++) {
        background.fillStyle = getColor(i, j);
        background.fillRect(i * scale, j * scale, scale, scale);
      }
    }
    redrawBackground = false;
  }

  // Fill overlaying canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // LoS Drawing
  let val = 0;
  for (let i = 0; i < map.bounds; i++) {
    for (let j = 0; j < map.bounds; j++) {
      val = map.getLit(i, j);
      if (val < 0) {
        continue;
      }
      ctx.globalAlpha = val / radius;
      ctx.clearRect(i * scale, j * scale, scale, scale);
      ctx.fillRect(i * scale, j * scale, scale, scale);
    }
  }
  ctx.globalAlpha = 1.0;

  // Draw world name
  ctx.fillStyle = 'white';
  ctx.fillText(map.name, (map.bounds - 7) * scale, (map.bounds - 1) * scale);

  // Draw messages
  const msgNum = Math.min(15, messageList.length);
  for (let i = 0; i < msgNum; i++) {
    ctx.fillText(messageList[i].msg, 10, (i + 2) * scale);
  }

  const keys = Object.keys(entityList);
  for (let i = 0; i < keys.length; i++) {
    const entity = entityList[keys[i]];
    const eX = Constants.floorLoc(entity.x);
    const eY = Constants.floorLoc(entity.y);

    if (map.getLit(eX, eY) < 0) {
      continue;
    }
    // If self, blue, otherwise gray
    ctx.fillStyle = (entity.id === user.id) ? 'blue' : 'yellow';
    // Draw box
    ctx.fillRect(entity.x * scale, entity.y * scale, 8, 8);
    ctx.fillStyle = 'gray';
    ctx.fillText(entity.name, entity.x * scale, (entity.y * scale) - 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(entity.x * scale, (entity.y * scale) - 7, entity.hp * 3, 5);
  }
};

const tick = () => {
  user.prevX = user.x;
  user.prevY = user.y;

  myKeys.handleKeys(user);

  if (user.x !== user.prevX || user.y !== user.prev) {
    // Emit update
    socket.emit('movement', user);
  }

  // Entity update
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
  }

  // The current time minus 10 seconds
  const time = (new Date().getTime() - 10000);
  for (let i = 0; i < messageList.length; i++) {
    const msg = messageList[i];
    // If it's older than that, remove
    if (msg.time < time) {
      messageList.splice(i, 1);
    }
  }

  // Recalculate FoV
  fov();

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
    canvas.width = map.bounds * scale;
    canvas.height = map.bounds * scale;
    canvas2.width = canvas.width;
    canvas2.height = canvas.height;
    redrawBackground = true;

    // Start updates
    tick();
    return;
  }

  const entity = entityList[data.id];
  if (!entity) {
    entityList[data.id] = data;
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
  messageBox = document.querySelector('#msgBox');

  socket = io.connect();

  socket.on('connect', () => {
    socket.emit('join', { name: `Player${Math.floor(Math.random() * 100)}` });
  });

  socket.on('update', onUpdate);

  socket.on('playerMsg', (data) => {
    messageList.push(data);
  });

  socket.on('kill', (data) => {
    if (entityList[data.id]) {
      delete entityList[data.id];
    }
  });

  messageBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      socket.emit('playerMsg', { msg: messageBox.value });
      messageBox.value = '';
      messageBox.blur();
    }
  });
};

window.onload = init;
