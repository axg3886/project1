"use strict";

let socket;

let canvas;
let ctx;

// Utilities
const randLoc = () => Math.floor(Math.random() * 290 + 10);

const init = () => {
  canvas = document.querySelector('canvas');
  ctx = canvas.getContext('2d');

  socket = io.connect();

  socket.on('connect', () => {
    console.log("Connected.");

    let tempCanvas = document.createElement("canvas");
    tempCanvas.height = 500;
    tempCanvas.width = 500;
    let tempCtx = tempCanvas.getContext("2d");
    let x = randLoc(), y = randLoc();
    tempCtx.fillStyle = "black";
    tempCtx.fillRect(x, y, 100, 100);
    socket.emit("draw", {
      x: x, y: y, width: 100, height: 100,
      imgData: tempCanvas.toDataURL()
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  // Catch updates and draw
  socket.on('update', (data) => {
    let image = new Image();
    image.onload = () => {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(image, data.x, data.y, data.width, data.height);
      ctx.restore();
    };
    image.src = data.imgData;
  });
};

window.onload = init;