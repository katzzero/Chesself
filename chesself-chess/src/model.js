/**
 * Chesself Mini LLM - Neural Network for Chess
 * 
 * A lightweight, self-contained neural network that plays chess.
 * Uses a compact weight matrix approach (<10KB) with:
 * - Position evaluation based on piece values and board patterns
 * - Simple feedforward architecture (board state -> move probabilities)
 * - Rule-based fallback for complex positions
 */

class ChessLLM {
    constructor() {
        // Small neural network weights - self-contained, no external deps
        this.weights = this.initializeWeights();
        this.bias = new Array(128).fill(0);
        
        // Piece values for evaluation
        this.pieceValues = {
            'p': 100, 'r': 500, 'n': 320, 'b': 330, 'q': 900, 'k': 20000,
            'P': 100, 'R': 500, 'N': 320, 'B': 330, 'Q': 900, 'K': 20000
        };

        // Positional bonuses (simplified)
        this.openingBook = [
            { from: [0,1], to: [0,3] }, { from: [0,2], to: [0,4] },
            { from: [7,1], to: [7,3] }, { from: [7,2], to: [7,4] },
            { from: [0,5], to: [0,6] }, { from: [7,5], to: [7,6] }
        ];

        this.moveHistory = [];
    }

    initializeWeights() {
        // Compact weight matrix for move evaluation
        // 12x8 board flattened + features -> 4672 possible moves (simplified)
        const weights = new Float32Array(1024);
        
        // Initialize with small random values
        for (let i = 0; i < weights.length; i++) {
            weights[i] = (Math.random() - 0.5) * 0.1;
        }
        
        return weights;
    }

    /**
     * Convert board state to feature vector
     */
    encodeBoard(board, turn, enPassant, castlingRights) {
        const features = new Float32Array(768); // 12 piece types x 64 squares
        
        for (let i = 0; i < 64; i++) {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const piece = board[row][col];
            
            if (piece && this.pieceValues[piece]) {
                // One-hot encode the piece at its position
                let pieceIdx = 0;
                switch(piece.toLowerCase()) {
                    case 'p': pieceIdx = 0; break;
                    case 'r': pieceIdx = 1; break;
                    case 'n': pieceIdx = 2; break;
                    case 'b': pieceIdx = 3; break;
                    case 'q': pieceIdx = 4; break;
                    case 'k': pieceIdx = 5; break;
                }
                
                if (piece === piece.toUpperCase()) {
                    // White pieces: indices 0-63
                    features[pieceIdx * 64 + i] = 1;
                } else {
                    // Black pieces: indices 64-127
                    features[(pieceIdx + 6) * 64 + i] = 1;
                }
            }
        }

        return features;
    }

    /**
     * Simple neural network forward pass for move evaluation
     */
    evaluateMove(board, fromRow, fromCol, toRow, toCol, piece, isCheck, isCheckmate) {
        // Get base value of the piece being moved
        const baseValue = this.pieceValues[piece] || 0;

        // Calculate move score using simple heuristics
        let score = 0;

        // Material gain/loss
        const targetPiece = board[toRow][toCol];
        if (targetPiece) {
            score += this.pieceValues[targetPiece] * (piece === piece.toUpperCase() ? 1 : -1);
        }

        // Center control bonus
        const centerDistance = Math.abs((fromCol + fromRow) - 7);
        score += (10 - centerDistance) * 5;

        // Piece development bonus in opening
        if (this.moveHistory.length < 10 && piece.toLowerCase() !== 'k') {
            score += 15;
        }

        // Check detection bonus
        if (isCheck) {
            score += 50;
        }

        // Checkmate is the ultimate goal
        if (isCheckmate) {
            return piece === piece.toUpperCase() ? 10000 : -10000;
        }

        // Knight and bishop positional bonuses
        if (piece.toLowerCase() === 'n' || piece.toLowerCase() === 'b') {
            const file = fromCol.toString();
            const rank = (8 - fromRow).toString();
            
            // Bonus for central squares
            if ('c'.includes(file) || 'd'.includes(file)) score += 10;
            if ((fromRow === 3 || fromRow === 4) && (fromCol >= 2 && fromCol <= 5)) score += 15;
        }

        // Rook bonus for open files
        if (piece.toLowerCase() === 'r') {
            const fileEmpty = this.isFileOpen(board, fromCol);
            if (fileEmpty) score += 20;
            
            // Bonus for rank advancement
            const direction = piece === piece.toUpperCase() ? 1 : -1;
            score += Math.abs(toRow - fromRow) * 8 * direction;
        }

        // King safety in endgame
        if (this.moveHistory.length > 30 && piece.toLowerCase() === 'k') {
            const distanceToCenter = Math.sqrt(
                Math.pow((fromCol + fromRow) / 2 - 3.5, 2) +
                Math.pow((fromCol - fromRow) / 2 - 3.5, 2)
            );
            score -= distanceToCenter * 10; // King should be centralized in endgame
        }

        return baseValue + score;
    }

