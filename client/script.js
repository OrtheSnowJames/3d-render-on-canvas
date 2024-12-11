function checkCollision(object1, object2) {
  if (
    object1.x + object1.width < object2.x ||
    object1.x > object2.x + object2.width ||
    object1.y + object1.height < object2.y ||
    object1.y > object2.y + object2.height ||
    object1.z + object1.length < object2.z ||
    object1.z > object2.z + object2.length
  ) {
    return false;
  } else {
    return true;
  }
}

function useVisualSize(object, distance) {
  var before = object;
  var returnable = {width: object.width/distance, height: object.height/distance, length: object.length/distance, x: object.x, y: object.y+distance, z: object.z};
  if (returnable.width < 0) returnable.width = 0;
  if (returnable.height < 0) returnable.height = 0;
  object = before;
  return returnable;
}
const FOGGINESS_REVERSE_DEFAULT = 213;
let fogginessreverse = FOGGINESS_REVERSE_DEFAULT;
const socket = io();
var content = {
  players: {},
  objects: []
};
let redoName = false;
let zBuffer =[]; //array to store depth values of pixels
const center = document.createElement('center');
const cnv = document.createElement('canvas');
var ctx = cnv.getContext('2d');
cnv.width = 800;
cnv.height = 600;
const canvasWidth = cnv.width;
const canvasHeight = cnv.height;
const nameField = document.createElement('input');
nameField.setAttribute("type", "text");
nameField.setAttribute("value", "enter name");
var namea;
const submitName = document.createElement('button');
submitName.setAttribute("type", "button");
submitName.setAttribute("value", "submit");
document.body.appendChild(nameField);
document.body.appendChild(submitName);
submitName.addEventListener("click", () => {
  if (nameField.value && nameField.value !== "enter name" && nameField.value !== "enter an actual name") {
    socket.emit("name", nameField.value);
    setTimeout(() => {
      if (redoName) {
        nameField.value = 'name already taken';
        redoName = false;
      } else {
        namea = nameField.value;
        document.body.removeChild(nameField);
        document.body.removeChild(submitName);
        document.body.appendChild(center);
        center.appendChild(cnv);
      }
    }, 100);
  }
  else if (nameField.value === "enter name" || nameField.value === "enter an actual name") {
    nameField.value = 'enter an actual name';
  }
});

//init zbuffer with inf value to store many depth values
for (let i = 0; i < canvasWidth; i++) {
  zBuffer[i] = Infinity;
}

//functions to calculate depth to camera
function calculateDistance(obj, camera) {
  //im not this smart yes i looked up a tutorial on math.hypot
  return Math.hypot(obj.x - camera.x, obj.y - camera.y, obj.z - camera.z);
}

function stringToBinary(str) {
  let binaryString = "";
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    let binaryChar = charCode.toString(2).padStart(8, '0');
    binaryString += binaryChar;
  }
  return binaryString;
}

function makeCamera(localPlayer) {
  return {
    x: localPlayer.x - (localPlayer.width / 2),
    y: localPlayer.y + 10,
    width: 1,
    height: 1,
    id: localPlayer.id,
    angle: 0,
    screenWidth: canvasWidth,
    screenHeight: canvasHeight
  };
}


let unsensitivity = 15;
function getmouseanglefound(camera, prevmousepos, newmousepos) {
  //get nearest angle realative to lets say arrow keys/wasd to move camera angle
  //get camera angle first
  let cameraangle = camera.angle;
  //get mouse angle (left or right)
  let mouseangle = () => {
    //we need to find left or right realitive to prev mouse pos
    let prev = prevmousepos;
    let newpos = newmousepos;
    if (prevmousepos.x > newmousepos.x + unsensitivity) {
      //circumfular algorithm (i suck at trig so i found tutorial)
      let angle = Math.atan2(newpos.y - prev.y, newpos.x - prev.x) * 180 / Math.PI;
      return angle;
    }
  }
  //get the difference
  let diff = cameraangle - mouseangle();
  //package differencce with new angle just in case
  let angles = {"diff": diff, "newangle": mouseangle()};
  return angles;
}

function encrypt(key, data, clientKey) {
  const combinedData = data + clientKey;
  return CryptoJS.AES.encrypt(combinedData, key).toString();
}

function decrypt(key, encryptedData) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

socket.on("update", (data) => {
  content = data;
});

socket.on("updatePlayer", (data) => {
  content.players[data.id] = data;
});

socket.on("removePlayer", (data) => {
  delete content.players[data.id];
});

socket.on("updateObject", (data) => {
  content.objects[data.id] = data;
});

socket.on("getContent", (data) => {
  content = data;
});

socket.on("redoName", () => {
  redoName = true;
});

