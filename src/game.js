/**
 * Chesself - Main Game Engine
 *
 * Complete chess implementation with move validation, check detection,
 * AI integration via Minimax Alpha-Beta Pruning.
 */

class ChessGame {
    constructor() {
         this.board = [];
         this.turn = 'w'; // White starts
         this.selectedPiece = null;
         this.validMoves = [];
         this.moveHistory = [];
         this.gameOver = false;
         this.resultMessage = '';

         // Initialize the Minimax Engine
         this.ai = new ChessLLM();
         this.ai.setMoveGenerator((board, side) => this.getAllValidMovesForMinimax(board, side));

         // Game state tracking
         this.stats = {
             totalMoves: 0,
             aiMovesMade: 0,
             draws: 0
         };

         // En passant and castling tracking
         this.enPassantTarget = null;
         this.castlingRights = { w: true, b: true };

         // Draw rules tracking
          this.halfMoveClock = 0; // Half-moves since last pawn move or capture (for 50-move rule)
         this.positionHistory = []; // Position history for threefold repetition
         this.drawOffered = false; // Draw offer pending
    }

    // Save game to localStorage
    saveGame() {
         const saveData = {
              board: this.board,
              turn: this.turn,
              moveHistory: this.moveHistory,
              stats: this.stats,
              enPassantTarget: this.enPassantTarget,
              castlingRights: this.castlingRights,
              halfMoveClock: this.halfMoveClock,
              positionHistory: this.positionHistory,
              gameOver: this.gameOver,
              resultMessage: this.resultMessage,
              drawOffered: this.drawOffered,
              currentCharacterId: this.ai.getCharacter().id,
              characterStats: this.getCharacterStats()
         };
         localStorage.setItem('chesself_save', JSON.stringify(saveData));
    }

    // Load game from localStorage
    loadGame() {
         const saved = localStorage.getItem('chesself_save');
         if (!saved) return false;

         try {
             const data = JSON.parse(saved);
             this.board = data.board;
             this.turn = data.turn;
             this.moveHistory = data.moveHistory || [];
             this.stats = data.stats || { totalMoves: 0, aiMovesMade: 0, draws: 0 };
             this.enPassantTarget = data.enPassantTarget;
             this.castlingRights = data.castlingRights || { w: true, b: true };
             this.halfMoveClock = data.halfMoveClock || 0;
             this.positionHistory = data.positionHistory || [];
             this.gameOver = data.gameOver || false;
             this.resultMessage = data.resultMessage || '';
             this.drawOffered = data.drawOffered || false;

             if (data.currentCharacterId) {
                 this.ai.setCharacter(data.currentCharacterId);
             }
             if (data.characterStats) {
                 this.setCharacterStats(data.characterStats);
             }

             return true;
         } catch (e) {
             console.error('Failed to load save:', e);
             return false;
         }
    }

    // Clear saved game
    clearSavedGame() {
         localStorage.removeItem('chesself_save');
    }

    // Character stats management
    getCharacterStats() {
         const saved = localStorage.getItem('chesself_character_stats');
         if (saved) {
             return JSON.parse(saved);
         }
         // Initialize empty stats for all characters
         const stats = {};
         Object.keys(AI_CHARACTERS).forEach(id => {
             stats[id] = { played: 0, wins: 0, losses: 0, draws: 0 };
         });
         return stats;
    }

    setCharacterStats(stats) {
         localStorage.setItem('chesself_character_stats', JSON.stringify(stats));
    }

    updateCharacterStats(result) {
         const charId = this.ai.getCharacter().id;
         const stats = this.getCharacterStats();
         if (!stats[charId]) {
             stats[charId] = { played: 0, wins: 0, losses: 0, draws: 0 };
         }
         stats[charId].played++;
         if (result === 'win') stats[charId].wins++;
         else if (result === 'loss') stats[charId].losses++;
         else stats[charId].draws++;
         this.setCharacterStats(stats);
    }

    init() {
         this.showCharacterModal();
    }

    showCharacterModal() {
         const modal = document.getElementById('character-modal');
         const grid = document.getElementById('character-grid');

         grid.innerHTML = '';

         Object.values(AI_CHARACTERS).forEach(char => {
             const card = document.createElement('div');
             card.className = 'character-card';
             card.innerHTML = `
                 <div class="emoji">${char.emoji}</div>
                 <div class="name">${char.name}</div>
                 <div class="difficulty ${char.id}">${char.difficulty}</div>
                 <div class="description">${char.description}</div>
             `;
             card.addEventListener('click', () => this.selectCharacter(char.id));
             grid.appendChild(card);
         });

         modal.style.display = 'flex';
    }

    selectCharacter(characterId) {
         const character = AI_CHARACTERS[characterId];
         if (!character) return;

         this.ai.setCharacter(characterId);

         const modal = document.getElementById('character-modal');
         modal.style.display = 'none';

         this.updateOpponentDisplay();

         if (!this.loadGame()) {
             this.createBoard();
         }
         this.renderBoard();
         this.bindEvents();
         this.updateStatusDisplay();
         this.updateHistoryDisplay();

         setTimeout(() => {
             this.showToast(`${character.emoji} ${character.name} - ${character.greeting[0]}`, 3000, 'chat');
         }, 300);
    }

    updateOpponentDisplay() {
         const char = this.ai.getCharacter();
         document.getElementById('opponent-emoji').textContent = char.emoji;
         document.getElementById('opponent-name').textContent = char.name;

         const opponentEl = document.getElementById('current-opponent');
         if (this.gameOver) {
             opponentEl.classList.add('clickable');
             opponentEl.title = 'Click to change opponent';
         } else {
             opponentEl.classList.remove('clickable');
             opponentEl.title = '';
         }
    }

    createBoard() {
         // Initialize empty board
         for (let row = 0; row < 8; row++) {
             this.board[row] = new Array(8).fill(null);
         }

         // Place pieces - standard starting position
         const setup = [
             ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
             ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
             [null, null, null, null, null, null, null, null],
             [null, null, null, null, null, null, null, null],
             [null, null, null, null, null, null, null, null],
             [null, null, null, null, null, null, null, null],
             ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
             ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
         ];

         for (let r = 0; r < 8; r++) {
             for (let c = 0; c < 8; c++) {
                 this.board[r][c] = setup[r][c];
             }
         }

         this.turn = 'w';
    }