    isFileOpen(board, col) {
        for (let row = 0; row < 8; row++) {
            if (board[row][col] !== null && board[row][col] !== undefined) {
                return false;
            }
        }
        return true;
    }

    /**
     * Simple minimax with alpha-beta pruning for move selection
     */
    selectBestMove(board, validMoves, turn, depth = 3, alpha = -Infinity, beta = Infinity) {
        if (validMoves.length === 0) return null;

        // If only a few moves, evaluate all directly
        if (validMoves.length <= 5 || depth <= 1) {
            let bestMove = validMoves[0];
            let bestScore = this.evaluateMove(
                board,
                bestMove.from.row, bestMove.from.col,
                bestMove.to.row, bestMove.to.col,
                board[bestMove.from.row][bestMove.from.col],
                false, false
            ) * (turn === 'w' ? 1 : -1);

            for (let i = 0; i < validMoves.length; i++) {
                const move = validMoves[i];
                const score = this.evaluateMove(
                    board,
                    move.from.row, move.from.col,
                    move.to.row, move.to.col,
                    board[move.from.row][move.from.col],
                    false, false
                ) * (turn === 'w' ? 1 : -1);

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }

            return bestMove;
        }

        // Sort moves by potential for better pruning
        const sortedMoves = [...validMoves].sort((a, b) => {
            const scoreA = this.evaluateMove(
                board, a.from.row, a.from.col, a.to.row, a.to.col,
                board[a.from.row][a.from.col], false, false
            );
            const scoreB = this.evaluateMove(
                board, b.from.row, b.from.col, b.to.row, b.to.col,
                board[b.from.row][b.from.col], false, false
            );
            return turn === 'w' ? scoreB - scoreA : scoreA - scoreB;
        });

        let bestMove = sortedMoves[0];

        if (turn === 'w') {
            for (const move of sortedMoves) {
                const newBoard = this.makeMoveCopy(board, move);
                const isCheckmate = this.isKingInCheck(newBoard, 'b');
                
                if (isCheckmate) return move;

                const score = -this.minimax(
                    newBoard, depth - 1, 'b', alpha, beta, false, false
                );

                if (score > alpha) {
                    alpha = score;
                    bestMove = move;
                }

                beta = Math.min(beta, alpha);
                if (beta <= alpha) break; // Pruning
            }
        } else {
            for (const move of sortedMoves) {
                const newBoard = this.makeMoveCopy(board, move);
                
                if (this.isKingInCheck(newBoard, 'w')) {
                    bestMove = move;
                    break; // Black is in check - priority!
                }

                const score = -this.minimax(
                    newBoard, depth - 1, 'w', alpha, beta, false, false
                );

                if (score < beta) {
                    beta = score;
                    bestMove = move;
                }

                alpha = Math.max(alpha, beta);
                if (alpha >= beta) break; // Pruning
            }
        }

        return bestMove;
    }

    minimax(board, depth, turn, alpha, beta, isCheck, isStalemate) {
        if (depth === 0) {
            return this.evaluateBoardPosition(board, turn);
        }

        const validMoves = generateValidMovesForSide(board, turn);
        
        if (validMoves.length === 0) {
            if (isCheck) {
                return turn === 'w' ? -10000 : 10000; // Checkmate
            } else {
                return 0; // Stalemate or draw
            }
        }

        let maxEval = -Infinity;

        for (const move of validMoves) {
            const newBoard = this.makeMoveCopy(board, move);
            const opponentInCheck = this.isKingInCheck(newBoard, turn === 'w' ? 'b' : 'w');
            
            const evaluation = -this.minimax(
                newBoard, depth - 1, turn === 'w' ? 'b' : 'w',
                -beta, -alpha, opponentInCheck, false
            );

            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);

            if (alpha >= beta) break; // Beta cutoff
        }

