const xxh = require('xxhashjs');
const dungeonGen = require('./dungeonGen.js');

const POW = 6; // GLOBAL DUNGEON SIZE
let entityId = 1; // Global entity id counter

// Global Lists
const dungeonLookup = {}; // Collection of name->dungeon lookups
const entityList = {}; // List of entities (id->entity, includes players)

const getDungeon = (name) => {
  if (!(dungeonLookup[name])) {
    dungeonLookup[name] = dungeonGen.makeDungeon(POW);
    dungeonLookup[name].name = name;
  }
  return dungeonLookup[name];
};

const parseNext = (old) => parseInt(old.substring(7), 10) + 1;

const nextDungeon = (old) => getDungeon(`dungeon${parseNext(old)}`);

const resolve = (du) => {
  const d = typeof(du) === 'string' ? getDungeon(du) : du;
  // I can't believe I have to do this.
  return d;
};

// ENTITY MANAGEMENT

const resetEntityLocation = (e) => {
  const entity = e;
  const centerX = (2 ** POW) / 2;
  const centerY = (2 ** POW) / 2;
  entity.x = centerX;
  entity.y = centerY;
  entity.prevX = centerX;
  entity.prevY = centerY;
  entity.destX = centerX;
  entity.destY = centerY;
};

const makeEntity = (name) => {
  const e = {
    name,
    hp: 10,
    atk: 1,
    def: 1,
    id: xxh.h32(`${entityId++}${Date.now()}`, 0xCAFEBABE).toString(16),
    lastUpdate: new Date().getTime(),
  };
  resetEntityLocation(e);
  return e;
};

const getUpdateEntity = (entity) => ({
  id: entity.id,
  x: entity.x,
  y: entity.y,
  prevX: entity.prevX,
  prevY: entity.prevY,
  destX: entity.destX,
  destY: entity.destY,
  name: entity.name,
  hp: entity.hp,
  lastUpdate: entity.lastUpdate,
});

const addEntity = (du, e) => {
  const dungeon = resolve(du);
  dungeon.entities.push(e.id);
  entityList[e.id] = e;
};

const removeEntity = (du, i) => {
  const dungeon = resolve(du);
  dungeon.entities = dungeon.entities.filter((e) => e !== i);
};

const deleteEntity = (i) => {
  delete entityList[i];
};

const getEntities = (du) => {
  const dungeon = resolve(du);
  const collect = {};
  const eList = dungeon.entities;
  for (let i = 0; i < eList.length; i++) {
    collect[eList[i]] = getUpdateEntity(entityList[eList[i]]);
  }
  return collect;
};

const getEntity = (id) => entityList[id];

const moveEntity = (duOld, i) => {
  const entity = getEntity(i);
  removeEntity(duOld, i);
  nextDungeon(duOld).entities.push(i);
  entity.dungeon = `dungeon${parseNext(duOld)}`;
  resetEntityLocation(entity);
};

module.exports.getDungeon = getDungeon;
module.exports.makeEntity = makeEntity;
module.exports.getUpdateEntity = getUpdateEntity;
module.exports.addEntity = addEntity;
module.exports.removeEntity = removeEntity;
module.exports.deleteEntity = deleteEntity;
module.exports.getEntities = getEntities;
module.exports.getEntity = getEntity;
module.exports.moveEntity = moveEntity;
