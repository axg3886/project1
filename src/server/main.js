const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const onRequest = (req, res) => {
  if(req.url === '/bundle.js') { 
    fs.readFile(`${__dirname}/../hosted/bundle.js`, (err, data) => {
      res.writeHead(200, { 'Content-Type': 'application/javascript'});
      res.end(data);
    });
  } else {
    fs.readFile(`${__dirname}/../hosted/index.html`, (err, data) => {
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
dungeonList.push("base");
dungeonLookup["base"] = {
  map: [], //Terrain map (temporary)
  bounds: 32, // Size of side (temporary)
  entities: [], // Entity list (ids)
};

var getEntities = (dungeon) => {
  let collect = [];
  let eList = dungeonLookup[dungeon].entities;
  for(let i = 0; i < eList.length; i++)
    collect.push(entityList[eList[i]]);
  return collect;
};

// Called once, when the player joins.
const onJoined = (socket) => socket.on('join', (data) => {
    // Client: HI THERE
    let player = {name: data.name, hp: 10, atk: 1, def: 1};
    player.x = player.y = 16; // Spawn in middle, temporary
    player.vx = player.vy = 0.0; // Velocity - should be server checked
    player.id = entityId++; // NEVER SHOULD REPEAT EVER

    socket.join("base");
    dungeonLookup["base"].entities[player.id] = player;
    // THIS YOU
    socket.emit("update", {entities: getEntities("base"), id: player.id});
});

io.sockets.on('connection', (socket) => {
  onJoined(socket);
});
