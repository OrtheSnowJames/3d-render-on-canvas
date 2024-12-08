
function checkCollision(object1, object2) {
  // Check if the objects are even close enough to potentially collide
  if (
    object1.x + object1.width < object2.x ||
    object1.x > object2.x + object2.width ||
    object1.y + object1.height < object2.y ||
    object1.y > object2.y + object2.height
  ) {
    return false; // No collision
  } else {
    return true; // Collision detected
  }
}
//variables
let fogginessreverse = 213;
const socket = io()
var content = {
  players: {},
  objects: []
}
var redoName = false;
const center = document.createElement('center')
const cnv = document.createElement('canvas')
var ctx = cnv.getContext('2d')
const nameField = document.createElement('input');
nameField.setAttribute("type", "text");
nameField.setAttribute("value", "enter name");
var namea;
const submitName = document.createElement('button');
submitName.setAttribute("type", "button");
submitName.setAttribute("value", "submit");
document.body.appendChild(nameField);
document.body.appendChild(submitName);
submitName.addEventListener("mousedown", () => {
  loop();
  socket.emit("name", nameField.value);
  setTimeout(()=>{
    if (redoName){
      nameField.setAttribute('value', 'name already taken')
    }
    else{
      namea = nameField.value;
      document.body.removeChild(nameField);
      document.body.removeChild(submitName);
      document.body.appendChild(center);
      center.appendChild(cnv);
    }
  }, 100)
});
function stringToBinary(str) {
  let binaryString = "";
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    let binaryChar = charCode.toString(2).padStart(8, '0'); // Pad with 0s to make 8 bits
    binaryString += binaryChar;
  }
  return binaryString;
}
function makeCamera(localPlayer) {
  return {
    x: localPlayer.x - (localPlayer.width/2),
    y: localPlayer.y + 10,
    width: localPlayer.width,
    height: localPlayer.height,
    id: localPlayer.id
  }
}
function encrypt(key, data, clientKey){
  var newDat = stringToBinary(data);
  newDat += key;
  newDat += clientKey;
}
socket.on("update", (data, where)=>{
  content[where] = data;
});
socket.on("getContent", (data)=> { 
  content = data;
})
socket.on("redoName", () => {
  redoName = true;
});
socket.on("grantedLogin", (data) => {
  if (data.statement = true){encrypt(data.key, namea, socket.id); }
});
let localcamera;
if (fogginessreverse >= 200) fogginessreverse = 199;
function loop(){
  var localPlayerid = [socket.id];
  var localPlayer = content.players[localPlayerid];
  localcamera = makeCamera(localPlayer);
  requestAnimationFrame(loop);
  //clear before frames to ensure no overlapping
  ctx.clearRect(0, 0, cnv.width, cnv.height);
  render(content.objects, localcamera, fogginessreverse);
}
/*
ATTENTION:

Color only uses rgba values

Objects only support cubes currently
*/
//a grid to store cool pixels on
class Grid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(x, y) {
    return `${Math.floor(x / this.cellSize)}, ${Math.floor(y / this.cellSize)}`
  }

  insert(object) {
    const key = this_.key(object.x, object.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key).push(object);
  }

  retreive(x, y) {
    const key = this_.key(x,y);
    return this.cells.get(key) || [];
  }

  clear() {
    this.cells.clear;
  }
}
//framebuffer to store pixels instead of a canvas because thats more memory demanding i think
class Framebuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint8ClampedArray(width * height * 4); //rgba for pixels because easier
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
//zbuffer to get closest object because the thing i had before was too complex 😞 respect for for loop that went on for decades just to find the closest object
class ZBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new Float32Array(width * height).fill(Infinity);
  }

  setDepth(x, y, depth) {
    //make sure that everything is in the viewport properly
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = t * this.width + x;
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
  //simplified perspective projection unlike first commit
  const scale = camera.focalLength / (camera.z - obj.z);
  return {
    screenX: obj.x * scale + camera.screenWidth / 2,
    screenY: obj.y * scale + camera.screenHeight / 2,
    depth: obj.z
  };
}
function precomputeProjections(objects, camera) {
  return objects.map(obj => ({
    //get all objects array
    ...obj,
    projection: projectObject(obj, camera)
  }));
}
//this is what we've all been waiting for
function render(objects, camera, framebuffer) {
  objects.sort((a, b) => b.z - a.z)

  objects.forEach(obj => {
    const projection = projectObject(obj, camera);
    drawProjectedObject(framebuffer, projection, obj.color)
  });
}
//someone told me this was bad but we're making a video game over here
function drawProjectedObject(framebuffer, projection, color) {
  for (let y = Math.floor(projection.screenY); y < projection.screenY + objheight; y++) {
    for (let x = Math.floor(projection.screenX); x < projection.screenX + obj.height; x++) {
      framebuffer.setPixel(x, y, color);
    }
  }
}
//other things
function darkenColor(color){
  let [h, s, l] = color.split(',').map(Number);
  l = Math.max(0, l - 10)
  return `hsl(${h}, ${s}%, ${l}%)`;
};
function createObject(color, x, y, z, w, h, l){
  var objectData = {
    x: x,
    y: y,
    z: z,
    w: w,
    width: w,
    h: h,
    height: h,
    l: l, 
    length: l,
    side1: color,
    side2: darkenColor(color),
    side3: color,
    side4: darkenColor(color),
    side5: color,
    side6: darkenColor(color)
  }
  return objectData;
}
function createPlayer(color) {
  var playerData = {
    x: Math.floor(Math.random * 30),
    y: Math.floor(Math.random * 30),
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
/*old desolate memory-wasteful functions*
function draw3D(objectsArray, camera, backgroundColor) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
          const objects = objectsArray.filter(obj => 
              checkCollision(
                  {x, y, width: 1, height: 1},
                  {x: obj.x, y: obj.y, width: obj.width, height: obj.height}
              )
          );

          if (objects.length) {
              const unraveledObjects = objects.map(obj => ({
                  ...unravelObject(obj),
                  distance: calculateDistance(obj, camera)
              }));

              const closestObject = unraveledObjects.reduce((prev, curr) => 
                  prev.distance < curr.distance ? prev : curr
              );

              const distortedObject = foldifyObject(closestObject, camera);
              drawPixel(imageData, x, y, distortedObject.color);
          }
      }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function foldifyObject(obj, camera) {
  const sides = [
      { pos: calculateSidePosition(1, obj), color: obj.side1 },
      { pos: calculateSidePosition(2, obj), color: obj.side2 },
      { pos: calculateSidePosition(3, obj), color: obj.side3 },
      { pos: calculateSidePosition(4, obj), color: obj.side4 },
      { pos: calculateSidePosition(5, obj), color: obj.side5 },
      { pos: calculateSidePosition(6, obj), color: obj.side6 }
  ];

  return sides.map(side => ({
      ...side,
      distortion: calculateDistortion(camera, side.pos)
  }));
}

function unravelObject(obj) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const sideWidth = obj.width;
  const sideHeight = obj.height;

  canvas.width = sideWidth * 4;
  canvas.height = sideHeight * 4;

  const sides = [
      { color: obj.side1, x: sideWidth, y: 0, w: sideWidth, h: obj.length },
      { color: obj.side2, x: sideWidth, y: sideHeight, w: sideWidth, h: sideHeight },
      { color: obj.side3, x: sideWidth, y: sideHeight * 2, w: sideWidth, h: obj.length },
      { color: obj.side4, x: sideWidth, y: sideHeight * 3, w: sideWidth, h: sideHeight },
      { color: obj.side5, x: 0, y: sideHeight, w: obj.length, h: sideWidth },
      { color: obj.side6, x: 0, y: sideHeight * 2, w: obj.length, h: sideWidth }
  ];

  sides.forEach(side => {
      ctx.fillStyle = side.color;
      ctx.fillRect(side.x, side.y, side.w, side.h);
  });

  return canvas;
}

function distortShape(factor, shape) {
  const distorted = document.createElement('canvas');
  const ctx = distorted.getContext('2d');

  distorted.width = shape.width;
  distorted.height = shape.height;

  const imageData = ctx.createImageData(distorted.width, distorted.height);
  const buffer = new Float32Array(distorted.width * distorted.height * 4);

  for (let y = 0; y < distorted.height; y++) {
      const yFactor = y / distorted.height;
      for (let x = 0; x < distorted.width; x++) {
          const distortedX = shape.x - (factor * x) + (factor * x * yFactor);
          const index = (y * distorted.width + x) * 4;

          buffer[index] = distortedX;
          buffer[index + 1] = y;
          buffer[index + 2] = shape.color;
          buffer[index + 3] = 255;
      }
  }

  ctx.putImageData(imageData, 0, 0);
  return distorted;
}

function calculateDistance(point1, point2) {
  return Math.hypot(point2.x - point1.x, point2.y - point1.y, point2.z - point1.z);
}

function drawPixel(imageData, x, y, color) {
  const index = (y * imageData.width + x) * 4;
  imageData.data.set(color, index);
}*/