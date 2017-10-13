'use strict';

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
window.addEventListener('keydown', function (e) {
  myKeys.keydown[e.keyCode] = true;
});
window.addEventListener('keyup', function (e) {
  myKeys.keydown[e.keyCode] = false;
});
'use strict';

/* global myKeys, io, Constants */

var socket = void 0;

var canvas = void 0;
var ctx = void 0;

var canvas2 = void 0;
var background = void 0;
var redrawBackground = void 0;

var scale = 10;
var fov = 100;

var map = {};
var mapSize = 32;

var entityList = {};
var user = void 0;

// Thanks Cody-sempai!
var lerp = function lerp(v0, v1, alpha) {
  return (1 - alpha) * v0 + alpha * v1;
};

var readMap = function readMap(data) {
  map.bounds = data.bounds;
  map.name = data.name;

  map.arr = data.arr;
  map.get = function (x, y) {
    return map.arr[x * map.bounds + y];
  };
  map.set = function (x, y, v) {
    map.arr[x * map.bounds + y] = v;
  };
};

var getColor = function getColor(x, y) {
  var v = map.get(x, y);
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

var redraw = function redraw() {
  // Draw background tiles if needed
  // Generally only once per level.
  if (redrawBackground) {
    background.fillStyle = 'black';
    background.clearRect(0, 0, canvas2.width, canvas2.height);

    for (var i = 0; i < mapSize; i++) {
      for (var j = 0; j < mapSize; j++) {
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

  var keys = Object.keys(entityList);
  for (var _i = 0; _i < keys.length; _i++) {
    var entity = entityList[keys[_i]];

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
    ctx.fillStyle = entity.id === user.id ? 'blue' : '#aaa';
    // Draw box
    ctx.fillRect(entity.x * scale, entity.y * scale, scale, scale);
    ctx.fillStyle = 'gray';
    ctx.fillText(entity.name, entity.x * scale, entity.y * scale - 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(entity.x * scale, entity.y * scale - 7, entity.hp * 3, 5);
  }
};

var tick = function tick() {
  user.prevX = user.x;
  user.prevY = user.y;

  var prevDestX = user.destX;
  var prevDestY = user.destY;

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

var onUpdate = function onUpdate(data) {
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

  var entity = entityList[data.id];
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

var init = function init() {
  canvas = document.querySelector('#entity');
  ctx = canvas.getContext('2d');
  canvas2 = document.querySelector('#background');
  background = canvas2.getContext('2d');

  socket = io.connect();

  socket.on('connect', function () {
    socket.emit('join', { name: 'Player' + Math.floor(Math.random() * 100) });
  });

  socket.on('update', onUpdate);

  socket.on('kill', function (data) {
    if (entityList[data.id]) {
      delete entityList[data.id];
    }
  });
};

window.onload = init;
'use strict';

var glob = {};
if (typeof module !== 'undefined' && module.exports) {
  glob = module.exports;
} else if (typeof window !== 'undefined') {
  glob = window;
}

(function (arch) {
  // Bypass "no-param-reassign"
  var globalObj = arch;

  var Constants = function () {
    // Module starts here

    var TYPES = Object.seal({
      dirt: 0,
      air: 1,
      wall: 2,
      stairs: 3
    });

    var WALKABLE = Object.seal({
      1: true,
      3: true
    });

    var closeToSpawn = function closeToSpawn(arr, x, y) {
      return x > arr.N / 2 - 10 && x < arr.N / 2 + 10 && y > arr.N / 2 - 10 && y < arr.N / 2 + 10;
    };

    var nextInt = function nextInt(i) {
      return Math.floor(Math.random() * i);
    };

    var getTile = function getTile(map, x, y) {
      return map.get(Math.floor(x + 0.5), Math.floor(y + 0.5));
    };

    var canWalk = function canWalk(map, x, y) {
      var v = getTile(map, x, y);
      if (WALKABLE[v]) {
        return WALKABLE[v] === true;
      }
      return false;
    };

    var distSqrd = function distSqrd(x1, y1, x2, y2) {
      return Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
    };
    var distForm = function distForm(x1, y1, x2, y2) {
      return Math.sqrt(distSqrd(x1, y1, x2, y2));
    };

    return {
      TYPES: TYPES,
      closeToSpawn: closeToSpawn,
      nextInt: nextInt,
      canWalk: canWalk,
      getTile: getTile,
      distSqrd: distSqrd,
      distForm: distForm
    };
  }();
  globalObj.Constants = Constants;
})(glob);