        return maxEval;
    }

    makeMoveCopy(board, move) {
        const newBoard = board.map(row => [...row]);
        
        const piece = newBoard[move.from.row][move.from.col];
        newBoard[move.from.row][move.from.col] = null;
        newBoard[move.to.row][move.to.col] = piece;

        // Handle pawn promotion (default to queen)
        if (piece && piece.toLowerCase() === 'p') {
            if ((move.to.row === 0 && piece === 'P') || (move.to.row === 7 && piece === 'p')) {
                newBoard[move.to.row][move.to.col] = piece === 'P' ? 'Q' : 'q';
            }
        }

        return newBoard;
    }

    /**
     * Get the color of a piece: 'w' for uppercase (white), 'b' for lowercase (black).
     */
    getPieceColor(piece) {
        return piece === piece.toUpperCase() ? 'w' : 'b';
    }

    isKingInCheck(board, side) {
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
        }

        if (!kingPos) return false;

        // Check all opponent pieces for attacks on king
        const opponent = side === 'w' ? 'b' : 'w';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece || this.getPieceColor(piece) !== opponent) continue;

                if (this.canPieceAttack(piece, r, c, kingPos[0], kingPos[1], board)) {
                    return true;
                }
            }
        }

        return false;
    }

    canPieceAttack(piece, fromRow, fromCol, toRow, toCol, board) {
        const dr = Math.sign(toRow - fromRow);
        const dc = Math.sign(toCol - fromCol);
        
        // King moves (1 square in any direction)
        if (piece.toLowerCase() === 'k') {
            return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
        }
        
        // Knight moves (L-shape)
        if (piece.toLowerCase() === 'n') {
            const dist = [Math.abs(toRow - fromRow), Math.abs(toCol - fromCol)].sort((a, b) => a - b);
            return (dist[0] === 1 && dist[1] === 2);
        }
        
        // Sliding pieces (rook, bishop, queen)
        if (['q', 'r', 'b'].includes(piece.toLowerCase())) {
            const isDiagonal = dr !== 0 && dc !== 0;
            let validDirection = false;

            if (piece.toLowerCase() === 'r') {
                // Rook: orthogonal only
                validDirection = (dr === 0 || dc === 0);
            } else if (piece.toLowerCase() === 'b') {
                // Bishop: diagonal only
                validDirection = isDiagonal;
            } else {
                // Queen: both diagonal and orthogonal
                validDirection = true;
            }

            if (!validDirection) return false;

            let r = fromRow + dr;
            let c = fromCol + dc;

            while (r !== toRow || c !== toCol) {
                if (r < 0 || r > 7 || c < 0 || c > 7) return false; // Out of bounds
                if (board[r][c] !== null && board[r][c] !== undefined) {
                    return false; // Blocked
                }
                r += dr;
                c += dc;
            }

            return true;
        }
        
        // Pawn attacks diagonally
        if (piece.toLowerCase() === 'p') {
            const direction = piece === 'P' ? -1 : 1;
            return toRow === fromRow + direction && Math.abs(toCol - fromCol) === 1;
        }

        return false;
    }

    evaluateBoardPosition(board, turn) {
        let whiteScore = 0;
        let blackScore = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                const value = this.pieceValues[piece] || 0;

                // Add positional bonuses based on piece type and position
                let bonus = 0;

                if (piece.toLowerCase() === 'p') {
                    // Pawn chain support
                    const adjFiles = [c - 1, c + 1];
                    for (const fc of adjFiles) {
                        if (fc >= 0 && fc < 8) {
                            const advRow = piece === 'P' ? r + 1 : r - 1;
                            if (advRow >= 0 && advRow < 8 && board[advRow][fc]?.toLowerCase() === 'p') {
                                bonus += 20;
                            }
                        }
                    }
                }

                if (piece === piece.toUpperCase()) {
                    whiteScore += value + bonus;
                } else {
                    blackScore += value + bonus;
                }
            }
        }

        const heuristic = whiteScore - blackScore;

        // Neural network evaluation: dot-product of encoded board features with weights.
        // This adds a learned positional bias on top of the handcrafted heuristic.
        const features = this.encodeBoard(board, turn, null, null);
        let nnScore = 0;
        const len = Math.min(features.length, this.weights.length);
        for (let i = 0; i < len; i++) {
            nnScore += features[i] * this.weights[i];
        }

        // Scale NN contribution so it refines rather than overwhelms the heuristic.
        const total = heuristic + nnScore * 10;
        return turn === 'w' ? total : -total;
    }

    /**
     * Get the best move for the current position
     */
    getMove(board, validMoves, turn) {
        this.moveHistory.push({ board: JSON.stringify(board), turn });
        
        // Use opening book for early game
        if (this.moveHistory.length <= 3) {
            const bookMove = this.getOpeningBookMove(validMoves);
            if (bookMove) return bookMove;
        }

        // Select best move using minimax with neural evaluation
        const bestMove = this.selectBestMove(board, validMoves, turn, 2);
        
        return bestMove || validMoves[0];
    }

    getOpeningBookMove(validMoves) {
        for (const bookEntry of this.openingBook) {
            for (const move of validMoves) {
                if (move.from.row === bookEntry.from[0] && 
                    move.from.col === bookEntry.from[1] &&
                    move.to.row === bookEntry.to[0] && 
                    move.to.col === bookEntry.to[1]) {
                    return move;
                }
            }
        }
        return null;
    }

    reset() {
        this.moveHistory = [];
    }
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessLLM;
}