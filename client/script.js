const { KeyObject } = require("crypto");

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
const socket = io()
//wen i met chah hein thuh summea
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
function loop(){
  var localPlayer = [socket.id];
  requestAnimationFrame(loop);
}
/*
ATTENTION:

Color only uses hsl values

Objects only support cubes currently
*/
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
    side6: darkenColor(color),
  }
  content.objects.push(objectData);
}
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
}