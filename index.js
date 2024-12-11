import express from 'express';
import { createServer } from 'node:http';
import path, { join, dirname } from 'node:path';
import { Server } from 'socket.io';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use('/client', express.static(path.join(__dirname, 'client'), {
   setHeaders: (res, path) => {
       if (path.endsWith('.js')) {
           res.setHeader('Content-Type', 'application/javascript');
       }
   }
}));
app.get('/', (_, res) => {
  res.sendFile(join(__dirname, 'client/index.html'));
});

var content = {
  players: {},
  objects: []
};

function checkCollision(object1, objects) {
  //if is array then make it singular object
  if (Array.isArray(objects)) {
    return objects.some(obj => checkCollision(object1, obj));
  }

  const object2 = objects;
  return !(
    object1.x + object1.width < object2.x ||
    object1.x > object2.x + object2.width ||
    object1.y + object1.height < object2.y ||
    object1.y > object2.y + object2.height ||
    object1.z + object1.length < object2.z ||
    object1.z > object2.z + object2.length
  );
}

function darkenRGBA(color) {
  const [r, g, b, a] = color.replace('rgba(', '').replace(')', '').split(',').map(Number);
  const darkenFactor = 0.8; //reduces brightness by 20% wow
  return `rgba(${Math.floor(r * darkenFactor)}, ${Math.floor(g * darkenFactor)}, ${Math.floor(b * darkenFactor)}, ${a})`;
}

function darkenColor(color) {
  if (color.startsWith('rgba')) {
    return darkenRGBA(color);
  } else if (color.startsWith('hsl')) {
    let [h, s, l] = color.split(',').map(Number);
    l = Math.max(0, l - 10);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  //default to RGBA if format is unknown
  return darkenRGBA(color);
}

function createPlayer(color) {
  var playerData = {
    x: Math.floor(Math.random() * 30),
    y: Math.floor(Math.random() * 30),
    z: Math.floor(Math.random() * 30),
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
  
  //only check collision if there are objects to save cpu
  if (content.objects && content.objects.length > 0 && checkCollision(playerData, content.objects)) {
    return createPlayer(color);
  }
  return playerData;
}

//read contents
fs.readFile('content.json', 'utf8', (error, data) => {
  if (error) {
    console.log('Error getting content:', error);
  } else {
    try {
      content = JSON.parse(data);
    } catch (error) {
      console.log('Error parsing content:', error);
    }
  }
});

io.on('connection', (socket) => {
  console.log('A wild user appeared!');

  socket.on('disconnect', () => {
    console.log("User went bye-bye");
    if (content.players[socket.id]) {
      delete content.players[socket.id];
      socket.broadcast.emit('removePlayer', { id: socket.id });
    }
  });

  socket.emit('getContent', content);

  socket.on('name', (data) => {
    let playerExists = Object.values(content.players).some(player => player.name === data);
    
    if (playerExists) {
      socket.emit('redoName');
    } else {
      content.players[socket.id] = {
        ...createPlayer(`rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 1)`),
        name: data,
        id: socket.id
      };
      
      socket.emit('grantedLogin', { 
        statement: true, 
        key: 'someKey',
        playerId: socket.id,
        playerData: content.players[socket.id]
      });
      
      io.emit('update', content);
    }
  });
  
  socket.on('updatePlayer', (playerData) => {
    if (content.players[socket.id]) {
      content.players[socket.id] = {
        ...content.players[socket.id],
        ...playerData,
        id: socket.id
      };
      socket.broadcast.emit('updatePlayer', {
        id: socket.id,
        ...content.players[socket.id]
      });
    }
  });
});

let currentContent = {};
loop();

function loop() {
  fs.readFile('content.json', 'utf8', (error, data) => {
    if (error) {
      console.error('Error getting new content:', error);
    } else {
      try {
        currentContent = JSON.parse(data);
      } catch (error) {
        console.error('Error parsing new content:', error);
      }
    }

    if (!deepEqual(content, currentContent)) {
      content = currentContent;
      fs.writeFile('content.json', JSON.stringify(content), (err) => {
        if (err) {
          console.error("Error writing new content:", err);
        }
      });
    }
  });
}

setInterval(loop, 1000);

function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) return false;
  let keys1 = Object.keys(obj1), keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (let key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
}

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});