    renderBoard() {
        const tbody = document.querySelector('#chess-board tbody');
        tbody.innerHTML = '';

        // Render from rank 8 to rank 1 (top to bottom)
        for (let row = 0; row < 8; row++) {
            const tr = document.createElement('tr');
            
            for (let col = 0; col < 8; col++) {
                const td = document.createElement('td');
                const isLight = (row + col) % 2 === 0;
                td.className = isLight ? 'light' : 'dark';
                td.dataset.row = row;
                td.dataset.col = col;

                 // Add click handler for piece selection
                 td.addEventListener('click', () => this.onSquareClick(row, col));

                 const piece = this.board[row][col];
                if (piece) {
                    td.innerHTML = this.getPieceHtml(piece);
                }

                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }
    }

    getPieceHtml(piece) {
const pieceMap = {
              'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
              'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
         };

        const symbol = pieceMap[piece] || '';
        return `<span class="piece ${piece === piece.toUpperCase() ? 'white' : 'black'} movable">${symbol}</span>`;
    }

    bindEvents() {
         // Control buttons
         document.getElementById('play-again-btn').addEventListener('click', () => this.resetGame());
         document.getElementById('change-opponent-btn').addEventListener('click', () => {
             this.resetGame();
             this.showCharacterModal(true);
         });
         document.getElementById('reset-btn').addEventListener('click', () => this.resetBoard());

         // Click on opponent to change character (only when game is over)
         document.getElementById('current-opponent').addEventListener('click', () => {
             if (this.gameOver) {
                 this.resetGame();
                 this.showCharacterModal(true);
             }
         });
    }

    // Toast notification system
    showToast(message, duration = 3000, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; flex-direction: column; gap: 10px; align-items: center;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.95rem;
            max-width: 350px;
            text-align: center;
            animation: toastIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        // Type-specific styling
        if (type === 'chat') {
            toast.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            toast.style.color = 'white';
        } else if (type === 'win') {
            toast.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
            toast.style.color = 'white';
        } else if (type === 'lose') {
            toast.style.background = 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
            toast.style.color = 'white';
        } else {
            toast.style.background = 'rgba(30, 30, 30, 0.95)';
            toast.style.color = 'white';
        }

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Character chat message
    showCharacterChat(type) {
        if (this.gameOver) return;
        const chat = this.ai.getChat(type);
        if (chat) {
            const char = this.ai.getCharacter();
            this.showToast(`${char.emoji} ${chat}`, 3000, 'chat');
        }
    }

    onSquareClick(row, col) {
         if (this.gameOver) return;

         const piece = this.board[row][col];

         // If a piece is already selected
         if (this.selectedPiece) {
            // Check if clicked on same square - deselect
            if (this.selectedPiece.row === row && this.selectedPiece.col === col) {
                this.clearSelection();
                return;
            }

             // Check if clicking on own piece - select it instead
              if (piece && ((this.turn === 'w' && piece.toUpperCase() === piece) || 
                           (this.turn === 'b' && piece.toUpperCase() !== piece))) {
                 this.selectPiece(row, col);
                return;
            }

              // Try to make the move
               if (this.selectedPiece && this.isValidMove(row, col)) {
                   this.makeMove(this.selectedPiece.row, this.selectedPiece.col, row, col);
                   this.clearSelection();
                   
                  // Let AI play after human move
                 setTimeout(() => {
                     if (!this.gameOver) {
                         this.makeAIMove();
                      }
                  }, 100);
                } else {
                    // Invalid move - just deselect
                    this.clearSelection();
                }
            } else {
                  // Select a piece if it's our turn and it's our piece
                  if (piece && ((this.turn === 'w' && piece.toUpperCase() === piece) || 
                               (this.turn === 'b' && piece.toUpperCase() !== piece))) {
                     this.selectPiece(row, col);
                }
            }
        }

    selectPiece(row, col) {
         const piece = this.board[row][col];
         if (!piece) {
             this.clearSelection();
             return;
         }

         // Check it's the right turn
         const isWhiteTurn = this.turn === 'w';
         const isOurPiece = (isWhiteTurn && piece.toUpperCase() === piece) ||
                           (!isWhiteTurn && piece.toUpperCase() !== piece);

         if (!isOurPiece) {
             this.clearSelection();
             return;
         }

         this.clearSelection();
         this.selectedPiece = { row, col };

         // Highlight the selected square
         const td = document.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
         td.classList.add('highlight');

         // Calculate and show valid moves
         this.validMoves = this.getValidMoves(row, col);

         // Tutorial mode - special highlighting and tips
         const isTutorial = this.ai.getCharacter().depth === 0;

         this.validMoves.forEach(move => {
             const targetTd = document.querySelector(`td[data-row="${move.to.row}"][data-col="${move.to.col}"]`);
             if (targetTd) {
                 if (isTutorial) {
                     targetTd.classList.add('tutorial-move');
                 } else {
                     targetTd.classList.add('valid-move');
                 }
             }
         });

         // Show tutorial tip for first move
         if (isTutorial && this.moveHistory.length === 0 && this.validMoves.length > 0) {
             setTimeout(() => {
                 this.showToast("🎓 Click a green square to move your piece!", 4000, 'info');
             }, 300);
         }
    }

    clearSelection() {
         this.selectedPiece = null;
         this.validMoves = [];

         // Remove highlights
         document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
         document.querySelectorAll('.valid-move').forEach(el => el.classList.remove('valid-move'));
    }

    getValidMoves(fromRow, fromCol) {
         const piece = this.board[fromRow][fromCol];
         if (!piece) return [];

         const moves = [];
         const isWhite = piece.toUpperCase() === piece;

         // Generate pseudo-legal moves based on piece type
         switch (piece.toLowerCase()) {
            case 'p':
                this.getPawnMoves(fromRow, fromCol, isWhite).forEach(m => moves.push(m));
                break;
            case 'r':
                this.getRookMoves(fromRow, fromCol, isWhite).forEach(m => moves.push(m));
                break;
            case 'n':
                this.getKnightMoves(fromRow, fromCol, isWhite).forEach(m => moves.push(m));
                break;
            case 'b':
                this.getBishopMoves(fromRow, fromCol, isWhite).forEach(m => moves.push(m));
                break;
            case 'q':
                this.getQueenMoves(fromRow, fromCol, isWhite).forEach(m => moves.push(m));
                break;
            case 'k':
                this.getKingMoves(fromRow, fromCol, isWhite).forEach(m => moves.push(m));
                 // Castling checks – validate each side independently
                 if (this.canCastle(isWhite, 'kingside')) {
                    const ksMoves = this.getCastlingMoves(fromRow, fromCol, isWhite, 'kingside');
                    ksMoves.forEach(m => moves.push(m));
                }
                if (this.canCastle(isWhite, 'queenside')) {
                    const qsMoves = this.getCastlingMoves(fromRow, fromCol, isWhite, 'queenside');
                    qsMoves.forEach(m => moves.push(m));
                }
                break;
        }

// Filter to only legal moves (not leaving king in check)
          return moves.filter(move => {
             const testBoard = this.simulateMove(fromRow, fromCol, move.to.row, move.to.col);
             return !this.isKingInCheck(isWhite ? 'w' : 'b', testBoard);
          });
    }

    getPawnMoves(row, col, isWhite) {
         const moves = [];
         const direction = isWhite ? -1 : 1;
         const startRow = isWhite ? 6 : 1;
         
         // Forward move
         const oneStep = row + direction;
         if (oneStep >= 0 && oneStep <= 7 && !this.board[oneStep][col]) {
            moves.push({ from: { row, col }, to: { row: oneStep, col } });

             // Promotion check for single step
              if (oneStep === (isWhite ? 0 : 7)) {
                  moves[moves.length - 1].promotion = true;
             }

             // Two steps from starting position
             const twoStep = row + direction * 2;
             if (row === startRow && !this.board[twoStep][col]) {
                moves.push({ from: { row, col }, to: { row: twoStep, col } });
             }
        }

         // Diagonal captures
         for (const dc of [-1, 1]) {
            const newCol = col + dc;
            if (newCol < 0 || newCol > 7) continue;

            const targetRow = row + direction;
            const targetPiece = this.board[targetRow][newCol];

            // Regular capture
             if (targetPiece && ((isWhite && targetPiece.toUpperCase() !== targetPiece) || 
                                (!isWhite && targetPiece.toUpperCase() === targetPiece))) {
                moves.push({ from: { row, col }, to: { row: targetRow, col: newCol } });

                 // Promotion check for diagonal capture
                  if (targetRow === (isWhite ? 0 : 7)) {
                     moves[moves.length - 1].promotion = true;
                 }
            }

// En passant
              if (this.enPassantTarget) {
                 const [epRow, epCol] = this.enPassantTarget;
                 if (newCol === epCol && targetRow === epRow) {
                    moves.push({ from: { row, col }, to: { row: targetRow, col: newCol }, enPassant: true });
                }
             }
        }

         return moves;
    }

    getRookMoves(row, col, isWhite) {
         const moves = [];
         const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

         for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;

             while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const piece = this.board[r][c];

                if (!piece) {
                    moves.push({ from: { row, col }, to: { row: r, col: c } });
                } else {
                     // Can capture opponent piece
                     const isOpponent = ((isWhite && piece.toUpperCase() !== piece) || 
                                        (!isWhite && piece.toUpperCase() === piece));
                    if (isOpponent) {
                        moves.push({ from: { row, col }, to: { row: r, col: c } });
                    }
                    break; // Can't go beyond this square
                }

                r += dr;
                c += dc;
             }
        }

         return moves;
    }

