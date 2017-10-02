"use strict";

var socket = void 0;

var canvas = void 0;
var ctx = void 0;

// Utilities
var randLoc = function randLoc() {
  return Math.floor(Math.random() * 290 + 10);
};

var init = function init() {
  canvas = document.querySelector('canvas');
  ctx = canvas.getContext('2d');

  socket = io.connect();

  socket.on('connect', function () {
    console.log("Connected.");

    var tempCanvas = document.createElement("canvas");
    tempCanvas.height = 500;
    tempCanvas.width = 500;
    var tempCtx = tempCanvas.getContext("2d");
    var x = randLoc(),
        y = randLoc();
    tempCtx.fillStyle = "black";
    tempCtx.fillRect(x, y, 100, 100);
    socket.emit("draw", {
      x: x, y: y, width: 100, height: 100,
      imgData: tempCanvas.toDataURL()
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  // Catch updates and draw
  socket.on('update', function (data) {
    var image = new Image();
    image.onload = function () {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(image, data.x, data.y, data.width, data.height);
      ctx.restore();
    };
    image.src = data.imgData;
  });
};

window.onload = init;
