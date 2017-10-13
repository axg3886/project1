let glob = {};
if (typeof(module) !== 'undefined' && module.exports) {
  glob = module.exports;
} else if (typeof(window) !== 'undefined') {
  glob = window;
}

((arch) => {
  // Bypass "no-param-reassign"
  const globalObj = arch;

  const Constants = (() => {
    // Module starts here

    const TYPES = Object.seal({
      dirt: 0,
      air: 1,
      wall: 2,
      stairs: 3,
    });

    const WALKABLE = Object.seal({
      1: true,
      3: true,
    });

    const closeToSpawn = (arr, x, y) => x > (arr.N / 2) - 10 && x < (arr.N / 2) + 10
        && y > (arr.N / 2) - 10 && y < (arr.N / 2) + 10;

    const nextInt = (i) => Math.floor(Math.random() * i);

    const getTile = (map, x, y) => map.get(Math.floor(x + 0.5), Math.floor(y + 0.5));

    const canWalk = (map, x, y) => {
      const v = getTile(map, x, y);
      if (WALKABLE[v]) {
        return WALKABLE[v] === true;
      }
      return false;
    };

    const distSqrd = (x1, y1, x2, y2) => ((x2 - x1) ** 2) + ((y2 - y1) ** 2);
    const distForm = (x1, y1, x2, y2) => Math.sqrt(distSqrd(x1, y1, x2, y2));

    return {
      TYPES,
      closeToSpawn,
      nextInt,
      canWalk,
      getTile,
      distSqrd,
      distForm,
    };
  })();
  globalObj.Constants = Constants;
})(glob);
