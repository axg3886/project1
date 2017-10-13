const Constants = require('../shared/constants.js').Constants;

const makeArr = (p) => {
  const arr = [];
  const N = 2 ** p;
  const entities = [];

  const stepMax = 10 * (p > 6 ? p * 5 : p);

  const get = (x, y) => arr[(x * N) + y];
  const set = (x, y, v) => { arr[(x * N) + y] = v; };

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      set(x, y, Constants.TYPES.dirt);
    }
  }

  return {
    arr,
    bounds: N,
    pow: p,
    get,
    set,
    step: 0,
    stepMax,
    entities,
  };
};

function nextTo(arr, x, y, v) {
  if (x - 1 >= 0) {
    if (arr.get(x - 1, y) === v) { // left
      return 1;
    }
  }
  if (y - 1 >= 0) {
    if (arr.get(x, y - 1) === v) { // top
      return 2;
    }
  }
  if (x + 1 < arr.bounds) {
    if (arr.get(x + 1, y) === v) { // right
      return 3;
    }
  }
  if (y + 1 < arr.bounds) {
    if (arr.get(x, y + 1) === v) { // bottom
      return 4;
    }
  }
  if (x - 1 >= 0 && y - 1 >= 0) {
    if (arr.get(x - 1, y - 1) === v) {
      return 5;
    }
  }
  if (x - 1 >= 0 && y + 1 < arr.bounds) {
    if (arr.get(x - 1, y + 1) === v) {
      return 6;
    }
  }
  if (x + 1 < arr.bounds && y - 1 >= 0) {
    if (arr.get(x + 1, y - 1) === v) {
      return 7;
    }
  }
  if (x + 1 < arr.bounds && y + 1 < arr.bounds) {
    if (arr.get(x + 1, y + 1) === v) {
      return 8;
    }
  }
  return 0;
}

function ifWorks(arr, x, y, empty) {
  return !(x <= 0 || x > arr.bounds || y <= 0 || y > arr.bounds) &&
    (empty ? arr.get(x, y) === Constants.TYPES.dirt : true);
}

function fillRect(arr, x, y, w, h, t) {
  const m = w * h;
  let k = 0;
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      if (ifWorks(arr, x + i, y + j, true)) {
        k++;
      }
    }
  }
  if (k < m * (3 / 4)) {
    return false;
  }

  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      if (ifWorks(arr, x + i, y + j, false)) {
        arr.set(x + i, y + j, t);
      }
    }
  }
  return true;
}

function getRandomWall(arr) {
  const x = Constants.nextInt(arr.bounds);
  const y = Constants.nextInt(arr.bounds);
  const q = nextTo(arr, x, y, Constants.TYPES.air);
  return arr.get(x, y) === Constants.TYPES.wall
    && (q > 0 && q < 5) ? { x, y, q } : getRandomWall(arr);
}

function genCorridor(arr) {
  const wall = getRandomWall(arr);
  const len = Constants.nextInt(5) + Math.floor(arr.pow * (2 / 3));

  switch (wall.q) {
    case 3: { // right
      if (!fillRect(arr, wall.x - len, wall.y, len, 1, Constants.TYPES.air)) {
        return false;
      }
      break;
    }
    case 4: { // bottom
      if (!fillRect(arr, wall.x, wall.y - len, 1, len, Constants.TYPES.air)) {
        return false;
      }
      break;
    }
    case 1: { // left
      if (!fillRect(arr, wall.x, wall.y, len, 1, Constants.TYPES.air)) {
        return false;
      }
      break;
    }
    case 2: { // top
      if (!fillRect(arr, wall.x, wall.y, 1, len, Constants.TYPES.air)) {
        return false;
      }
      break;
    }
    default:
      return false;
  }

  arr.set(wall.x, wall.y, Constants.TYPES.air);
  return true;
}

function genWalls(arr) {
  for (let x = 0; x < arr.bounds; x++) {
    for (let y = 0; y < arr.bounds; y++) {
      if (nextTo(arr, x, y, Constants.TYPES.air) !== 0
          && arr.get(x, y) === Constants.TYPES.dirt) {
        arr.set(x, y, Constants.TYPES.wall);
      }
    }
  }
}

function genRoom(arr) {
  const wall = getRandomWall(arr);
  const len = Constants.nextInt(3) + Math.floor(arr.pow * (2 / 3));

  switch (wall.q) {
    case 3: { // right
      if (!fillRect(arr, wall.x - len, wall.y, len, len, Constants.TYPES.air)) {
        return false;
      }
      break;
    }
    case 4: { // bottom
      if (!fillRect(arr, wall.x, wall.y - len, len, len, Constants.TYPES.air)) {
        return false;
      }
      break;
    }
    case 1: { // left
      if (!fillRect(arr, wall.x, wall.y, len, len, Constants.TYPES.air)) {
        return false;
      }
      break;
    }
    case 2: { // top
      if (!fillRect(arr, wall.x, wall.y, len, len, Constants.TYPES.air)) {
        return false;
      }
      break;
    }
    default:
      return false;
  }
  arr.set(wall.x, wall.y, Constants.TYPES.air);
  return true;
}

function generateStep(a) {
  const arr = a;

  if (arr.step === arr.stepMax - 1) {
    let wall = getRandomWall(arr);
    while (Constants.closeToSpawn(arr, wall.x, wall.y)) {
      wall = getRandomWall(arr);
    }
    arr.set(wall.x, wall.y, Constants.TYPES.air);
    genWalls(arr);
    arr.set(wall.x, wall.y, Constants.TYPES.stairs);
    // arr.set(arr.bounds / 2, arr.bounds / 2, Constants.TYPES.stairs);
    arr.step++;
    return;
  }
  if (arr.step >= arr.stepMax) {
    return;
  }
  let bk = 0;
  if (Constants.nextInt(3 * arr.pow) === 0) {
    while (!genRoom(arr) && bk < 20) {
      bk++;
    }
  } else {
    while (!genCorridor(arr) && bk < 20) {
      bk++;
    }
  }
  genWalls(arr);
  arr.step++;
}

const initialize = (pow) => {
  const arr = makeArr(pow);

  fillRect(arr, (arr.bounds / 2) - 5, (arr.bounds / 2) - 5, 10, 10, Constants.TYPES.air);
  genWalls(arr);

  return arr;
};

const makeDungeon = (pow) => {
  const arr = initialize(pow);
  while (arr.step < arr.stepMax) {
    generateStep(arr);
  }
  return arr;
};

module.exports.makeDungeon = makeDungeon;
