const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const { fs } = require('fs');
const { isUtf8 } = require('node:buffer');
const { error } = require('node:console');

  const app = express();
  const server = createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'client/index.html'));
});
var content;
fs.readFile('/content.json', utf8, (error, data) => {
  if (err){console.log('error getting content')}
  else{content = data;};
});
io.on('connection', (socket) => {
  console.log('a wild user appeared!')
  socket.on('disconnect', () => {
    console.log("user went bu bye")
  });
  socket.emit('getData', content)
  socket.on('name', (data) => {
    for (let nameF in content.players){
      if (nameF === data.name){
        socket.emit('redoName')
      }
    }
  });
});
var currentContent;
loop();
function loop(){
  fs.readFile('content.json', isUtf8, (error, data) => {
    if(err){console.error('error getting new content', error)}
    try{
      currentContent = JSON.parse(data);
    }
    catch (error){
      console.error("error getting new content", error)
    }
  });
  if (JSON.stringify(content) !== JSON.stringify(currentContent)){
    fs.writeFile('content.json', content, (err) => {
      if (err){
        console.error("error writing new content");
      }
    });
  }
  requestAnimationFrame(loop);
}

  server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
  });