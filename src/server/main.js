const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');
const xxh = require('xxhashjs');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const onRequest = (req, res) => {
  if(req.url === '/bundle.js') { 
    fs.readFile(`${__dirname}/../../build/bundle.js`, (err, data) => {
      res.writeHead(200, { 'Content-Type': 'application/javascript'});
      res.end(data);
    });
  } else {
    fs.readFile(`${__dirname}/../../build/index.html`, (err, data) => {
      res.writeHead(200, { 'Content-Type': 'text/html'});
      res.end(data);
    });
  }
};

const app = http.createServer(onRequest).listen(port);
const io = socketio(app);

console.log(`Listening on 127.0.0.1: ${port}`);

// TODO: Move to seperate files

// Global entity id counter
let entityId = 1;

// Initialize list of dungeons (rooms)
let dungeonList = []; // List of floor names, in order
let dungeonLookup = {}; // Collection of name->dungeon lookups

let entityList = {}; // List of entities (id->entity, includes players)

// Generate initial dungeon
let initialD = "base"; // YEAHHH!!!
dungeonList.push(initialD);
let base = dungeonLookup[initialD] = {
  map: [], //Terrain map (temporary)
  bounds: 32, // Size of side (temporary)
  entities: [], // Entity list (ids)
};
for(let i = 0; i < base.bounds; i++)
  for(let j = 0; j < base.bounds; j++)
    base.map[i * base.bounds + j] = 0;

const makeEntity = (name) => {
  return {
    name: name,
    hp: 10,
    atk: 1,
    def: 1,
    x: 160,
    y: 160,
    prevX: 160,
    prevY: 160,
    destX: 160,
    destY: 160,
    id: xxh.h32(`${entityId++}${Date.now()}`, 0xCAFEBABE).toString(16),
    lastUpdate: new Date().getTime(),
  };
};

const getUpdateEntity = (entity) => {
  return {
    id: entity.id,
    x: entity.x,
    y: entity.y,
    prevX: entity.destX,
    prevY: entity.destY,
    destX: entity.destX,
    destY: entity.destY,
    name: entity.name,
    hp: entity.hp,
    lastUpdate: entity.lastUpdate,
  };
};

const removeEntity = (dungeon, i) => {
  let d = dungeonLookup[dungeon];
  d.entities = d.entities.filter((e) => e != i);
};

const getEntities = (dungeon) => {
  let collect = {};
  let eList = dungeonLookup[dungeon].entities;
  for(let i = 0; i < eList.length; i++)
    collect[eList[i]] = getUpdateEntity(entityList[eList[i]]);
  return collect;
};

// Called once, when the player joins.
const onJoined = (socket) => socket.on('join', (data) => {
    // Client: HI THERE

    // Create player
    let player = makeEntity(data.name);
    player.dungeon = initialD;

    // Give some random jitter
    player.x += Math.random() * 20 - 10;
    player.y += Math.random() * 20 - 10;
    player.destX = player.x;
    player.destY = player.y;

    let dungeon = dungeonLookup[player.dungeon];

    socket.join(player.dungeon);
    socket.playerId = player.id;

    dungeon.entities.push(player.id);
    entityList[player.id] = player;

    // THIS YOU
    socket.emit("update", {
      entities: getEntities(player.dungeon),
      id: player.id,
      map: dungeon.map,
      bounds: dungeon.bounds,
    });
    socket.broadcast.to(player.dungeon).emit("update", getUpdateEntity(player));
});
// Disconnection should delete the user
const onDisconnect = (socket) => socket.on('disconnect', () => {
  var player = entityList[socket.playerId];
  delete entityList[socket.playerId];
  removeEntity(player.dungeon, player.id);
  socket.leave(player.dungeon);
  socket.broadcast.to(player.dungeon).emit("kill", {id: player.id});
});
// TODO: Client verification and limiting is important.
// Blindly trusting leads to wallhacks and pain.
const onMovement = (socket) => socket.on('movement', (data) => {
  var player = entityList[socket.playerId];
  if(!player)
    return;
  player.x = data.x;
  player.y = data.y;
  player.prevX = data.destX;
  player.prevY = data.destY;
  player.destX = data.destX;
  player.destY = data.destY;
  player.lastUpdate = new Date().getTime();
  socket.broadcast.to(player.dungeon).emit("update", getUpdateEntity(player));
});

io.sockets.on('connection', (socket) => {
  onJoined(socket);
  onDisconnect(socket);
  onMovement(socket);
});
