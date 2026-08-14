/**
 * Chesself Minimax Engine - Position evaluation using piece values and minimax search
 *
 * A lightweight, self-contained chess AI using minimax with alpha-beta pruning.
 * Features:
 * - Piece value based position evaluation
 * - Minimax search with configurable depth
 * - Alpha-beta pruning for efficiency
 * - Opening book for early game
 */

const AI_CHARACTERS = {
    tutorial: {
        id: 'tutorial',
        name: 'Tutorial Terry',
        emoji: '🎓',
        difficulty: 'Tutorial',
        depth: 0,
        mistakeRate: 0,
        style: 'educational',
        description: 'Learn the basics',
        chat: {
            greeting: ["Welcome to chess! I'll show you the ropes.", "Let's learn together!"],
            move: ["That's a legal move!", "Good to practice here.", "See how the piece moves?"],
            win: ["You did it! Ready for a real challenge?", "Great job learning!"],
            lose: ["Don't worry, every expert was once a beginner.", "Try again - you'll get it!"]
        }
    },
    veryeasy: {
        id: 'veryeasy',
        name: 'Vinny the Villain',
        emoji: '😈',
        difficulty: 'Very Easy',
        depth: 1,
        mistakeRate: 0.4,
        style: 'chaotic',
        description: 'Unpredictable and blundering',
        chat: {
            greeting: ["Hehe, easy pickings!", "Let's see what you've got!"],
            move: ["Haha, nice try!", "Oops! Did I just...", "What's your next mistake?"],
            win: ["Too easy!", "GG! Maybe try an easier difficulty?", "Did you even try?"],
            lose: ["What?! Lucky shot!", "No way I lost to you!", "I wasn't even trying!"]
        }
    },
    easy: {
        id: 'easy',
        name: 'Eddie the Explorer',
        emoji: '🧭',
        difficulty: 'Easy',
        depth: 1,
        mistakeRate: 0.25,
        style: 'sacrificial',
        description: 'Adventurous, sacrifices for activity',
        chat: {
            greeting: ["Curious to play!", "Time for an adventure!"],
            move: ["Interesting move!", "Let's see where this goes...", "Exploring new paths!"],
            win: ["Adventure complete!", "My curiosity paid off!"],
            lose: ["Fascinating strategy!", "You've learned something I haven't!"]
        }
    },
    careful: {
        id: 'careful',
        name: 'Cautious Carl',
        emoji: '🛡️',
        difficulty: 'Careful',
        depth: 2,
        mistakeRate: 0.15,
        style: 'defensive',
        description: 'Protects king, slow but solid',
        chat: {
            greeting: ["Let me think...", "This could take a while..."],
            move: ["Hmm...", "Let me reconsider...", "Is this the best move?"],
            win: ["As expected.", "Caution is rewarded.", "I knew I should have done that."],
            lose: ["I knew it! I should have...", "My caution failed me.", "Wait, what happened?"]
        }
    },
    medium: {
        id: 'medium',
        name: 'Mighty Marvin',
        emoji: '💪',
        difficulty: 'Medium',
        depth: 2,
        mistakeRate: 0.05,
        style: 'positional',
        description: 'Controls center, builds networks',
        chat: {
            greeting: ["Ready for a challenge?", "Let's see how you fare!"],
            move: ["Not bad!", "Interesting choice.", "We'll see about that..."],
            win: ["Respectable effort!", "Not bad for a warmup!", "Almost had me there!"],
            lose: ["Well played!", "Impressive!", "You earned this one."]
        }
    },
    hard: {
        id: 'hard',
        name: 'Hardcore Harry',
        emoji: '🔥',
        difficulty: 'Hard',
        depth: 5,
        mistakeRate: 0.01,
        style: 'aggressive',
        description: 'Attacks relentlessly, seeks checkmate',
        chat: {
            greeting: ["You'll regret this.", "No mercy now."],
            move: ["Check.", "You can't handle this.", "Pathetic defense."],
            win: ["As expected.", "You never stood a chance.", "Back to training."],
            lose: ["Impossible!", "This... this cannot be!", "You've been training..."]
        }
    },
    impossible: {
        id: 'impossible',
        name: 'Impossible Ivan',
        emoji: '👑',
        difficulty: 'Impossible',
        depth: 7,
        mistakeRate: 0,
        style: 'tactical',
        description: 'Perfect calculation, trades, mating nets',
        chat: {
            greeting: ["Futile.", "You will fall."],
            move: ["...", "Check.", "Indeed."],
            win: ["Futile.", "As predicted.", "The outcome was certain."],
            lose: ["...", "Impossible.", "Unexpected."]
        }
    }
};

