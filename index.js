const { Server } = require('socket.io');
const express = require('express');
const app = express();
const http = require('http');
const { Chess } = require('chess.js');
const server = http.createServer(app);
const io = new Server(server);
const path = require('path');
const port=process.env.PORT || 3000;

const games = {};
let gameIdCounter = 1;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index')
})

function findOrCreateGame() {
    for (const [gameId, game] of Object.entries(games)) {
        console.log(gameId, game.players);
        if (!game.players.black) {
            return gameId;
        }
    }
    
    const newGameId = `game_${gameIdCounter++}`;
    games[newGameId] = {
        chess: new Chess(),
        players: {},
        currentPlayer: 'w'
    };
    return newGameId;
}

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    const gameId = findOrCreateGame();
    const game = games[gameId];
    
    socket.join(gameId);
    socket.gameId = gameId;

    if (!game.players.white) {
        game.players.white = socket.id;
        socket.emit('playerRole', 'w');
        socket.emit('waitingForPlayers');
    } else if (!game.players.black) {
        game.players.black = socket.id;
        socket.emit('playerRole', 'b');
        
        io.to(gameId).emit('boardState', game.chess.fen());
        io.to(gameId).emit('gameStarted');
    } else {
        socket.emit('spectator');
    }

    socket.on('disconnect', () => {
        const gameId = socket.gameId;
        if (gameId && games[gameId]) {
            const game = games[gameId];
            
            if (socket.id === game.players.white) {
                delete game.players.white;
            }
            if (socket.id === game.players.black) {
                delete game.players.black;
            }

            if (!game.players.white && !game.players.black) {
                delete games[gameId];
            } else {
                io.to(gameId).emit('playerLeft');
            }
        }
    });

    socket.on('move', (moveData) => {
        const gameId = socket.gameId;
        if (!gameId || !games[gameId]) {
            socket.emit('invalidMove');
            return;
        }

        const game = games[gameId];
        const chess = game.chess;

        try {
            if (chess.turn() === 'w' && socket.id !== game.players.white) {
                socket.emit('invalidMove');
                return;
            }
            if (chess.turn() === 'b' && socket.id !== game.players.black) {
                socket.emit('invalidMove');
                return;
            }
            
            const result = chess.move(moveData);

            if (result) {
                game.currentPlayer = chess.turn();
                io.to(gameId).emit('move', moveData);
                io.to(gameId).emit('boardState', chess.fen());
                
                if (chess.isCheckmate()) {
                    io.to(gameId).emit('checkmate', { winner: chess.turn() === 'w' ? 'black' : 'white' });
                } else if (chess.isCheck()) {
                    io.to(gameId).emit('check');
                }
            } else {
                console.log('Invalid move:', moveData);
                socket.emit('invalidMove', moveData);
            }
           
        } catch (error) {
            console.log(error);
            socket.emit('invalidMove');
        }
    });
});

server.listen(port, () => {
    console.log('listening on port:3000');
})

