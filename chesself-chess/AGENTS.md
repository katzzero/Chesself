# Chesself Chess - Agent Guidelines

## Critical: Bug History (Avoid These Mistakes)

### Board Corruption Bugs (FIXED ✅)
- **NEVER delete pieces** when updating castling rights (`game.js:517, 520`)
- Only modify `castlingRights` object, never touch the board during rights updates
- Split rook color checks into separate `if/else if` blocks to avoid cross-color bugs

### Castling Logic (FIXED ✅)
- Distinguish between kingside (`castlingSide: 'kingside'`) and queenside (`'queenside'`)
- Kingside path: squares f1/f8 → g1/g8, intermediate is g-square
- Queenside path: squares d1/d8, c1/c8, b1/b8, intermediate is c/d-squares
- Both sides have independent rights; don't clear both when one king moves

### AI Turn Logic (FIXED ✅)
- **Do NOT use `moveHistory.length` to detect whose turn it is** - this was broken
- Use `this.turn` property directly: `if (this.turn !== 'b') return` for human-only check
- The AI must move after each human move (when `turn === 'b'`)

### Array Indexing Bug (FIXED ✅)
- **NEVER use parentheses `()` for array indexing** - this causes syntax errors
- Use brackets: `features[...] = value`, not `features(value)`

## Development Commands

### Local Development
```bash
cd chesself-chess/src
open index.html  # Direct open, no server needed
# or
live-server .    # With hot reload
```

### Docker Deployment
```bash
cd chesself-chess/docker
docker build -t chesself:latest .
docker run -d -p 80:80 --name chesself-game chesself:latest
# Access at http://localhost
docker stop chesself-game && docker rm chesself-game  # Cleanup
```

### Docker Commands Reference
```bash
docker build --no-cache -t chesself-chess:v1.0 ./docker/
docker run -it --rm -p 80:80 chesself:latest  # Interactive session
docker logs chesself-game                      # Debug output
```

## Architecture Overview

### Core Files
- `src/index.html`      # UI container with board, controls, history
- `src/styles.css`      # All styling (board, pieces, animations)
- `src/game.js`         # Chess engine + game state + move validation
- `src/model.js`        # AI/LLM (minimax, evaluation, neural network style)

### Class Contracts
```javascript
// Initialize and start the game
const game = new ChessGame();
game.init();  // Sets up events, renders board

// Player makes a move
game.makeMove(fromRow, fromCol, toRow, toCol);

// Trigger AI response (after player moves)
game.makeAIMove();

// Manual trigger
game.reset();
```

### AI Class Contract
```javascript
const ai = new ChessLLM();
const bestMove = ai.getMove(boardState, validMoves, turn);
```

## Key Implementation Details

### Move Validation Rules
- Pawns: forward movement (1 square), 2 at start, diagonal capture, en passant
- Knights: L-shape jumps only
- Bishops: diagonal sliding until blocked/check
- Rooks: orthogonal sliding until blocked
- Queens: combine rook + bishop movement
- King: 1 square in any direction; special castling rules

### Special Moves
- **En Passant**: Target squares tracked globally; cleared after pawn moves
- **Castling**: 
  - Kingside: O-O, king e→g, rook h→f
  - Queenside: O-O-O, king e→c, rook a→d
  - Requires both pieces unmoved and path clear
  - King cannot move through or land on check

### Game States
- `check` - King is under attack (game continues)
- `checkmate` - Check with no legal moves GAME OVER
- `stalemate` - No legal moves but not in check DRAW
- `insufficientMaterial` - Both sides cannot win by rule (draw condition)

### Evaluation Model
- Piece values: pawn=100, knight/bishop=320, rook=500, queen=900, king=20000
- Center control bonus for early game pieces
- Pawn chains and structure bonuses
- Minimax depth 2-4 depending on complexity

## Testing Strategy

### Manual Play Test Checklist
1. Select all piece types (not just pawns) ✅ FIXED
2. Validate moves don't put own king in check
3. Castling works both sides, kingside/queenside
4. En passant triggers after double pawn advance
5. Promotion works (auto-queen for simplicity)
6. Checkmate detection ends game correctly
7. Stalemate detected when no legal moves exist

### Known Working Features ✅
- All piece selection and movement mechanics
- Standard move validation for all pieces
- Check/detecting checkmate/stalemate
- En passant capture
- Castling path validation (both sides)
- AI minimax with alpha-beta pruning

## Performance Notes
- **Model size**: ~10KB (well under 1MB requirement)
- **Minimax depth**: 2-3 plies = instant move selection
- **No external dependencies** - vanilla JS only
- **Browser compatible**: Chrome 60+, Firefox 55+, Safari 12+

## Common Pitfalls to Avoid

❌ Don't use `()` for array indexing in model.js  
✅ Use `[]` for all object property access patterns involving calculated indices

❌ Don't merge color-specific conditions with `||` inside single IF blocks  
✅ Split into separate conditional branches

❌ Don't detect turn via move count or pattern matching  
✅ Trust the game's built-in `turn` state variable

❌ Don't clear both players' castling rights on any king move  
✅ Only clear the side that actually moved a king or rook

❌ Don't assume hardcoded piece positions for castling path validation  
✅ Calculate paths based on whether it's kingside OR queenside
