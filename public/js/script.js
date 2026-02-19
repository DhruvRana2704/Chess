const socket = io();
const chess = new Chess();
const boardElement = document.querySelector('.board');
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let targetSource = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = '';

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement('div');
            squareElement.classList.add('square',
                ((rowIndex + squareIndex) % 2 == 0) ? 'light' : 'dark');

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', square.color == 'w' ? 'white' : 'black');
                pieceElement.innerHTML = getPieceUnicode(square.type);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener('dragstart', (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData('text/plain', "");
                    }
                })

                pieceElement.addEventListener('dragend', () => {
                    draggedPiece = null;
                    sourceSquare = null;
                    targetSource = null;
                })

                squareElement.appendChild(pieceElement)

            }
            squareElement.addEventListener('dragover', (e) => {
                e.preventDefault();
            })
            squareElement.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    targetSource = { row: parseInt(squareElement.dataset.row), col: parseInt(squareElement.dataset.col) };
                }
      
                handleMove(sourceSquare, targetSource);
            })
            boardElement.appendChild(squareElement);

        });
    });
    if (playerRole == 'b') {
        boardElement.classList.add("flipped")
    } else {
        boardElement.classList.remove("flipped")
    }
}

const getPieceUnicode = (type) => {
    const pieces = {
        'p': '&#9817;',
        'r': '&#9820;',
        'n': '&#9822;',
        'b': '&#9821;',
        'q': '&#9819;',
        'k': '&#9818;',
        'P': '&#9817;',
        'R': '&#9820;',
        'N': '&#9822;',
        'B': '&#9821;',
        'Q': '&#9819;',
        'K': '&#9818;'
    };
    return pieces[type] || '';
}

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q'
    }
    socket.emit('move', move);
}

// Socket event handlers
socket.on('playerRole', (role) => {
    playerRole = role;
    const roleText = role === 'w' ? 'White' : 'Black';
    console.log(`You are playing as: ${roleText}`);
    renderBoard();
});

socket.on('spectator', () => {
    playerRole = null;
    console.log('Spectating');
    renderBoard();
});

socket.on('gameStarted', () => {
    boardElement.classList.remove('waiting');
    alert('Opponent found! Game started!');
});

socket.on('boardState', (fen) => {
    boardElement.classList.remove('waiting');
    chess.load(fen);
    renderBoard();
});

socket.on('move', (move) => {
    chess.move(move);
    renderBoard();
});

socket.on('invalidMove', (move) => {
    alert('Invalid move!');
    renderBoard();
});

socket.on('check', () => {
    console.log('Check!');
    alert('Check!');
});

socket.on('checkmate', (data) => {
    console.log('Checkmate! Winner:', data.winner);
    alert(`Checkmate! ${data.winner.charAt(0).toUpperCase() + data.winner.slice(1)} wins!`);
});

socket.on('waitingForPlayers', () => {
    boardElement.classList.add('waiting');
    const waitingMessage = document.createElement('div');
    waitingMessage.classList.add('waiting-message');
    waitingMessage.innerHTML = '<h2>Waiting for another player...</h2>';
    boardElement.appendChild(waitingMessage);
});

socket.on('playerLeft', () => {
    alert('Your opponent has left the game');
    boardElement.classList.add('waiting');
});