class ChessAI {
    constructor() {
        // Feature weights for position evaluation
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
        this.currentCharacter = AI_CHARACTERS.medium;
        this.moveGenerator = null; // Set by game
    }

    setMoveGenerator(generatorFn) {
        this.moveGenerator = generatorFn;
    }

    setCharacter(characterId) {
        if (AI_CHARACTERS[characterId]) {
            this.currentCharacter = AI_CHARACTERS[characterId];
        }
    }

    getCharacter() {
        return this.currentCharacter;
    }

    getChat(type) {
        const lines = this.currentCharacter.chat[type];
        return lines[Math.floor(Math.random() * lines.length)];
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
     * Quick move evaluation for ordering
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

    // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
    // Returns a score for move ordering (higher = better move)
    getMoveScore(move, board) {
        const piece = board[move.from.row][move.from.col];
        const captured = board[move.to.row][move.to.col];

        if (!captured) return 0;

        const victimScore = this.pieceValues[captured] || 0;
        const attackerScore = this.pieceValues[piece] || 0;

        // captures that win material are good, using small attackers to win big pieces is better
        return victimScore * 10 - attackerScore;
    }

    // Sort moves for better alpha-beta pruning (MVV-LVA + checks first)
    sortMoves(moves, board, turn) {
        return moves.sort((a, b) => {
            const aCaptured = board[a.to.row][a.to.col];
            const bCaptured = board[b.to.row][b.to.col];

            // Prioritize captures
            if (aCaptured && !bCaptured) return -1;
            if (!aCaptured && bCaptured) return 1;

            // Check if moves give check
            const aBoard = this.makeMoveCopy(board, a);
            const bBoard = this.makeMoveCopy(board, b);
            const aGivesCheck = this.isKingInCheck(aBoard, turn === 'w' ? 'b' : 'w');
            const bGivesCheck = this.isKingInCheck(bBoard, turn === 'w' ? 'b' : 'w');

            if (aGivesCheck && !bGivesCheck) return -1;
            if (!aGivesCheck && bGivesCheck) return 1;

            // MVV-LVA ordering for captures
            return this.getMoveScore(b, board) - this.getMoveScore(a, board);
        });
    }

    /**
     * Iterative deepening with alpha-beta pruning
     */
    selectBestMove(board, validMoves, turn, depth = 3) {
        if (validMoves.length === 0) return null;

        // Iterative deepening: search starting from depth 1 up to maxDepth
        let bestMove = validMoves[0];
        let bestScore = -Infinity;

        for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
            const result = this.minimaxRoot(board, validMoves, turn, currentDepth);
            if (result.move) {
                bestMove = result.move;
                bestScore = result.score;
            }
        }

        return bestMove;
    }

