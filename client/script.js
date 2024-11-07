

const socket = io()
//wen i met chah hein thuh summea
var content = {
  players: {},
  objects: []
}
var redoName = false;
const center = document.createElement('center')
const cnv = document.createElement('canvas')
const nameField = document.createElement('input');
nameField.setAttribute("type", "text");
nameField.setAttribute("value", "enter name");
const submitName = document.createElement('button');
submitName.setAttribute("type", "button");
document.body.appendChild(nameField);
document.body.appendChild(submitName);
submitName.addEventListener("mousedown", () =>{
  loop();
  socket.emit("name", nameField.value);
  setTimeout(()=>{
    if (redoName){
      nameField.setAttribute('value', 'name already taken')
    }
    else{
      document.body.removeChild(nameField);
      document.body.removeChild(submitName);
      document.body.appendChild(center);
      center.appendChild(cnv);
    }
  }, 100)
});
socket.on("update", (data, where)=>{
  content[where] = data;
});
socket.on("getContent", (data)=> { 
  content = data;
})
socket.on("redoName", () => {
  redoName = true;
});
function loop(){
  requestAnimationFrame(loop);
}
/*
ATTENTION:

Color only uses hsl values
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
//example usage
//function draw3D
function draw3D(objectsArray, camera){
  //get px and objects of that px
  //side1
  var undistortedCnv1 = document.createElement('canvas');
  undistortedCnv1.height = cnv.height;
  undistortedCnv1.width = cnv.width;
  var undistortedCtx1 = undistortedCnv1.getContext('2d');
  for (let x = 0; x < cnv.width; x++){
    for (let obj of content.objects){
    var currentY1 = 0;
      //TODO: Make the sides fill sides not everywhere and also viewing obstructions
      for(let x = 0; x < obj.width; x++){
        undistortedCtx1.fillStyle = obj.side1
        undistortedCtx1.fillRect(x, currentY1, 1, 1);
      }
    }
  }
  //send distortion to canvas
}
function distortShape(distortionFactor, shape){
  const distortedCanvas = document.createElement('canvas');
  distortedCanvas.width = shape.w;
  distortedCanvas.height = shape.h;
  var distortedCtx = distortedCanvas.getContext('2d');
  for (let y = 0; y < distortedCanvas.height; y++){
    for (let x = 0; x < distortedCanvas.width; x++)
      var distortedX = shape.x - (distortionFactor * x) + (distortionFactor * x * (y/distortedCanvas.height));
    const pixelData = shape.color;
    distortedCtx.fillStyle = pixelData
    distortedCtx.fillRect(distortedX, y, 1, 1);
    shape.df = distortionFactor;
    shape.dx = distortedX;
  }
  ctx.drawImage(distortedCanvas, shape.x, shape.y)
}