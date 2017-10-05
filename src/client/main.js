"use strict";

let socket;

let canvas;
let ctx;

let entityList;
let selfId = -1;

const init = () => {
  canvas = document.querySelector('canvas');
  ctx = canvas.getContext('2d');

  socket = io.connect();

  socket.on('connect', () => {
    console.log("Connected.");
    socket.emit("join", {name: "Player" + Math.floor(Math.random() * 100)});
  });

  socket.on('update', (data) => {
    entityList = data.entities;
    selfId = data.id;
  });
};

window.onload = init;