    getKnightMoves(row, col, isWhite) {
         const moves = [];
         const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

         for (const [dr, dc] of offsets) {
            const r = row + dr;
            const c = col + dc;

             if (r < 0 || r > 7 || c < 0 || c > 7) continue;

             const piece = this.board[r][c];
              // Can move to empty square or capture opponent piece
             if (!piece || ((isWhite && piece.toUpperCase() !== piece) || 
                           (!isWhite && piece.toUpperCase() === piece))) {
                moves.push({ from: { row, col }, to: { row: r, col: c } });
            }
        }

         return moves;
    }

    getBishopMoves(row, col, isWhite) {
         const moves = [];
         const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

         for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;

             while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const piece = this.board[r][c];

                if (!piece) {
                    moves.push({ from: { row, col }, to: { row: r, col: c } });
                } else {
                     // Can capture opponent piece
                     const isOpponent = ((isWhite && piece.toUpperCase() !== piece) || 
                                        (!isWhite && piece.toUpperCase() === piece));
                    if (isOpponent) {
                        moves.push({ from: { row, col }, to: { row: r, col: c } });
                    }
                    break; // Can't go beyond this square
                }

                r += dr;
                c += dc;
             }
        }

         return moves;
    }

    getQueenMoves(row, col, isWhite) {
         // Queen combines rook and bishop moves
         return [...this.getRookMoves(row, col, isWhite), ...this.getBishopMoves(row, col, isWhite)];
    }

    getKingMoves(row, col, isWhite) {
         const moves = [];
         for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;

                const r = row + dr;
                const c = col + dc;

                 if (r < 0 || r > 7 || c < 0 || c > 7) continue;

                 const piece = this.board[r][c];
                 // Can move to empty or capture opponent
                if (!piece || ((isWhite && piece.toUpperCase() !== piece) || 
                              (!isWhite && piece.toUpperCase() === piece))) {
                    moves.push({ from: { row, col }, to: { row: r, col: c } });
                 }
            }
        }

         return moves;
    }

    canCastle(isWhite, castlingSide) {
        if (this.gameOver) return false;

        const hasCastlingRights = this.castlingRights[isWhite ? 'w' : 'b'];
        if (!hasCastlingRights) return false;

        // King position check
        const kingRow = isWhite ? 0 : 7;
        const king = this.board[kingRow][4];
        if (king !== (isWhite ? 'K' : 'k')) return false;

        // Check only the specific rook for the side being attempted
        const rookCol = castlingSide === 'kingside' ? 7 : 0;
        const rook = this.board[kingRow][rookCol];
        if (rook !== (isWhite ? 'R' : 'r')) return false;

        // Check path squares are empty and king doesn't pass through/end in check
        let pathSquares, passThroughCol, destinationCol;
        if (castlingSide === 'kingside') {
            // Kingside: king e1->g1, f-file must be empty
            pathSquares = [{ row: kingRow, col: 5 }];
            passThroughCol = 5;  // f-file (king passes through)
            destinationCol = 6;  // g-file (king ends here)
        } else {
            // Queenside: king e1->c1, b/c/d files must be empty
            pathSquares = [
                { row: kingRow, col: 1 },
                { row: kingRow, col: 2 },
                { row: kingRow, col: 3 }
            ];
            passThroughCol = 3;  // d-file (king passes through)
            destinationCol = 2;  // c-file (king ends here)
        }

        for (const sq of pathSquares) {
            if (this.board[sq.row][sq.col]) return false;
        }

        // Check king doesn't end in check at destination
        const testBoardDest = this.simulateKingCastle(isWhite, castlingSide);
        if (this.isKingInCheck(isWhite ? 'w' : 'b', testBoardDest)) return false;

        // Check king doesn't pass through check
        const testBoardPass = this.getBoardCopy();
        testBoardPass[kingRow][4] = null;
        testBoardPass[kingRow][passThroughCol] = isWhite ? 'K' : 'k';
        if (this.isKingInCheck(isWhite ? 'w' : 'b', testBoardPass)) return false;

        return true;
    }

    getCastlingMoves(row, col, isWhite, castlingSide) {
        const moves = [];
        const kingRow = row;

        // Kingside castling: king e->g (col 4->6), rook h->f (col 7->5)
        if (!castlingSide || castlingSide === 'kingside') {
           if (this.castlingRights[isWhite ? 'w' : 'b'] && this.board[kingRow][7] === (isWhite ? 'R' : 'r')) {
               moves.push({ from: { row, col }, to: { row: kingRow, col: 6 } });
           }
        }

        // Queenside castling: king e->c (col 4->2), rook a->d (col 0->3)
        if (!castlingSide || castlingSide === 'queenside') {
           if (this.castlingRights[isWhite ? 'w' : 'b'] && this.board[kingRow][0] === (isWhite ? 'R' : 'r')) {
               moves.push({ from: { row, col }, to: { row: kingRow, col: 2 } });
           }
        }

        return moves;
    }

    simulateKingCastle(isWhite, castlingSide) {
        const testBoard = this.getBoardCopy();
        const kingRow = isWhite ? 0 : 7;

        // Move king to the correct destination based on castling side
        const destCol = castlingSide === 'kingside' ? 6 : 2;
        testBoard[kingRow][4] = null;
        testBoard[kingRow][destCol] = isWhite ? 'K' : 'k';

        return testBoard;
    }

    isValidMove(toRow, toCol) {
         if (!this.selectedPiece) return false;

         return this.validMoves.some(m =>
            m.to.row === toRow && m.to.col === toCol
        );
     }

    makeMove(fromRow, fromCol, toRow, toCol, promotion = 'q', skipValidation = false) {
         const piece = this.board[fromRow][fromCol];
         if (!piece) return false;

         // Check if move is valid (skip for AI moves)
         if (!skipValidation) {
             const isValid = this.validMoves.some(m =>
                m.to.row === toRow && m.to.col === toCol
             );

             if (!isValid) return false;
         }

         // Handle en passant capture
         const move = this.validMoves.find(m =>
            m.to.row === toRow && m.to.col === toCol
         );

         if (move?.enPassant) {
             const capturedPawnRow = piece.toUpperCase() === 'P' ? toRow : fromRow;
             this.board[capturedPawnRow][toCol] = null;
         }

         // Capture target piece BEFORE making the move
         const capturedPiece = this.board[toRow][toCol];

         // Make the move
         this.board[toRow][toCol] = piece;
         this.board[fromRow][fromCol] = null;

          // Handle pawn promotion
          if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
             const promotedPiece = piece.toUpperCase() === 'P' ? promotion.toUpperCase() : promotion.toLowerCase();
             this.board[toRow][toCol] = promotedPiece;
          }

          // Update en passant target
          if (piece.toLowerCase() === 'p' && Math.abs(fromRow - toRow) === 2) {
             this.enPassantTarget = [toRow, fromCol];
          } else {
             this.enPassantTarget = null;
          }

          // Update castling rights (king or rook moves)
          if (piece === 'K') {
              this.castlingRights.w = false;
           } else if (piece === 'k') {
              this.castlingRights.b = false;
          }

          if (piece === 'R' && fromRow === 0 && fromCol === 0) {
             this.castlingRights.w = false;
          } else if (piece === 'r' && fromRow === 7 && fromCol === 0) {
             this.castlingRights.b = false;
          }

          if (piece === 'R' && fromRow === 0 && fromCol === 7) {
             this.castlingRights.w = false;
          } else if (piece === 'r' && fromRow === 7 && fromCol === 7) {
             this.castlingRights.b = false;
          }

