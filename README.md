# Chesself - Chess Game with AI

A complete, self-contained chess game implementation featuring a Minimax engine for AI moves. Built entirely in JavaScript with no external dependencies.

## Features

- **Complete Chess Engine**: Full move validation, check detection, checkmate, stalemate
- **7 AI Opponents**: Each with unique play style (aggressive, defensive, positional, etc.)
- **Draw Rules**: 50-move rule, threefold repetition, insufficient material, stalemate
- **Game Persistence**: Auto-saves progress to localStorage
- **Interactive UI**: Click-to-move interface with visual feedback
- **Character Chat**: AI opponents talk via toast notifications

## Quick Start

### Option 1: Direct File Access
Open `src/index.html` in any modern web browser. No server needed!

### Option 2: With Live Server
```bash
cd src
live-server .
```

## Docker Setup

```bash
# Build
docker build -t chesself:latest ./docker/

# Run
docker run -d -p 80:80 --name chesself-game chesself:latest
```

Access at `http://localhost`

## AI Opponents

| Character | Difficulty | Style |
|-----------|-----------|-------|
| Tutorial Terry | Tutorial | Educational - highlights legal moves |
| Vinny the Villain | Very Easy | Chaotic, lots of blunders |
| Eddie the Explorer | Easy | Sacrificial, values activity over material |
| Cautious Carl | Careful | Defensive, protects king |
| Mighty Marvin | Medium | Positional, controls center |
| Hardcore Harry | Hard | Aggressive, attacks relentlessly |
| Impossible Ivan | Impossible | Perfect calculation |

## How the AI Works

The AI (`model.js`) uses:

1. **Minimax Algorithm** with alpha-beta pruning:
   - Configurable search depth (1-7 plies)
   - Iterative deepening for better move ordering
   - Quiescence search to avoid horizon effect

2. **Position Evaluation** based on:
   - Piece values (pawn=100, knight/bishop≈320, rook=500, queen=900)
   - Positional bonuses (center control, king safety, mobility)
   - Style-specific multipliers for personality

3. **MVV-LVA Move Ordering**: Prioritizes winning captures for better pruning

4. **Opening Book**: Simple opening moves for early game

## Technical Details

### Move Validation
- Pawns: forward movement, 2-step start, diagonal capture, en passant
- Knights: L-shape jumps
- Bishops/Rooks/Queens: Sliding movement
- King: 1 square any direction, castling
- Legal move filtering (cannot move into check)

### Game States
- Check, Checkmate, Stalemate detection
- Draw by 50-move rule, threefold repetition, insufficient material
- Castling rights tracking
- En passant target

## Browser Compatibility

- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+

No external libraries required!

## License

GNU GPL v3 - See LICENSE file
