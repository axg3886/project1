'use strict';

/* global Constants, map, user, messageBox */

var myKeys = {};

myKeys.keydown = {};

// event listeners
window.addEventListener('keydown', function (e) {
  myKeys.keydown[e.key] = true;
});
window.addEventListener('keyup', function (e) {
  myKeys.keydown[e.key] = false;
});

myKeys.handleKeys = function () {
  var prevDestX = user.destX;
  var prevDestY = user.destY;

  if (document.activeElement !== messageBox) {
    // Key input
    if (myKeys.keydown.ArrowLeft || myKeys.keydown.a) {
      user.destX = Math.max(0, user.destX - 0.1);
    }
    if (myKeys.keydown.ArrowUp || myKeys.keydown.w) {
      user.destY = Math.max(0, user.destY - 0.1);
    }
    if (myKeys.keydown.ArrowRight || myKeys.keydown.d) {
      user.destX = Math.min(map.bounds, user.destX + 0.1);
    }
    if (myKeys.keydown.ArrowDown || myKeys.keydown.s) {
      user.destY = Math.min(map.bounds, user.destY + 0.1);
    }

    if (!Constants.canWalk(map, user.destX, user.destY)) {
      user.destX = prevDestX;
      user.destY = prevDestY;
    }

    if (map.getLit(Constants.floorLoc(user.destX), Constants.floorLoc(user.destY)) === undefined) {
      user.destX = prevDestX;
      user.destY = prevDestY;
    }

    // Reset alpha
    user.alpha = 0;
  }

  if (myKeys.keydown['/']) {
    if (messageBox.value.startsWith('/')) {
      messageBox.value = messageBox.value.substring(1);
    }
    messageBox.focus();
  }
};
'use strict';

/* global myKeys, io, Constants */

var socket = void 0;

var canvas = void 0;
var ctx = void 0;

var canvas2 = void 0;
var background = void 0;
var redrawBackground = void 0;

var messageBox = void 0;

var scale = 12;
var radius = 10;

var map = {};

var entityList = {};
var user = void 0;

var messageList = [];

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

  map.lit = [];
  map.getLit = function (x, y) {
    return map.lit[x * map.bounds + y];
  };
  map.setLit = function (x, y, v) {
    map.lit[x * map.bounds + y] = v;
  };

  map.resetLit = function () {
    for (var x = 0; x < map.bounds; x++) {
      for (var y = 0; y < map.bounds; y++) {
        if (map.getLit(x, y) >= 0) {
          map.setLit(x, y, radius - 1);
        }
      }
    }
  };
  for (var x = 0; x < map.bounds; x++) {
    for (var y = 0; y < map.bounds; y++) {
      map.setLit(x, y, -1);
    }
  }
};

/* Obtained from: http://www.roguebasin.com/index.php?title=LOS_using_strict_definition */
var los = function los(x0, y0, x1, y1) {
  var dx = x1 - x0;
  var dy = y1 - y0;

  // determine which quadrant to we're calculating: we climb in these two directions
  var sx = x0 < x1 ? 1 : -1;
  var sy = y0 < y1 ? 1 : -1;

  var xnext = x0;
  var ynext = y0;

  // calculate length of line to cast (distance from start to final tile)
  var dist = Math.sqrt(dx * dx + dy * dy);

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
var fov = function fov() {
  map.resetLit();

  var x = Constants.floorLoc(user.x);
  var y = Constants.floorLoc(user.y);

  for (var i = -radius; i <= radius; i++) {
    for (var j = -radius; j <= radius; j++) {
      if (i * i + j * j < radius * radius) {
        los(x, y, x + i, y + j);
      }
    }
  }
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

    for (var i = 0; i < map.bounds; i++) {
      for (var j = 0; j < map.bounds; j++) {
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
  var val = 0;
  for (var _i = 0; _i < map.bounds; _i++) {
    for (var _j = 0; _j < map.bounds; _j++) {
      val = map.getLit(_i, _j);
      if (val < 0) {
        continue;
      }
      ctx.globalAlpha = val / radius;
      ctx.clearRect(_i * scale, _j * scale, scale, scale);
      ctx.fillRect(_i * scale, _j * scale, scale, scale);
    }
  }
  ctx.globalAlpha = 1.0;

  // Draw world name
  ctx.fillStyle = 'white';
  ctx.fillText(map.name, (map.bounds - 7) * scale, (map.bounds - 1) * scale);

  // Draw messages
  var msgNum = Math.min(15, messageList.length);
  for (var _i2 = 0; _i2 < msgNum; _i2++) {
    ctx.fillText(messageList[_i2].msg, 10, (_i2 + 2) * scale);
  }

  var keys = Object.keys(entityList);
  for (var _i3 = 0; _i3 < keys.length; _i3++) {
    var entity = entityList[keys[_i3]];
    var eX = Constants.floorLoc(entity.x);
    var eY = Constants.floorLoc(entity.y);

    if (map.getLit(eX, eY) < 0) {
      continue;
    }
    // If self, blue, otherwise gray
    ctx.fillStyle = entity.id === user.id ? 'blue' : 'yellow';
    // Draw box
    ctx.fillRect(entity.x * scale, entity.y * scale, 8, 8);
    ctx.fillStyle = 'gray';
    ctx.fillText(entity.name, entity.x * scale, entity.y * scale - 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(entity.x * scale, entity.y * scale - 7, entity.hp * 3, 5);
  }
};

var tick = function tick() {
  user.prevX = user.x;
  user.prevY = user.y;

  myKeys.handleKeys(user);

  if (user.x !== user.prevX || user.y !== user.prev) {
    // Emit update
    socket.emit('movement', user);
  }

  // Entity update
  var keys = Object.keys(entityList);
  for (var i = 0; i < keys.length; i++) {
    var entity = entityList[keys[i]];

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
  var time = new Date().getTime() - 10000;
  for (var _i4 = 0; _i4 < messageList.length; _i4++) {
    var msg = messageList[_i4];
    // If it's older than that, remove
    if (msg.time < time) {
      messageList.splice(_i4, 1);
    }
  }

  // Recalculate FoV
  fov();

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
    canvas.width = map.bounds * scale;
    canvas.height = map.bounds * scale;
    canvas2.width = canvas.width;
    canvas2.height = canvas.height;
    redrawBackground = true;

    // Start updates
    tick();
    return;
  }

  var entity = entityList[data.id];
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

var init = function init() {
  canvas = document.querySelector('#entity');
  ctx = canvas.getContext('2d');
  canvas2 = document.querySelector('#background');
  background = canvas2.getContext('2d');
  messageBox = document.querySelector('#msgBox');

  socket = io.connect();

  socket.on('connect', function () {
    socket.emit('join', { name: 'Player' + Math.floor(Math.random() * 100) });
  });

  socket.on('update', onUpdate);

  socket.on('playerMsg', function (data) {
    messageList.push(data);
  });

  socket.on('kill', function (data) {
    if (entityList[data.id]) {
      delete entityList[data.id];
    }
  });

  messageBox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      socket.emit('playerMsg', { msg: messageBox.value });
      messageBox.value = '';
      messageBox.blur();
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

    var floorLoc = function floorLoc(i) {
      return Math.floor(i + 0.5);
    };

    var getTile = function getTile(map, x, y) {
      return map.get(floorLoc(x), floorLoc(y));
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
      floorLoc: floorLoc,
      getTile: getTile,
      distSqrd: distSqrd,
      distForm: distForm
    };
  }();
  globalObj.Constants = Constants;
})(glob);