// Record move in history
          const moveRecord = {
               piece,
               from: { row: fromRow, col: fromCol },
               to: { row: toRow, col: toCol },
               captured: capturedPiece || null,
               promotion: piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7) ? promotion : null
          };

          this.moveHistory.push(moveRecord);
          this.stats.totalMoves++;

          // Update half-move clock for 50-move rule
          if (piece.toLowerCase() === 'p' || capturedPiece) {
              this.halfMoveClock = 0;
          } else {
              this.halfMoveClock++;
          }

          // Record position for threefold repetition (before making move)
          this.recordPosition();

          // Handle draw offer acceptance - if draw was offered, accepting it now
          if (this.drawOffered) {
              this.gameOver = true;
              this.resultMessage = "Draw by agreement!";
              this.stats.draws++;
              this.updateStatusDisplay();
              this.renderBoard();
              return true;
          }

          // Switch turns
          this.turn = this.turn === 'w' ? 'b' : 'w';

          // Check game status
          this.checkGameStatus();

          // Update UI
          this.renderBoard();
          this.updateHistoryDisplay();
          this.saveGame();

          return true;
     }

    simulateMove(fromRow, fromCol, toRow, toCol) {
         const testBoard = this.getBoardCopy();
         const piece = testBoard[fromRow][fromCol];
         
         testBoard[toRow][toCol] = piece;
         testBoard[fromRow][fromCol] = null;

         return testBoard;
    }

    getBoardCopy() {
         return this.board.map(row => [...row]);
    }

    isKingInCheck(side, board) {
         // Find king position
         let kingPos = null;
         const kingChar = side === 'w' ? 'K' : 'k';

         for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === kingChar) {
                    kingPos = [r, c];
                    break;
                 }
            }
            if (kingPos) break;
        }

         if (!kingPos) return false;

         // Check all opponent pieces for attacks on king
         const opponent = side === 'w' ? 'b' : 'w';

         for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece || this.getPieceColor(piece) !== opponent) continue;

                if (this.canAttack(board, piece, r, c, kingPos[0], kingPos[1])) {
                    return true;
                 }
            }
        }

         return false;
    }

    getPieceColor(piece) {
         return piece === piece.toUpperCase() ? 'w' : 'b';
    }

    canAttack(board, piece, fromRow, fromCol, toRow, toCol) {
         const actualDr = toRow - fromRow;
         const actualDc = toCol - fromCol;
         const dr = Math.sign(actualDr);
         const dc = Math.sign(actualDc);

         // King attacks - must be within 1 square in any direction
         if (piece.toLowerCase() === 'k') {
            return Math.abs(actualDr) <= 1 && Math.abs(actualDc) <= 1;
         }

         // Knight attacks (L-shape) - must be exactly 2 squares in one direction and 1 in the other
         if (piece.toLowerCase() === 'n') {
            const dist = [Math.abs(actualDr), Math.abs(actualDc)].sort((a, b) => a - b);
            return dist[0] === 1 && dist[1] === 2;
         }

         // Sliding pieces (rook, bishop, queen)
         if (['r', 'b', 'q'].includes(piece.toLowerCase())) {
            const isDiagonal = dr !== 0 && dc !== 0;
            let validDirection = false;

            if (piece.toLowerCase() === 'r') {
                validDirection = dr === 0 || dc === 0;
            } else if (piece.toLowerCase() === 'b') {
                validDirection = isDiagonal;
            } else if (piece.toLowerCase() === 'q') {
                validDirection = true;
            }

             if (!validDirection) return false;

            // Check path is clear
             let r = fromRow + dr;
             let c = fromCol + dc;

             while (r !== toRow || c !== toCol) {
                if (r < 0 || r > 7 || c < 0 || c > 7) return false; // Out of bounds
                if (board[r][c]) return false; // Blocked
                r += dr;
                c += dc;
             }

             return true;
         }

         // Pawn attacks diagonally
         if (piece.toLowerCase() === 'p') {
            const direction = piece === 'P' ? -1 : 1;
            return actualDr === direction && Math.abs(actualDc) === 1;
         }

         return false;
     }

     // Generate a position string for repetition detection (simplified FEN without castling/en passant)
     getCurrentPosition() {
         let pos = '';
         for (let r = 0; r < 8; r++) {
             for (let c = 0; c < 8; c++) {
                 const piece = this.board[r][c];
                 pos += piece || '.';
             }
             pos += '/';
         }
         pos += this.turn;
         return pos;
     }

     // Record position for threefold repetition
     recordPosition() {
         const pos = this.getCurrentPosition();
         this.positionHistory.push(pos);
     }

     // Check for threefold repetition
     checkThreefoldRepetition() {
         const pos = this.getCurrentPosition();
         let count = 0;
         for (const p of this.positionHistory) {
             if (p === pos) count++;
         }
         return count >= 3;
     }

     // Check for insufficient material
     hasInsufficientMaterial() {
         let whitePieces = [];
         let blackPieces = [];
         let whiteCount = 0;
         let blackCount = 0;

         for (let r = 0; r < 8; r++) {
             for (let c = 0; c < 8; c++) {
                 const piece = this.board[r][c];
                 if (!piece) continue;
                 if (piece.toUpperCase() === piece) {
                     whitePieces.push(piece.toLowerCase());
                     whiteCount++;
                 } else {
                     blackPieces.push(piece.toLowerCase());
                     blackCount++;
                 }
             }
         }

         // King vs King
         if (whiteCount === 1 && blackCount === 1) return true;

         // King + minor piece vs King (K+N vs K or K+B vs K)
         if ((whiteCount === 1 && blackCount === 2) || (whiteCount === 2 && blackCount === 1)) {
             const smallSide = whiteCount === 1 ? whitePieces : blackPieces;
             if (smallSide.includes('n') || smallSide.includes('b')) return true;
         }

         // King + Bishop vs King + Bishop (same color squares - theoretical draw)
         if (whiteCount === 2 && blackCount === 2) {
             // Both sides have only king + bishop
             const whiteHasBishop = whitePieces.includes('b');
             const blackHasBishop = blackPieces.includes('b');
             if (whiteHasBishop && blackHasBishop) {
                 // Both have bishops - could be same color draw, but hard to detect without square color
                 // For simplicity, we'll allow this in future enhancement
             }
         }

         // King + 2 Knights vs King (insufficient to force checkmate)
         if ((whiteCount === 1 && blackCount === 3) || (whiteCount === 3 && blackCount === 1)) {
             const largeSide = whiteCount === 3 ? whitePieces : blackPieces;
             const smallSide = whiteCount === 1 ? whitePieces : blackPieces;
             if (largeSide.length === 2 && largeSide.includes('n') && smallSide.includes('k')) {
                 return true; // K+2N vs K is generally a draw
             }
         }

         return false;
     }

     // Offer a draw (vs AI: ends game immediately as draw since AI can't accept)
     offerDraw() {
         if (this.gameOver) return;
         this.gameOver = true;
         this.resultMessage = "DRAW by mutual agreement";
         this.stats.draws++;
         this.updateStatusDisplay();
         this.renderBoard();
         this.saveGame();
     }

     // Accept draw offer
     acceptDraw() {
         if (this.gameOver || !this.drawOffered) return false;
         this.gameOver = true;
         this.resultMessage = "Draw by agreement!";
         this.stats.draws++;
         this.drawOffered = false;
         this.updateStatusDisplay();
         this.renderBoard();
         return true;
     }

     checkGameStatus() {
         // Check for draw conditions first
         if (this.halfMoveClock >= 100) {
             this.gameOver = true;
             this.resultMessage = "DRAW - 50 moves without pawn move or capture!";
             this.stats.draws++;
             this.updateStatusDisplay();
             return;
         }

         if (this.checkThreefoldRepetition()) {
             this.gameOver = true;
             this.resultMessage = "DRAW - Same position 3 times!";
             this.stats.draws++;
             this.updateStatusDisplay();
             return;
         }

         if (this.hasInsufficientMaterial()) {
             this.gameOver = true;
             this.resultMessage = "DRAW - Neither side can checkmate!";
             this.stats.draws++;
             this.updateStatusDisplay();
             return;
         }

         const validMoves = this.getAllValidMoves(this.turn);

         if (validMoves.length === 0) {
            // No legal moves - checkmate or stalemate
            const isCheck = this.isKingInCheck(this.turn, this.board);

            if (isCheck) {
                // Checkmate!
                this.gameOver = true;
                const winner = this.turn === 'w' ? "Black" : "White";
                this.resultMessage = `CHECKMATE! ${winner} wins!`;

                // Update character stats
                if (winner === 'Black') {
                    // AI (Black) won
                    this.updateCharacterStats('loss');
                    setTimeout(() => this.showCharacterChat('win'), 500);
                } else {
                    // Player won
                    this.updateCharacterStats('win');
                    setTimeout(() => this.showCharacterChat('lose'), 500);
                }
            } else {
                // Stalemate - no moves but not in check
                this.gameOver = true;
                this.resultMessage = `STALEMATE - No moves available, not in check! DRAW.`;
                this.stats.draws++;
                this.updateCharacterStats('draw');
            }
         }

          // Always update status display to show checkmate/stalemate message
          this.updateStatusDisplay();
          this.updateOpponentDisplay();
     }

    getAllValidMoves(side) {
         const moves = [];

         for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (!piece) continue;

                const isCorrectColor = side === 'w' ? piece.toUpperCase() === piece : piece.toUpperCase() !== piece;

                if (isCorrectColor) {
                    // Temporarily set turn for move generation
                    const originalTurn = this.turn;
                    this.turn = side;

                    const pieceMoves = this.getValidMoves(r, c);
                    moves.push(...pieceMoves);

                    this.turn = originalTurn;
                }
            }
         }

         return moves;
    }

    // Wrapper for minimax - uses a copy of the board
    getAllValidMovesForMinimax(boardState, side) {
         const moves = [];

         for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                if (!piece) continue;

                const isCorrectColor = side === 'w' ? piece.toUpperCase() === piece : piece.toUpperCase() !== piece;

                if (isCorrectColor) {
                    const pieceMoves = this.getValidMovesForMinimax(boardState, r, c);
                    moves.push(...pieceMoves);
                }
            }
         }

         return moves;
    }

    // Get valid moves for a piece on a given board state (for minimax)
    getValidMovesForMinimax(boardState, fromRow, fromCol) {
         const piece = boardState[fromRow][fromCol];
         if (!piece) return [];

         const moves = [];
         const pieceType = piece.toLowerCase();
         const isWhite = piece === piece.toUpperCase();
         const toRow = isWhite ? fromRow - 1 : fromRow + 1;

         // Basic movement patterns
         switch (pieceType) {
             case 'p': // Pawn
                 // Forward move
                 if (this.canMove(boardState, fromRow, fromCol, toRow, fromCol, piece)) {
                     moves.push({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: fromCol } });
                     // Double move from starting position
                     const startRow = isWhite ? 6 : 1;
                     if (fromRow === startRow) {
                         const doubleRow = isWhite ? fromRow - 2 : fromRow + 2;
                         if (this.canMove(boardState, fromRow, fromCol, doubleRow, fromCol, piece)) {
                             moves.push({ from: { row: fromRow, col: fromCol }, to: { row: doubleRow, col: fromCol } });
                         }
                     }
                 }
                 // Captures
                 for (const dc of [-1, 1]) {
                     const captureCol = fromCol + dc;
                     if (captureCol >= 0 && captureCol <= 7) {
                         if (this.canCapture(boardState, fromRow, fromCol, toRow, captureCol, piece)) {
                             moves.push({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: captureCol } });
                         }
                     }
                 }
                 break;

             case 'n': // Knight
                 for (const dr of [-2, -1, 1, 2]) {
                     for (const dc of [-2, -1, 1, 2]) {
                         if (Math.abs(dr) === Math.abs(dc)) continue;
                         const nr = fromRow + dr;
                         const nc = fromCol + dc;
                         if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                             if (this.canMove(boardState, fromRow, fromCol, nr, nc, piece) ||
                                 this.canCapture(boardState, fromRow, fromCol, nr, nc, piece)) {
                                 moves.push({ from: { row: fromRow, col: fromCol }, to: { row: nr, col: nc } });
                             }
                         }
                     }
                 }
                 break;

             case 'b': // Bishop
             case 'r': // Rook
             case 'q': // Queen
                 const directions = [];
                 if (pieceType === 'b' || pieceType === 'q') {
                     directions.push(...[[-1,-1], [-1,1], [1,-1], [1,1]]);
                 }
                 if (pieceType === 'r' || pieceType === 'q') {
                     directions.push(...[[-1,0], [1,0], [0,-1], [0,1]]);
                 }
                 for (const [dr, dc] of directions) {
                     let nr = fromRow + dr;
                     let nc = fromCol + dc;
                     while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                         if (this.canMove(boardState, fromRow, fromCol, nr, nc, piece)) {
                             moves.push({ from: { row: fromRow, col: fromCol }, to: { row: nr, col: nc } });
                         }
                         if (this.canCapture(boardState, fromRow, fromCol, nr, nc, piece)) {
                             moves.push({ from: { row: fromRow, col: fromCol }, to: { row: nr, col: nc } });
                             break;
                         }
                         if (boardState[nr][nc]) break;
                         nr += dr;
                         nc += dc;
                     }
                 }
                 break;

             case 'k': // King
                 for (const dr of [-1, 0, 1]) {
                     for (const dc of [-1, 0, 1]) {
                         if (dr === 0 && dc === 0) continue;
                         const nr = fromRow + dr;
                         const nc = fromCol + dc;
                         if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                             if (this.canMove(boardState, fromRow, fromCol, nr, nc, piece) ||
                                 this.canCapture(boardState, fromRow, fromCol, nr, nc, piece)) {
                                 moves.push({ from: { row: fromRow, col: fromCol }, to: { row: nr, col: nc } });
                             }
                         }
                     }
                 }
                 break;
         }

         // Filter moves that would leave king in check
         return moves.filter(move => {
             const testBoard = boardState.map(row => [...row]);
             testBoard[move.to.row][move.to.col] = testBoard[move.from.row][move.from.col];
             testBoard[move.from.row][move.from.col] = null;
             return !this.isKingInCheckForSide(testBoard, isWhite ? 'w' : 'b');
         });
    }

    // Check if a move is valid (target square is empty)
    canMove(boardState, fromRow, fromCol, toRow, toCol, piece) {
         if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
         const target = boardState[toRow][toCol];
         return target === null;
    }

    // Check if a capture is valid
    canCapture(boardState, fromRow, fromCol, toRow, toCol, piece) {
         if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
         const target = boardState[toRow][toCol];
         if (!target) return false;
         const isWhite = piece === piece.toUpperCase();
         const targetIsWhite = target === target.toUpperCase();
         return isWhite !== targetIsWhite;
    }

    // Check if king is in check for a given side
    isKingInCheckForSide(boardState, side) {
         // Find king position
         let kingRow, kingCol;
         for (let r = 0; r < 8; r++) {
             for (let c = 0; c < 8; c++) {
                 const p = boardState[r][c];
                 if (p && p.toLowerCase() === 'k' && (side === 'w' ? p === 'K' : p === 'k')) {
                     kingRow = r;
                     kingCol = c;
                     break;
                 }
             }
         }

         if (kingRow === undefined) return false;

         // Check if any opponent piece can attack the king
         const opponent = side === 'w' ? 'b' : 'w';
         for (let r = 0; r < 8; r++) {
             for (let c = 0; c < 8; c++) {
                 const piece = boardState[r][c];
                 if (!piece) continue;
                 const isWhite = piece === piece.toUpperCase();
                 if (isWhite !== (opponent === 'w')) continue;

                 if (this.canPieceAttack(boardState, r, c, kingRow, kingCol, piece)) {
                     return true;
                 }
             }
         }
         return false;
    }

    // Simplified attack check for minimax (doesn't handle castling/en passant)
    canPieceAttack(boardState, fromRow, fromCol, toRow, toCol, piece) {
         const pieceType = piece.toLowerCase();
         const dr = toRow - fromRow;
         const dc = toCol - fromCol;
         const absDr = Math.abs(dr);
         const absDc = Math.abs(dc);

         switch (pieceType) {
             case 'p':
                 const isWhite = piece === piece.toUpperCase();
                 const pawnDir = isWhite ? -1 : 1;
                 return dr === pawnDir && absDc === 1;

             case 'n':
                 return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);

             case 'b':
                 if (absDr !== absDc) return false;
                 return this.isPathClear(boardState, fromRow, fromCol, toRow, toCol);

             case 'r':
                 if (dr !== 0 && dc !== 0) return false;
                 return this.isPathClear(boardState, fromRow, fromCol, toRow, toCol);

             case 'q':
                 if (dr !== 0 && dc !== 0 && absDr !== absDc) return false;
                 return this.isPathClear(boardState, fromRow, fromCol, toRow, toCol);

             case 'k':
                 return absDr <= 1 && absDc <= 1;
         }
         return false;
    }

    // Check if path is clear between two squares
    isPathClear(boardState, fromRow, fromCol, toRow, toCol) {
         const dr = Math.sign(toRow - fromRow);
         const dc = Math.sign(toCol - fromCol);
         let r = fromRow + dr;
         let c = fromCol + dc;

         while (r !== toRow || c !== toCol) {
             if (boardState[r][c]) return false;
             r += dr;
             c += dc;
         }
         return true;
    }

    updateStatusDisplay() {
         const statusEl = document.getElementById('game-status');
         const resultEl = document.getElementById('result-message');

         if (this.gameOver) {
            statusEl.textContent = 'Game Over';
            resultEl.textContent = this.resultMessage;
        } else {
            statusEl.textContent = `${this.turn === 'w' ? "White" : "Black"}'s turn`;
            resultEl.textContent = '';

             // Check for check warning
             const isInCheck = this.isKingInCheck(this.turn, this.board);
             if (isInCheck) {
                statusEl.style.color = '#ff6b6b';
            } else {
                statusEl.style.color = '';
            }
        }
    }

    updateHistoryDisplay() {
         const historyList = document.getElementById('history-list');
         historyList.innerHTML = '';

         for (let i = 0; i < this.moveHistory.length; i += 2) {
            const li = document.createElement('li');
            let moveText = `${Math.floor(i/2) + 1}. `;

            if (this.moveHistory[i]) {
                const whiteMove = this.formatMove(this.moveHistory[i]);
                moveText += whiteMove;
            }

             if (this.moveHistory[i + 1]) {
                const blackMove = this.formatMove(this.moveHistory[i + 1]);
                moveText += ` ${blackMove}`;
            }

             li.textContent = moveText.trim();
             historyList.appendChild(li);
        }

         document.getElementById('move-count').textContent = this.moveHistory.length;
    }

    formatMove(move) {
         const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
         const fromFile = files[move.from.col];
         const toFile = files[move.to.col];
         const fromRank = 8 - move.from.row;
         const toRank = 8 - move.to.row;

         let notation = '';

         // Add piece symbol (lowercase for black)
         const pieceChar = move.piece.toLowerCase() === 'p' ? '' : move.piece.toLowerCase();
         
         if (move.captured) {
            notation += `${pieceChar}${toFile}${toRank}×`;
         } else {
            notation += `${pieceChar}${toFile}${toRank}`;
        }

         if (move.promotion) {
            const promo = move.promotion.toLowerCase();
            notation += `=${promo.toUpperCase()}`;
        }

         return notation;
    }

    makeAIMove() {
         if (this.gameOver) return;

         // AI plays as Black — only proceed on Black's turn
         if (this.turn !== 'b') return;

         // Tutorial mode - AI doesn't move
         if (this.ai.getCharacter().depth === 0) {
             return;
         }

         const validMoves = this.getAllValidMoves(this.turn);

         if (validMoves.length === 0) return;

         // Use AI to select best move
         const aiMove = this.ai.getMove(this.board, validMoves, this.turn);

         if (aiMove) {
             setTimeout(() => {
                 // Handle promotion for pawns reaching back rank
                 let promotion = 'q';

                 if (aiMove.promotion) {
                     promotion = aiMove.promotion;
                 } else if ((this.turn === 'w' && aiMove.to.row === 0) ||
                           (this.turn === 'b' && aiMove.to.row === 7)) {
                     promotion = this.board[aiMove.from.row][aiMove.from.col].toUpperCase() === 'P' ? 'Q' : 'q';
                 }

                 this.makeMove(aiMove.from.row, aiMove.from.col, aiMove.to.row, aiMove.to.col, promotion, true);
                 this.stats.aiMovesMade++;

                 // Show character chat after AI move
                 if (!this.gameOver) {
                     this.showCharacterChat('move');
                 }

                 // Update status after AI move
                 setTimeout(() => {
                     if (!this.gameOver) {
                        const checkStatus = this.isKingInCheck(this.turn, this.board);
                        if (checkStatus) {
                            document.getElementById('game-status').textContent += ' - CHECK!';
                        }
                    }
                 }, 100);
             }, 200); // Small delay for dramatic effect
        }
    }

    resetGame() {
         this.createBoard();
         this.gameOver = false;
         this.resultMessage = '';
         this.moveHistory = [];
         this.selectedPiece = null;
         this.validMoves = [];
         this.enPassantTarget = null;
         this.castlingRights = { w: true, b: true };
         this.stats = { totalMoves: 0, aiMovesMade: 0, draws: 0 };
         this.halfMoveClock = 0;
         this.positionHistory = [];
         this.drawOffered = false;

         this.ai.reset();
         this.clearSavedGame();

         this.updateOpponentDisplay();
         this.renderBoard();
         this.updateHistoryDisplay();
         this.updateStatusDisplay();
    }

    resetBoard() {
         this.resetGame();
    }

    // Public methods for external access
    getBoardState() {
         return JSON.parse(JSON.stringify(this.board));
    }

    getMoveHistory() {
         return [...this.moveHistory];
    }

    isGameOver() {
         return this.gameOver;
    }

    getResultMessage() {
         return this.resultMessage;
    }

    getCurrentTurn() {
         return this.turn;
    }
}

