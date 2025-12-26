'use client';

import { motion } from 'framer-motion';

interface GameBoardProps {
  board: string[][] | null;
}

export function GameBoard({ board }: GameBoardProps) {
  if (!board) {
    return (
      <div className="board-container">
        <div className="board-placeholder">
          <span className="placeholder-text">Waiting for game to start...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="board-container">
      <motion.div 
        className="board-grid"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((letter, colIndex) => (
              <motion.div
                key={`${rowIndex}-${colIndex}`}
                className="letter-tile"
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ 
                  delay: (rowIndex * 4 + colIndex) * 0.08,
                  duration: 0.4,
                  type: "spring",
                  stiffness: 200
                }}
                whileHover={{ 
                  scale: 1.1, 
                  boxShadow: "0 8px 30px rgba(255, 200, 87, 0.4)" 
                }}
              >
                <span className="letter">
                  {letter === 'Q' ? 'Qu' : letter}
                </span>
                <span className="letter-points">{getLetterPoints(letter)}</span>
              </motion.div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function getLetterPoints(letter: string): number {
  const points: Record<string, number> = {
    'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
    'D': 2, 'G': 2,
    'B': 3, 'C': 3, 'M': 3, 'P': 3,
    'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
    'K': 5,
    'J': 8, 'X': 8,
    'Q': 10, 'Z': 10
  };
  return points[letter.toUpperCase()] || 1;
}

