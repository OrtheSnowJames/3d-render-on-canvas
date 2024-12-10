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
  });
  socket.emit('getContent', content);
  socket.on('name', (data) => {
    if (content.players[data]) {
      socket.emit('redoName');
    } else {
      content.players[data] = { /* player data */ };
      socket.emit('grantedLogin', { statement: true, key: 'someKey' });
      io.emit('update', content);
    }
  });
  
  socket.on('updatePlayer', (playerData) => {
    if (content.players[socket.id]) {
      content.players[socket.id] = {
        ...content.players[socket.id],
        ...playerData
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