// Helper function to generate all valid moves for a side (used by AI)
function generateValidMovesForSide(board, side) {
     const moves = [];

     for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;

            const isCorrectColor = side === 'w' ? piece.toUpperCase() === piece : piece.toUpperCase() !== piece;

             if (isCorrectColor) {
                // Generate pseudo-legal moves based on piece type
                switch (piece.toLowerCase()) {
                    case 'p':
                        const dir = side === 'w' ? -1 : 1;
                        const startRow = side === 'w' ? 6 : 1;

                         // Forward moves
                        const oneStep = r + dir;
                        if (oneStep >= 0 && oneStep <= 7 && !board[oneStep][c]) {
                            moves.push({ from: { row: r, col: c }, to: { row: oneStep, col: c } });

                             if (r === startRow) {
                                const twoStep = r + dir * 2;
                                if (!board[twoStep][c]) {
                                    moves.push({ from: { row: r, col: c }, to: { row: twoStep, col: c } });
                                }
                             }
                        }

                         // Captures
                        for (const dc of [-1, 1]) {
                            const nc = c + dc;
                            if (nc < 0 || nc > 7) continue;

                            const targetPiece = board[oneStep]?.[nc];
                            if (targetPiece && ((side === 'w' && targetPiece.toUpperCase() !== targetPiece) || 
                                                 (side === 'b' && targetPiece.toUpperCase() === targetPiece))) {
                                moves.push({ from: { row: r, col: c }, to: { row: oneStep, col: nc } });
                            }
                        }

                        break;

                    case 'r':
                        // Rook moves
                        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                            let nr = r + dr, nc = c + dc;
                             while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                                const targetPiece = board[nr][nc];

                                if (!targetPiece) {
                                    moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                } else {
                                     const isOpponent = (side === 'w' && targetPiece.toUpperCase() !== targetPiece) || 
                                                      (side === 'b' && targetPiece.toUpperCase() === targetPiece);

                                    if (isOpponent) {
                                        moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                    }
                                    break;
                                }

                                nr += dr;
                                nc += dc;
                             }
                        }
                        break;

                    case 'n':
                        // Knight moves
                        for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
                            const nr = r + dr, nc = c + dc;

                            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                                const targetPiece = board[nr][nc];

                                if (!targetPiece || ((side === 'w' && targetPiece.toUpperCase() !== targetPiece) || 
                                                     (side === 'b' && targetPiece.toUpperCase() === targetPiece))) {
                                    moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                }
                            }
                        }
                        break;

                    case 'b':
                        // Bishop moves
                        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                            let nr = r + dr, nc = c + dc;

                             while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                                const targetPiece = board[nr][nc];

                                if (!targetPiece) {
                                    moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                } else {
                                     const isOpponent = (side === 'w' && targetPiece.toUpperCase() !== targetPiece) || 
                                                      (side === 'b' && targetPiece.toUpperCase() === targetPiece);

                                    if (isOpponent) {
                                        moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                    }
                                    break;
                                }

                                nr += dr;
                                nc += dc;
                             }
                        }
                        break;

                    case 'q':
                        // Queen moves (rooks + bishops)
                        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                            let nr = r + dr, nc = c + dc;

                             while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                                const targetPiece = board[nr][nc];

                                if (!targetPiece) {
                                    moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                } else {
                                     const isOpponent = (side === 'w' && targetPiece.toUpperCase() !== targetPiece) || 
                                                      (side === 'b' && targetPiece.toUpperCase() === targetPiece);

                                    if (isOpponent) {
                                        moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                    }
                                    break;
                                }

                                nr += dr;
                                nc += dc;
                             }
                        }

                        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                            let nr = r + dr, nc = c + dc;

                             while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                                const targetPiece = board[nr][nc];

                                if (!targetPiece) {
                                    moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                } else {
                                     const isOpponent = (side === 'w' && targetPiece.toUpperCase() !== targetPiece) || 
                                                      (side === 'b' && targetPiece.toUpperCase() === targetPiece);

                                    if (isOpponent) {
                                        moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                    }
                                    break;
                                }

                                nr += dr;
                                nc += dc;
                             }
                        }
                        break;

                    case 'k':
                        // King moves (1 square in any direction)
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                if (dr === 0 && dc === 0) continue;

                                const nr = r + dr, nc = c + dc;

                                 if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                                    const targetPiece = board[nr][nc];

                                    if (!targetPiece || ((side === 'w' && targetPiece.toUpperCase() !== targetPiece) || 
                                                         (side === 'b' && targetPiece.toUpperCase() === targetPiece))) {
                                        moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                                    }
                                }
                            }
                        }

                        // Castling - inline path validation (standalone function, no this context)
                        const kingRow = side === 'w' ? 0 : 7;
                        const kingChar = side === 'w' ? 'K' : 'k';
                        const rookChar = side === 'w' ? 'R' : 'r';
                        if (r === kingRow && c === 4 && board[kingRow][4] === kingChar) {
                            // Kingside: f-file (col 5) must be empty, rook on h-file (col 7)
                            if (board[kingRow][7] === rookChar && !board[kingRow][5] && !board[kingRow][6]) {
                                moves.push({ from: { row: r, col: c }, to: { row: kingRow, col: 6 } });
                            }
                            // Queenside: b/c/d files (cols 1-3) must be empty, rook on a-file (col 0)
                            if (board[kingRow][0] === rookChar && !board[kingRow][1] && !board[kingRow][2] && !board[kingRow][3]) {
                                moves.push({ from: { row: r, col: c }, to: { row: kingRow, col: 2 } });
                            }
                        }
                        break;
                }
            }
        }

     return moves;
}
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    window.ChessGame = ChessGame;
}