socket.on("grantedLogin", (data) => {
  if (data.statement === true) {
    const decryptedKey = CryptoJS.AES.decrypt(data.key, socket.id).toString(CryptoJS.enc.Utf8);
    const encryptedData = encrypt(decryptedKey, namea, socket.id);
    console.log("Encrypted Data:", encryptedData);
    
    const localPlayerId = data.playerId;
    const localPlayerData = data.playerData;
    content.players[localPlayerId] = localPlayerData;
    //start game loop
    loop();
  }
});

let localcamera;
if (fogginessreverse >= 200) fogginessreverse = 199;
let prevmousepos = {x: 0, y: 0};
let newmousepos = {x: 0, y: 0};
let keys = {};


class Grid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(x, y) {
    return `${Math.floor(x / this.cellSize)}, ${Math.floor(y / this.cellSize)}`;
  }

  insert(object) {
    const key = this._key(object.x, object.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key).push(object);
  }

  retreive(x, y) {
    const key = this._key(x, y);
    return this.cells.get(key) || [];
  }

  clear() {
    this.cells.clear();
  }
}

class Framebuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint8ClampedArray(width * height * 4);
  }

  clear(color = [0, 0, 0, 255]) {
    for (let i = 0; i < this.buffer.length; i += 4) {
      this.buffer.set(color, i);
    }
  }

  setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = (y * this.width + x) * 4;
    this.buffer.set(color, index);
  }

  render(ctx) {
    const imageData = new ImageData(this.buffer, this.width, this.height);
    ctx.putImageData(imageData, 0, 0);
  }
}

class ZBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new Float32Array(width * height).fill(Infinity);
  }

  setDepth(x, y, depth) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = y * this.width + x;
    if (depth < this.buffer[index]) {
      this.buffer[index] = depth;
      return true;
    }
    return false;
  }

  clear() {
    this.buffer.fill(Infinity);
  }
}

function projectObject(obj, camera) {
  const scale = camera.focalLength / (camera.z - obj.z);
  return {
    screenX: obj.x * scale + camera.screenWidth / 2,
    screenY: obj.y * scale + camera.screenHeight / 2,
    depth: obj.z
  };
}

function precomputeProjections(objects, camera) {
  return objects.map(obj => ({
    ...obj,
    projection: projectObject(obj, camera)
  }));
}

function render(objects, camera, fogginessreverse) {
  //sort objects by distance
  const sortedObjects = Object.values(objects).sort((a, b) => {
    const distA = calculateDistance(a, camera);
    const distB = calculateDistance(b, camera);
    return distB - distA;
  });

  sortedObjects.forEach(obj => {
    const depth = calculateDistance(obj, camera);
    const scaledObj = useVisualSize(obj, depth);
    
    //apply fog effect
    const fogFactor = Math.min(1, depth / fogginessreverse);
    const color = obj.color;
    
    ctx.fillStyle = color;
    ctx.fillRect(scaledObj.x, scaledObj.y, scaledObj.width, scaledObj.height);
  });
}

function drawProjectedObject(framebuffer, projection, color) {
  for (let y = Math.floor(projection.screenY); y < projection.screenY + obj.height; y++) {
    for (let x = Math.floor(projection.screenX); x < projection.screenX + obj.width; x++) {
      framebuffer.setPixel(x, y, color);
    }
  }
}

function renderScene(camera) {
  //clear zbuffer
  zBuffer.fill(Infinity);

  //reconstruct stuffs
  for (let obj of content.objects) {
    //is object in view?
    const depth = calculateDistance(obj, camera);
    
    // Apply visual size scaling based on distance
    const scaledObj = useVisualSize(obj, depth);

    //if object is closer than already there object, render it
    if (depth < zBuffer[Math.floor(scaledObj.y) * canvasWidth + Math.floor(scaledObj.x)]) {
      //calculate 2d coords based on camera pos
      const screenX = Math.floor((scaledObj.x - camera.x) * canvasWidth / 2 + canvasWidth / 2);
      const screenY = Math.floor((scaledObj.y - camera.y) * canvasHeight / 2 + canvasHeight / 2);
      
      //check if object is in view
      if (screenX >= 0 && screenX < canvasWidth && screenY >= 0 && screenY < canvasHeight) {
        //draw obj with scaled dimensions
        ctx.fillStyle = obj.color;
        ctx.fillRect(screenX, screenY, scaledObj.width, scaledObj.height);
      }
    }
  }
}

function drawPixel(x, y, color) {
  const index = (y * canvasWidth + x) * 4;
  const rgba = hslToRgb(color); //convert hsl to rgb
  const data = ctx.createImageData(1, 1);
  data.data[0] = rgba[0]; //red
  data.data[1] = rgba[1]; //green
  data.data[2] = rgba[2]; //blue
  data.data[3] = 255; //alpha (255 is opaque)
  ctx.putImageData(data, x, y);
}

