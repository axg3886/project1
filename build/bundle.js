"use strict";

var myKeys = {};

myKeys.KEYBOARD = Object.freeze({
	KEY_LEFT: 37,
	KEY_UP: 38,
	KEY_RIGHT: 39,
	KEY_DOWN: 40,
	KEY_SPACE: 32,
	KEY_SHIFT: 16
});
myKeys.keydown = [];

// event listeners
window.addEventListener("keydown", function (e) {
	return myKeys.keydown[e.keyCode] = true;
});
window.addEventListener("keyup", function (e) {
	return myKeys.keydown[e.keyCode] = false;
});
"use strict";

var socket = void 0;

var canvas = void 0;
var ctx = void 0;

var map = [];
var mapSize = 32;

var entityList = {};
var user = void 0;

// Thanks Cody-sempai!
var lerp = function lerp(v0, v1, alpha) {
  return (1 - alpha) * v0 + alpha * v1;
};

var onUpdate = function onUpdate(data) {
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

  var entity = entityList[data.id];
  if (!entity) {
    entityList[data.id] = data;
    requestAnimationFrame(tick);
    return;
  }
  if (entity.lastUpdate >= data.lastUpdate) return;
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

var redraw = function redraw() {
  ctx.clearRect(0, 0, mapSize * 10, mapSize * 10);

  var keys = Object.keys(entityList);
  for (var i = 0; i < keys.length; i++) {
    var entity = entityList[keys[i]];

    // Update alpha
    if (entity.alpha < 1) entity.alpha += 0.05;

    // Lerp position
    entity.x = lerp(entity.prevX, entity.destX, entity.alpha);
    entity.y = lerp(entity.prevY, entity.destY, entity.alpha);
    // If self, red, otherwise black
    ctx.fillStyle = entity.id == user.id ? "red" : "#aaa";
    // Draw box
    ctx.fillRect(entity.x, entity.y, 30, 30);
    ctx.fillStyle = "black";
    ctx.fillText(entity.name, entity.x, entity.y - 10);
    ctx.fillStyle = "green";
    ctx.fillRect(entity.x, entity.y - 7, entity.hp * 3, 5);
  }
};

var tick = function tick(time) {
  user.prevX = user.x;
  user.prevY = user.y;

  // Key input
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_LEFT]) user.destX = Math.max(0, user.destX - 2);
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_UP]) user.destY = Math.max(0, user.destY - 2);
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_RIGHT]) user.destX = Math.min(mapSize * 9, user.destX + 2);
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN]) user.destY = Math.min(mapSize * 9, user.destY + 2);

  // Reset alpha
  user.alpha = 0;

  // Emit update
  socket.emit('movement', user);

  // Redraw
  redraw();

  // Tick at 60 fps
  requestAnimationFrame(tick);
};

var init = function init() {
  canvas = document.querySelector('canvas');
  ctx = canvas.getContext('2d');

  socket = io.connect();

  socket.on('connect', function () {
    socket.emit("join", { name: "Player" + Math.floor(Math.random() * 100) });
  });

  socket.on('update', onUpdate);

  socket.on('kill', function (data) {
    if (entityList[data.id]) delete entityList[data.id];
  });
};

window.onload = init;
