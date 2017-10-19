const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');
const dungeonManager = require('./dungeonManager.js');
const Constants = require('../shared/constants.js').Constants;

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const onRequest = (req, res) => {
  if (req.url === '/bundle.js') {
    fs.readFile(`${__dirname}/../../build/bundle.js`, (err, data) => {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
  } else {
    fs.readFile(`${__dirname}/../../build/index.html`, (err, data) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  }
};

const app = http.createServer(onRequest).listen(port);
const io = socketio(app);

 /* eslint-disable no-console */
 // Done to prevent warning for this one line
console.log(`Listening on 127.0.0.1:${port}`);
 /* eslint-enable no-console */

// Generate initial dungeon
dungeonManager.getDungeon('dungeon0');

// Called once, when the player joins.
const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
      // Client: HI THERE

      // Create player
    const player = dungeonManager.makeEntity(data.name);
    player.dungeon = 'dungeon0';
    socket.join(player.dungeon);
    socket.playerId = player.id;

    dungeonManager.addEntity(player.dungeon, player);

    const map = dungeonManager.getDungeon(player.dungeon);

      // THIS YOU
    socket.emit('update', {
      entities: dungeonManager.getEntities(map),
      id: player.id,
      map,
    });
    socket.broadcast.to(player.dungeon).emit('update', dungeonManager.getUpdateEntity(player));
  });
};
// Disconnection should delete the user
const onDisconnect = (socket) => socket.on('disconnect', () => {
  const player = dungeonManager.getEntity(socket.playerId);
  if (player) {
    if (player.dungeon) {
      socket.leave(player.dungeon);
      socket.broadcast.to(player.dungeon).emit('kill', { id: player.id });
      dungeonManager.removeEntity(player.dungeon, player.id);
    }
    dungeonManager.deleteEntity(player.id);
  }
});
// TODO: Client verification and limiting is important.
// Blindly trusting leads to wallhacks and pain.
const onMovement = (socket) => socket.on('movement', (data) => {
  const player = dungeonManager.getEntity(socket.playerId);
  if (!player) {
    return;
  }
  const dungeon = dungeonManager.getDungeon(player.dungeon);

  // When moving entities, watch out for sharp edges!
  if (Constants.getTile(dungeon, data.x, data.y) === Constants.TYPES.stairs) {
    io.to(player.dungeon).emit('kill', { id: player.id });
    socket.leave(player.dungeon);
    dungeonManager.moveEntity(player.dungeon, player.id);
    const dungeonNew = dungeonManager.getDungeon(player.dungeon);

    socket.join(player.dungeon);
    socket.emit('update', {
      entities: dungeonManager.getEntities(dungeonNew),
      id: player.id,
      map: dungeonNew,
    });
    socket.broadcast.to(player.dungeon).emit('update', dungeonManager.getUpdateEntity(player));
    return;
  }

  const walkable = Constants.canWalk(dungeon, data.x, data.y);

  player.x = walkable ? data.x : data.prevX;
  player.y = walkable ? data.y : data.prevY;
  player.prevX = data.prevX;
  player.prevY = data.prevY;
  player.destX = data.destX;
  player.destY = data.destY;
  player.lastUpdate = new Date().getTime();
  socket.broadcast.to(player.dungeon).emit('update', dungeonManager.getUpdateEntity(player));
});

const onMessage = (socket) => socket.on('playerMsg', (data) => {
  const player = dungeonManager.getEntity(socket.playerId);
  if (!player) {
    return;
  }
  const obj = {
    msg: `[${player.name}] ${data.msg}`,
    time: (new Date().getTime()),
  };
  io.to(player.dungeon).emit('playerMsg', obj);
});

io.sockets.on('connection', (socket) => {
  onJoined(socket);
  onDisconnect(socket);
  onMovement(socket);
  onMessage(socket);
});
