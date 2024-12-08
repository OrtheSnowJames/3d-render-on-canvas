const express = require('express');
const path = require('path')
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const fs = require('fs');

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
app.get('/', (req, res) => {
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
  socket.emit('getData', content);
  socket.on('name', (data) => {
    for (let nameF in content.players) {
      if (nameF === data.name) {
        socket.emit('redoName');
      } else {
        continue;
      }
    }
  });
});

var currentContent = {};
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
  });

  if (JSON.stringify(content) !== JSON.stringify(currentContent)) {
    fs.writeFile('content.json', JSON.stringify(content, null, 2), (err) => {
      if (err) {
        console.error("Error writing new content:", err);
      }
    });
  }

  setTimeout(loop, 16);
}

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