function hslToRgb(hsl) {
  const [h, s, l] = hsl.split(',').map(Number);
  let r, g, b;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (  h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }; r = Math.round((r + m) * 255); g = Math.round((g + m) * 255); b = Math.round((b + m) * 255);
  return [r, g, b];
}

function darkenColor(color) {
  let [h, s, l] = color.split(',').map(Number);
  l = Math.max(0, l - 10);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function createObject(color, x, y, z, w, h, l, id) {
  var objectData = {
    id: id,
    x: x,
    y: y,
    z: z,
    w: w,
    width: w,
    h: h,
    height: h,
    l: l,
    length: l,
    color: color,
    side1: color,
    side2: darkenColor(color),
    side3: color,
    side4: darkenColor(color),
    side5: color,
    side6: darkenColor(color)
  };
  return objectData;
}

function createPlayer(color) {
  var playerData = {
    x: Math.floor(Math.random() * 30),
    y: Math.floor(Math.random() * 30),
    w: 5,
    width: 5,
    h: 40,
    height: 40,
    l: 5,
    length: 5,
    side1: color,
    side2: darkenColor(color),
    side3: color,
    side4: darkenColor(color),
    side5: color,
    side6: darkenColor(color)
  };
  return playerData;
}
//loop
document.onkeyup = (e) => {
    var key = e.key;
    keys[key] = false;
};
document.onkeydown = (e) => {
    var key = e.key;
    keys[key] = true;
};
function loop(event) {
  var localPlayerid = socket.id;
  var localPlayer = content.players[localPlayerid];
  
  if (!localPlayer) return;
  
  updatePlayer(localPlayer);
  localcamera = makeCamera(localPlayer);
  
  ctx.clearRect(0, 0, cnv.width, cnv.height);
  ctx.fillStyle = "gray";
  ctx.fillRect(0, 0, cnv.width, cnv.height);
  
  if (event) {
    newmousepos = {x: event.clientX, y: event.clientY}; 
    let angleData = getmouseanglefound(localcamera, prevmousepos, newmousepos);
    if (angleData && angleData.newangle) {
      localcamera.angle = angleData.newangle;
    }
    prevmousepos = newmousepos;
  }
  
  renderScene(localcamera);
  requestAnimationFrame(loop);
}

const PLAYER_SPEED = 2;
const ROTATION_SPEED = 0.05;
const JUMP_FORCE = 5;
const GRAVITY = 0.2;
let playerVelocityY = 0;
let isJumping = false;

function updatePlayer(localPlayer) {
  var updated = false;
  //store previous position for collision checking
  const prevPos = { x: localPlayer.x, y: localPlayer.y, z: localPlayer.z };
  
  //movement relative to camera angle
  if (keys["w"]) {
    localPlayer.x += Math.cos(localPlayer.angle) * PLAYER_SPEED;
    localPlayer.z += Math.sin(localPlayer.angle) * PLAYER_SPEED;
    updated = true;
  }
  if (keys["s"]) {
    localPlayer.x -= Math.cos(localPlayer.angle) * PLAYER_SPEED;
    localPlayer.z -= Math.sin(localPlayer.angle) * PLAYER_SPEED;
    updated = true;
  }
  if (keys["a"]) {
    localPlayer.x -= Math.sin(localPlayer.angle) * PLAYER_SPEED;
    localPlayer.z += Math.cos(localPlayer.angle) * PLAYER_SPEED;
    updated = true;
  }
  if (keys["d"]) {
    localPlayer.x += Math.sin(localPlayer.angle) * PLAYER_SPEED;
    localPlayer.z -= Math.cos(localPlayer.angle) * PLAYER_SPEED;
    updated = true;
  }

  //rotate
  if (keys["ArrowLeft"]) localPlayer.angle -= ROTATION_SPEED; updated = true;
  if (keys["ArrowRight"]) localPlayer.angle += ROTATION_SPEED; updated = true;

  //jump
  if (keys[" "] && !isJumping) {
    playerVelocityY = JUMP_FORCE;
    isJumping = true;
    updated = true;
  }

  //gravity 
  playerVelocityY -= GRAVITY;
  localPlayer.y += playerVelocityY; if (localPlayer.y !== prevPos.y) updated = true;

  //ground check
  if (localPlayer.y <= 0) {
    localPlayer.y = 0;
    playerVelocityY = 0;
    isJumping = false;
    updated = true;
  }

  //collision check
  for (let obj of Object.values(content.objects)) {
    if (checkCollision(localPlayer, obj)) {
      //restore position if collision occurred
      localPlayer.x = prevPos.x;
      localPlayer.y = prevPos.y;
      localPlayer.z = prevPos.z;
      changed = true;
      break;
    }
  }

  // Update player on server
  socket.emit('updatePlayer', localPlayer);
}

cnv.addEventListener('mousemove', (event) => {
  newmousepos = {x: event.clientX, y: event.clientY};
});