    minimaxRoot(board, validMoves, turn, depth) {
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        const alpha = -Infinity;
        const beta = Infinity;

        // Sort moves for better pruning
        const sortedMoves = this.sortMoves(validMoves, board, turn);

        if (turn === 'w') {
            for (const move of sortedMoves) {
                const newBoard = this.makeMoveCopy(board, move);

                if (this.isKingInCheck(newBoard, 'b')) {
                    // Checkmate in 1 - return immediately
                    return { move, score: 100000 };
                }

                const score = -this.minimax(newBoard, depth - 1, 'b', -beta, -alpha);

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        } else {
            for (const move of sortedMoves) {
                const newBoard = this.makeMoveCopy(board, move);

                if (this.isKingInCheck(newBoard, 'w')) {
                    return { move, score: 100000 };
                }

                const score = -this.minimax(newBoard, depth - 1, 'w', -beta, -alpha);

                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }

        return { move: bestMove, score: bestScore };
    }

    minimax(board, depth, turn, alpha, beta) {
        // Quiescence search at horizon - keep searching captures until quiet
        if (depth === 0) {
            return this.quiescenceSearch(board, turn, alpha, beta, 0);
        }

        const validMoves = this.moveGenerator ? this.moveGenerator(board, turn) : [];

        if (validMoves.length === 0) {
            if (this.isKingInCheck(board, turn)) {
                return turn === 'w' ? -10000 : 10000; // Checkmate
            }
            return 0; // Stalemate
        }

        // Move ordering for better pruning
        const sortedMoves = this.sortMoves(validMoves, board, turn);

        let bestScore = -Infinity;

        if (turn === 'w') {
            for (const move of sortedMoves) {
                const newBoard = this.makeMoveCopy(board, move);

                const score = -this.minimax(newBoard, depth - 1, 'b', -beta, -alpha);

                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);

                if (alpha >= beta) break; // Beta cutoff
            }
        } else {
            for (const move of sortedMoves) {
                const newBoard = this.makeMoveCopy(board, move);

                const score = -this.minimax(newBoard, depth - 1, 'w', -beta, -alpha);

                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);

                if (alpha >= beta) break;
            }
        }

        return bestScore === -Infinity ? 0 : bestScore;
    }

