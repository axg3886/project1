/* global Constants, map, user, messageBox */

const myKeys = {};

myKeys.keydown = {};

// event listeners
window.addEventListener('keydown', (e) => {
  myKeys.keydown[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  myKeys.keydown[e.key] = false;
});

myKeys.handleKeys = () => {
  const prevDestX = user.destX;
  const prevDestY = user.destY;

  if (document.activeElement !== messageBox) {
    // Key input
    if (myKeys.keydown.ArrowLeft || myKeys.keydown.a) {
      user.destX = Math.max(0, user.destX - 0.1);
    }
    if (myKeys.keydown.ArrowUp || myKeys.keydown.w) {
      user.destY = Math.max(0, user.destY - 0.1);
    }
    if (myKeys.keydown.ArrowRight || myKeys.keydown.d) {
      user.destX = Math.min(map.bounds, user.destX + 0.1);
    }
    if (myKeys.keydown.ArrowDown || myKeys.keydown.s) {
      user.destY = Math.min(map.bounds, user.destY + 0.1);
    }

    if (!Constants.canWalk(map, user.destX, user.destY)) {
      user.destX = prevDestX;
      user.destY = prevDestY;
    }

    if (map.getLit(Constants.floorLoc(user.destX), Constants.floorLoc(user.destY)) === undefined) {
      user.destX = prevDestX;
      user.destY = prevDestY;
    }

    // Reset alpha
    user.alpha = 0;
  }

  if (myKeys.keydown['/']) {
    if (messageBox.value.startsWith('/')) {
      messageBox.value = messageBox.value.substring(1);
    }
    messageBox.focus();
  }
};

