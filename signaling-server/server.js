const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

io.on('connection', (socket) => {
    console.log('connected');

    socket.on('register', (id) => {
        console.log('register: ' + id);
        socket.join(id);
        
        socket.join(id, () => {
            let rooms = Object.keys(socket.rooms);
            console.log(rooms);
            socket.broadcast.in(id).emit('registered', id);
        });

        socket.on('pair', (data) => {
            socket.broadcast.in(id).emit('pair', data);
        });
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
});
  