    // Quiescence search - only search captures and checks to avoid horizon effect
    quiescenceSearch(board, turn, alpha, beta, depth) {
        const standPat = this.evaluateBoardPosition(board, turn);

        if (depth >= 4) return standPat; // Max quiescence depth

        if (turn === 'w') {
            if (standPat > alpha) alpha = standPat;
            if (alpha >= beta) return beta;
        } else {
            if (standPat < beta) beta = standPat;
            if (alpha >= beta) return alpha;
        }

        // Get capture moves only
        const moves = this.moveGenerator ? this.moveGenerator(board, turn) : [];
        const captures = moves.filter(m => board[m.to.row][m.to.col] !== null);

        if (captures.length === 0) return standPat;

        // Sort captures by MVV-LVA
        const sortedCaptures = this.sortMoves(captures, board, turn);

        if (turn === 'w') {
            for (const move of sortedCaptures) {
                const newBoard = this.makeMoveCopy(board, move);
                const score = -this.quiescenceSearch(newBoard, 'b', -beta, -alpha, depth + 1);

                if (score > alpha) alpha = score;
                if (alpha >= beta) break;
            }
            return alpha;
        } else {
            for (const move of sortedCaptures) {
                const newBoard = this.makeMoveCopy(board, move);
                const score = -this.quiescenceSearch(newBoard, 'w', -beta, -alpha, depth + 1);

                if (score < beta) beta = score;
                if (alpha >= beta) break;
            }
            return beta;
        }
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

    // Get style multipliers for current character
    getStyleMultipliers() {
        const style = this.currentCharacter.style;
        const multipliers = {
            attackBonus: 1.0,     // Attacking enemy king
            checkBonus: 1.0,      // Giving check
            mobilityBonus: 1.0,    // Piece activity
            materialBonus: 1.0,    // Material counting
            kingSafety: 1.0,       // Protecting own king
            centerControl: 1.0,    // Center squares
            development: 1.0,       // Piece development
            tradeBonus: 1.0,         // Trading pieces
            edgeBonus: 1.0,          // Driving enemy king to edge
            rookCutBonus: 1.0         // Rook cutting off king escape
        };

        switch (style) {
            case 'aggressive':
                multipliers.attackBonus = 4.0;
                multipliers.checkBonus = 5.0;
                multipliers.mobilityBonus = 2.0;
                multipliers.materialBonus = 0.3;
                multipliers.kingSafety = 0.1; // Ignore own safety, go all out
                multipliers.edgeBonus = 3.0;   // Drive king to edge
                multipliers.rookCutBonus = 3.0; // Cut off escape squares
                break;
            case 'defensive':
                multipliers.kingSafety = 2.5;
                multipliers.materialBonus = 1.5;
                multipliers.attackBonus = 0.3;
                multipliers.mobilityBonus = 0.5;
                break;
            case 'positional':
                multipliers.centerControl = 2.0;
                multipliers.mobilityBonus = 1.5;
                multipliers.development = 1.5;
                multipliers.attackBonus = 0.5;
                break;
            case 'sacrificial':
                multipliers.mobilityBonus = 2.5;
                multipliers.attackBonus = 1.8;
                multipliers.materialBonus = 0.3;
                multipliers.development = 2.0;
                break;
            case 'tactical':
                multipliers.tradeBonus = 2.5;
                multipliers.materialBonus = 2.0;
                multipliers.checkBonus = 1.5;
                multipliers.kingSafety = 0.7;
                break;
            case 'chaotic':
                // Random-ish - reduce all strategic bonuses
                multipliers.attackBonus = 0.5;
                multipliers.checkBonus = 0.5;
                multipliers.mobilityBonus = 0.5;
                multipliers.materialBonus = 0.5;
                multipliers.kingSafety = 0.5;
                break;
            case 'educational':
            case 'balanced':
            default:
                // No changes - balanced evaluation
                break;
        }

        return multipliers;
    }

    evaluateBoardPosition(board, turn) {
        let whiteScore = 0;
        let blackScore = 0;

        const styleMult = this.getStyleMultipliers();
        const totalPieces = board.flat().filter(p => p).length;

        // Find king positions for attack detection
        let whiteKingPos = null, blackKingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece === 'K') whiteKingPos = [r, c];
                if (piece === 'k') blackKingPos = [r, c];
            }
        }

        // Count pieces for material evaluation
        let whiteMaterial = 0, blackMaterial = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                const isWhite = piece === piece.toUpperCase();
                const pieceType = piece.toLowerCase();
                let value = this.pieceValues[piece] || 0;
                let bonus = 0;

                // Track material
                if (isWhite) whiteMaterial += value;
                else blackMaterial += value;

                // Piece-specific positional bonuses
                switch (pieceType) {
                    case 'p': // Pawn
                        // Central control bonus (positional style)
                        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) {
                            bonus += 15 * styleMult.centerControl;
                        }
                        // Advanced pawn bonus (passed pawn potential)
                        if (isWhite) {
                            bonus += (6 - r) * 8;
                        } else {
                            bonus += (r - 1) * 8;
                        }
                        // Doubled pawn penalty
                        const pawnsOnFile = board.map(row => row[c]).filter(p => p && p.toLowerCase() === 'p').length;
                        if (pawnsOnFile > 1) bonus -= 15 * (pawnsOnFile - 1);
                        // Isolated pawn penalty
                        if (c > 0 && c < 7) {
                            const leftHasPawn = board[r][c-1]?.toLowerCase() === 'p';
                            const rightHasPawn = board[r][c+1]?.toLowerCase() === 'p';
                            if (!leftHasPawn && !rightHasPawn) bonus -= 20;
                        }
                        // Attack near enemy king (aggressive style)
                        if (blackKingPos && isWhite) {
                            const dist = Math.abs(r - blackKingPos[0]) + Math.abs(c - blackKingPos[1]);
                            if (dist <= 2) bonus += (3 - dist) * 20 * styleMult.attackBonus;
                        }
                        if (whiteKingPos && !isWhite) {
                            const dist = Math.abs(r - whiteKingPos[0]) + Math.abs(c - whiteKingPos[1]);
                            if (dist <= 2) bonus += (3 - dist) * 20 * styleMult.attackBonus;
                        }
                        break;

                    case 'n': // Knight
                        // Central positioning
                        const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
                        bonus += (7 - centerDist) * 10 * styleMult.centerControl;
                        // Outpost bonus
                        if (r >= 2 && r <= 5 && c >= 2 && c <= 5) bonus += 20 * styleMult.centerControl;
                        // Attack near enemy king
                        if (blackKingPos && isWhite) {
                            const dist = Math.abs(r - blackKingPos[0]) + Math.abs(c - blackKingPos[1]);
                            if (dist <= 2) bonus += (3 - dist) * 30 * styleMult.attackBonus;
                        }
                        if (whiteKingPos && !isWhite) {
                            const dist = Math.abs(r - whiteKingPos[0]) + Math.abs(c - whiteKingPos[1]);
                            if (dist <= 2) bonus += (3 - dist) * 30 * styleMult.attackBonus;
                        }
                        break;

                    case 'b': // Bishop
                        // Central control
                        const bishopCenter = Math.abs(3.5 - r) + Math.abs(3.5 - c);
                        bonus += (7 - bishopCenter) * 8 * styleMult.centerControl;
                        // Bishop pair bonus
                        break;

                    case 'r': // Rook
                        // Open file bonus
                        const fileClear = board.every(row => row[c] === null || row[c].toLowerCase() === 'r');
                        if (fileClear) bonus += 30 * styleMult.centerControl;
                        // 7th rank attacking bonus
                        if ((isWhite && r === 1) || (!isWhite && r === 6)) bonus += 25 * styleMult.attackBonus;
                        // Attack near enemy king
                        if (blackKingPos && isWhite) {
                            const dist = Math.abs(r - blackKingPos[0]) + Math.abs(c - blackKingPos[1]);
                            if (dist <= 2) bonus += (3 - dist) * 25 * styleMult.attackBonus;
                        }
                        if (whiteKingPos && !isWhite) {
                            const dist = Math.abs(r - whiteKingPos[0]) + Math.abs(c - whiteKingPos[1]);
                            if (dist <= 2) bonus += (3 - dist) * 25 * styleMult.attackBonus;
                        }
                        break;

                    case 'q': // Queen
                        // Penalty for being attacked in opening (not developed)
                        if ((isWhite && r === 7) || (!isWhite && r === 0)) {
                            bonus -= 15 * styleMult.development;
                        }
                        // Attack near enemy king
                        if (blackKingPos && isWhite) {
                            const dist = Math.abs(r - blackKingPos[0]) + Math.abs(c - blackKingPos[1]);
                            if (dist <= 2) bonus += (3 - dist) * 20 * styleMult.attackBonus;
                        }
                        if (whiteKingPos && !isWhite) {
                            const dist = Math.abs(r - whiteKingPos[0]) + Math.abs(c - whiteKingPos[1]);
                            if (dist <= 2) bonus += (3 - dist) * 20 * styleMult.attackBonus;
                        }
                        break;

                    case 'k': // King
                        // King safety in middlegame (defensive style)
                        if (totalPieces > 10) {
                            // Middlegame: castled king is safer
                            if ((isWhite && r !== 7) || (!isWhite && r !== 0)) {
                                bonus -= 40 * styleMult.kingSafety; // Exposed king penalty
                            }
                        } else {
                            // Endgame: king should move toward center
                            const kingCenter = Math.abs(3.5 - r) + Math.abs(3.5 - c);
                            bonus += (7 - kingCenter) * 20;
                        }
                        break;
                }

                if (isWhite) {
                    whiteScore += value + bonus;
                } else {
                    blackScore += value + bonus;
                }
            }
        }

        // Bishop pair bonus
        const whiteBishops = board.flat().filter(p => p === 'B').length;
        const blackBishops = board.flat().filter(p => p === 'b').length;
        if (whiteBishops >= 2) whiteScore += 35;
        if (blackBishops >= 2) blackScore += 35;

        // Check bonus: reward having opponent in check (aggressive style)
        const whiteInCheck = this.isKingInCheck(board, 'w');
        const blackInCheck = this.isKingInCheck(board, 'b');
        if (blackInCheck) whiteScore += 50 * styleMult.checkBonus; // White is checking black
        if (whiteInCheck) blackScore += 50 * styleMult.checkBonus; // Black is checking white

        // Mobility bonus (count legal moves available) - positional style
        const whiteMoves = this.estimateMobility(board, 'w');
        const blackMoves = this.estimateMobility(board, 'b');
        whiteScore += whiteMoves * 5 * styleMult.mobilityBonus;
        blackScore += blackMoves * 5 * styleMult.mobilityBonus;

        // Edge bonus: reward for driving enemy king to the edge (aggressive style)
        // King on edge (row 0 or 7, or col 0 or 7) is more vulnerable
        if (whiteKingPos) {
            const onEdge = whiteKingPos[0] === 0 || whiteKingPos[0] === 7 || whiteKingPos[1] === 0 || whiteKingPos[1] === 7;
            if (onEdge) blackScore += 80 * styleMult.edgeBonus; // Black is driving white king to edge
        }
        if (blackKingPos) {
            const onEdge = blackKingPos[0] === 0 || blackKingPos[0] === 7 || blackKingPos[1] === 0 || blackKingPos[1] === 7;
            if (onEdge) whiteScore += 80 * styleMult.edgeBonus; // White is driving black king to edge
        }

        // Rook cut bonus: rook on same rank/file as enemy king, cutting off escape
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;
                const isWhite = piece === piece.toUpperCase();
                if (piece.toLowerCase() === 'r') {
                    // Check if rook cuts off enemy king
                    if (whiteKingPos && !isWhite) {
                        // Black rook cutting off white king
                        if (r === whiteKingPos[0] || c === whiteKingPos[1]) {
                            blackScore += 50 * styleMult.rookCutBonus;
                        }
                    }
                    if (blackKingPos && isWhite) {
                        // White rook cutting off black king
                        if (r === blackKingPos[0] || c === blackKingPos[1]) {
                            whiteScore += 50 * styleMult.rookCutBonus;
                        }
                    }
                }
            }
        }

        // Material evaluation (tactical/chaotic styles)
        whiteScore = whiteScore * styleMult.materialBonus + whiteMaterial * 0.5;
        blackScore = blackScore * styleMult.materialBonus + blackMaterial * 0.5;

        const heuristic = whiteScore - blackScore;

        // Simple feature-based evaluation: encode board and apply weights
        const features = this.encodeBoard(board, turn, null, null);
        let featureScore = 0;
        const len = Math.min(features.length, this.weights.length);
        for (let i = 0; i < len; i++) {
            featureScore += features[i] * this.weights[i];
        }

        // Combine heuristic and feature-based evaluation
        const total = heuristic + featureScore * 5;
        return turn === 'w' ? total : -total;
    }

    estimateMobility(board, side) {
        let moves = 0;
        const opponent = side === 'w' ? 'b' : 'w';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;
                const isWhite = piece === piece.toUpperCase();
                if ((side === 'w' && !isWhite) || (side === 'b' && isWhite)) continue;

                const pt = piece.toLowerCase();
                if (pt === 'k') {
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) moves++;
                        }
                    }
                } else if (pt === 'n') {
                    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) moves++;
                    }
                } else if (pt === 'p') {
                    const dir = isWhite ? -1 : 1;
                    const nr = r + dir;
                    if (nr >= 0 && nr < 8) {
                        if (!board[nr][c]) moves++;
                        for (const dc of [-1, 1]) {
                            const nc = c + dc;
                            if (nc >= 0 && nc < 8 && board[nr][nc] &&
                                ((isWhite && board[nr][nc] === board[nr][nc].toUpperCase()) ||
                                 (!isWhite && board[nr][nc] !== board[nr][nc].toUpperCase()))) {
                                moves++;
                            }
                        }
                    }
                } else {
                    // Sliding pieces
                    const dirs = [];
                    if (pt === 'b' || pt === 'q') dirs.push(...[[-1,-1],[-1,1],[1,-1],[1,1]]);
                    if (pt === 'r' || pt === 'q') dirs.push(...[[-1,0],[1,0],[0,-1],[0,1]]);
                    for (const [dr, dc] of dirs) {
                        let nr = r + dr, nc = c + dc;
                        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            moves++;
                            if (board[nr][nc]) break;
                            nr += dr;
                            nc += dc;
                        }
                    }
                }
            }
        }
        return moves;
    }

     /**
      * Get the best move for the current position
      */
     getMove(board, validMoves, turn) {
         this.moveHistory.push({ board: JSON.stringify(board), turn });

         const character = this.currentCharacter;

         // Tutorial mode - AI doesn't move
         if (character.depth === 0) {
             return null;
         }

         // Use opening book for early game (only for harder difficulties)
         if (character.mistakeRate < 0.2 && this.moveHistory.length <= 3) {
             const bookMove = this.getOpeningBookMove(validMoves);
             if (bookMove) return bookMove;
         }

         // Select best move using minimax with character's depth
         const bestMove = this.selectBestMove(board, validMoves, turn, character.depth);

         // Apply mistake rate - sometimes pick a random move instead
         if (Math.random() < character.mistakeRate && validMoves.length > 1) {
             const randomIndex = Math.floor(Math.random() * validMoves.length);
             return validMoves[randomIndex];
         }

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

    getCharacterInfo() {
        return this.currentCharacter;
    }
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessAI;
}