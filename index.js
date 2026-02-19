const {Server}=require(socket.io)
const express = require('express');
const app = express();
const http = require('http');
const { Chess } = require('chess.js');
const server = http.createServer(app);
const io = new Server(server);
const path = require('path');
const port=process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index')
})

io.on('connection', (socket) => {

    if (!players.white) {
        players.white = socket.id;
        socket.emit('playerRole', 'w')
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit('playerRole', 'b')
    } else {
        socket.emit('spectator')
    }

    socket.on('disconnect', () => {
        if (socket.id === players.white) { delete players.white };
        if (socket.id === players.black) { delete players.black };
    })

    socket.on('move', (moveData) => {
        try {
            if (chess.turn() === 'w' && socket.id !== players.white) {
                socket.emit('invalidMove');
                return;
            }
            if (chess.turn() === 'b' && socket.id !== players.black) {
                socket.emit('invalidMove');
                return;
            }
            const result = chess.move(moveData);

            if (result) {
                currentPlayer = chess.turn();
                io.emit('move', moveData);
                io.emit('boardState', chess.fen());
                
                if (chess.isCheckmate()) {
                    io.emit('checkmate', { winner: chess.turn() === 'w' ? 'black' : 'white' });
                } else if (chess.isCheck()) {
                    io.emit('check');
                }
            }
            else {
                console.log('Invalid move:', moveData);
                socket.emit('invalidMove', moveData);
            }
           
        } catch (error) {
            console.log(error);
            socket.emit('invalidMove');

        }
    })

})
server.listen(port, () => {
    console.log('listening on port:3000');
})

const chess = new Chess();
let players = {};

let currentPlayer = 'w';
