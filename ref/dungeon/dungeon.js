'use strict';

var dungeonGen = dungeonGen || (
	function() {
		var TYPES = {
			dirt: 0,
			air: 1,
			wall: 2,
			stairs: 3,
		};

		function makeArr(p) {
			var arr = [];
			var N = Math.pow(2, p);
			var get = function(x, y) { return arr[x * N + y]; };
			var set = function(x, y, v) { arr[x * N + y] = v; };

			for(var x = 0; x < N; x++)
				for(var y = 0; y < N; y++)
					set(x, y, TYPES.dirt);

			return {
				arr: arr,
				N: N,
				pow: p,
				get: get,
				set: set,
				step: 0,
				stepMax: 10 * (p > 6 ? p * 5 : p),
			};
		};

		function generate(pow) {
			console.log("Generating: " + pow);
			var arr = makeArr(pow);
			console.log("Arr: " + arr.N + " x " + arr.N);

			fillRect(arr, arr.N/2 - 5, arr.N/2 - 5, 10, 10, TYPES.air);
			genWalls(arr);

			return arr;
		};

		function generateStep(arr) {
			if(arr.step == arr.stepMax - 1) {
				var wall = getRandomWall(arr);
				while(closeToSpawn(arr, wall.x, wall.y))
					wall = getRandomWall(arr);
				arr.set(wall.x, wall.y, TYPES.air);
				genWalls(arr);
				arr.set(wall.x, wall.y, TYPES.stairs);
				arr.set(arr.N / 2, arr.N / 2, TYPES.stairs);
				arr.step += 1;
				return;
			}
			if(arr.step >= arr.stepMax)
				return;
			//console.log("Pass: " + arr.step);
			var bk = 0;
			if(nextInt(3 * arr.pow) == 0) {
				// console.log("genRoom");
				while(!genRoom(arr) && bk < 20) {bk++;}
			} else {
				// console.log("genCorridor");
				while(!genCorridor(arr) && bk < 20) {bk++;}
			}
			genWalls(arr);
			arr.step += 1;
		}

		function genCorridor(arr) {
			var wall = getRandomWall(arr);
			var len = nextInt(5) + Math.floor(arr.pow * 2 / 3);

			switch(wall.q) {
				case 3: { //right
					if(!fillRect(arr, wall.x - len, wall.y, len, 1, TYPES.air))
						return false;
					break;
				}
				case 4: { //bottom
					if(!fillRect(arr, wall.x, wall.y - len, 1, len, TYPES.air))
						return false;
					break;
				}
				case 1: { //left
					if(!fillRect(arr, wall.x, wall.y, len, 1, TYPES.air))
						return false;
					break;
				}
				case 2: { //top
					if(!fillRect(arr, wall.x, wall.y, 1, len, TYPES.air))
						return false;
					break;
				}
				default:
					return false;
			}

			arr.set(wall.x, wall.y, TYPES.air);
			return true;
		};

		function genRoom(arr) {
			var wall = getRandomWall(arr);
			var len = nextInt(3) + Math.floor(arr.pow * 2 / 3);

			switch(wall.q) {
				case 3: { //right
					if(!fillRect(arr, wall.x - len, wall.y, len, len, TYPES.air))
						return false;
					break;
				}
				case 4: { //bottom
					if(!fillRect(arr, wall.x, wall.y - len, len, len, TYPES.air))
						return false;
					break;
				}
				case 1: { //left
					if(!fillRect(arr, wall.x, wall.y, len, len, TYPES.air))
						return false;
					break;
				}
				case 2: { //top
					if(!fillRect(arr, wall.x, wall.y, len, len, TYPES.air))
						return false;
					break;
				}
				default:
					return false;
			}
			arr.set(wall.x, wall.y, TYPES.air);
			return true;
		};

		function getRandomWall(arr) {
			var x = nextInt(arr.N);
			var y = nextInt(arr.N);
			var q = nextTo(arr, x, y, TYPES.air);
			return arr.get(x, y) == TYPES.wall && (q > 0 && q < 5) ? {x: x, y: y, q: q} : getRandomWall(arr);
		};

		function genWalls(arr) {
			for (var x = 0; x < arr.N; x++)
				for (var y = 0; y < arr.N; y++)
					if (nextTo(arr, x, y, TYPES.air) != 0 && arr.get(x, y) == TYPES.dirt)
						arr.set(x, y, TYPES.wall);
		};

		function nextTo(arr, x, y, v) {
			if (x - 1 >= 0)
				if (arr.get(x-1, y) == v) //left
					return 1;
			if (y - 1 >= 0)
				if (arr.get(x, y-1) == v) //top
					return 2;
			if (x + 1 < arr.N)
				if (arr.get(x+1, y) == v) //right
					return 3;
			if (y + 1 < arr.N)
				if (arr.get(x, y+1) == v) //bottom
					return 4;
			if (x - 1 >= 0 && y - 1 >= 0)
				if (arr.get(x-1, y-1) == v)
					return 5;
			if (x - 1 >= 0 && y + 1 < arr.N)
				if (arr.get(x-1, y+1) == v)
					return 6;
			if (x + 1 < arr.N && y - 1 >= 0)
				if (arr.get(x+1, y-1) == v)
					return 7;
			if (x + 1 < arr.N && y + 1 < arr.N)
				if (arr.get(x+1, y+1) == v)
					return 8;
			return 0;
		};

		function fillRect(arr, x, y, w, h, t) {
			var m = w * h;
			var k = 0;
			for(var i = 0; i < w; i++)
				for(var j = 0; j < h; j++)
					if(ifWorks(arr, x + i, y + j, true))
						k++;
			if(k < 3 * m / 4)
				return false;

			for(var i = 0; i < w; i++)
				for(var j = 0; j < h; j++)
					if(ifWorks(arr, x + i, y + j, false))
						arr.set(x + i, y + j, t);
			return true;
		};

		function ifWorks(arr, x, y, empty) {
			return !(x <= 0 || x > arr.N || y <= 0 || y > arr.N) && 
				(empty ? arr.get(x, y) == TYPES.dirt : true);
		};

		function closeToSpawn(arr, x, y) {
			return x > arr.N / 2 - 10 && x < arr.N / 2 + 10
				&& y > arr.N / 2 - 10 && y < arr.N / 2 + 10;
		};

		function nextInt(i) {
			return Math.floor(Math.random() * i);
		};

		return {
			generate: generate,
			generateStep: generateStep,
			genCorridor: genCorridor,
			genWalls: genWalls,
			closeToSpawn: closeToSpawn,
			TYPES: TYPES,
		};
	}()
);