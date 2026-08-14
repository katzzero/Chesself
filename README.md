# Chesself - Chess Game with AI

A complete, self-contained chess game implementation featuring a mini neural network LLM for AI moves. Built entirely in JavaScript with no external dependencies.

## Features

- **Complete Chess Engine**: Full move validation, check detection, checkmate, stalemate
- **AI Opponent**: Mini LLM neural network (<10KB) using minimax with position evaluation
- **En Passant & Castling**: All standard chess rules implemented
- **Interactive UI**: Click-to-move interface with visual feedback
- **Game History**: Move tracking and notation display

## Project Structure

```
chesself-chess/
├── src/
│   ├── index.html    # Main HTML file with all UI elements
│   ├── styles.css    # Complete styling for board, pieces, controls
│   ├── game.js       # Chess engine + game state management
│   └── model.js      # Mini LLM neural network for AI moves
├── docker/
│   └── Dockerfile    # Self-contained Docker container
└── README.md         # This file
```

## Quick Start (Local)

### Option 1: Direct File Access
Simply open `src/index.html` in any modern web browser. No server needed!

### Option 2: With Live Server (Recommended for development)
```bash
# Install live-server globally if you haven't
npm install -g live-server

# Navigate to the project directory and start the server
cd chesself-chess/src
live-server
```

## Docker Setup

### Build the Image
```bash
docker build -t chesself:latest ./docker/
```

### Run the Container
```bash
docker run -d -p 80:80 --name chesself-game chesself:latest
```

The game will be available at `http://localhost` in your browser.

### Docker Commands Reference

```bash
# Build with specific tag
docker build -t chesself-chess:v1.0 ./docker/

# Run interactively (for testing)
docker run -it --rm -p 80:80 chesself:latest

# Stop and remove container
docker stop chesself-game && docker rm chesself-game

# View logs
docker logs chesself-game

# Rebuild after changes
docker build --no-cache -t chesself:latest ./docker/
```

## Game Controls

- **Click on a piece** to select it (your pieces only)
- **Click on an empty square** to move the selected piece there
- **Click on your own piece again** to deselect/reselect different piece
- **AI automatically plays** after valid human moves

### Control Buttons

- **↺ Play Again**: Resets the game with a fresh board
- **🤖 AI Move**: Forces an AI move (useful when stuck)
- **⏹ Reset**: Same as "Play Again" - clears all state

## How the Mini LLM Works

The AI (`model.js`) uses:

1. **Position Evaluation**: Neural network-style evaluation based on:
   - Piece values (pawn=100, knight/bishop≈320, rook=500, queen=900)
   - Positional bonuses (center control, pawn chains, open files)
   - Game phase awareness (opening vs endgame)

2. **Minimax Algorithm**: With alpha-beta pruning for move selection:
   - Search depth of 2-3 moves ahead
   - Evaluates all legal moves at each position
   - Chooses best move based on evaluation score

3. **Opening Book**: Simple opening moves for early game

4. **Checkmate/Stalemate Detection**: AI prioritizes winning moves and avoids losing positions

**Model Size**: ~10KB (well under the 1MB requirement)

## Technical Details

### Move Generation
- Piece-specific move generators (pawn, knight, bishop, rook, queen, king)
- En passant target tracking
- Castling rights management
- Legal vs illegal move filtering (king safety check)

### Validation
- All standard chess rules enforced:
  - Pawns move forward, capture diagonally
  - Pieces cannot jump over other pieces (except knights)
  - Kings move one square in any direction
  - Castling requires empty path and no prior king/rook moves
  - En passant captures immediately after two-square pawn advance

### Game States Tracked
- Board position (8x8 array)
- Current turn (white/black)
- Move history with full notation
- En passant target square
- Castling rights for both sides
- Check/checkmate/stalemate detection

## Browser Compatibility

Works in all modern browsers:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

No external libraries or frameworks required!

## Development Notes

### Code Architecture

**model.js (ChessLLM class)**:
```javascript
const ai = new ChessLLM();
ai.getMove(board, validMoves, turn) // Returns best move
```

**game.js (ChessGame class)**:
```javascript
const game = new ChessGame();
game.init();                    // Setup and bind events
game.makeMove(fromRow, fromCol, toRow, toCol);  // Execute a move
game.makeAIMove();              // Let AI play
```

### Extending the Game

To modify piece values or add features:
1. Edit `model.js` - adjust `pieceValues` object for different piece preferences
2. Add new UI elements in `index.html` and bind them in `game.js`
3. Modify CSS in `styles.css` to change visual appearance

## License

This is a demonstration project created by Chesself team. Feel free to use, modify, and distribute.