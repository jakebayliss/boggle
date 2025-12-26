'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameState, SubmitWordResult } from '@/hooks/useSignalR';
import { GameBoard } from './GameBoard';

interface GameRoomProps {
  gameState: GameState;
  currentUsername: string | null;
  onLeaveRoom: () => Promise<void>;
  onStartGame: () => Promise<unknown>;
  onResetGame: () => Promise<unknown>;
  onSubmitWord: (word: string) => Promise<SubmitWordResult | null>;
}

export function GameRoom({ 
  gameState, 
  currentUsername,
  onLeaveRoom, 
  onStartGame, 
  onResetGame,
  onSubmitWord 
}: GameRoomProps) {
  const [wordInput, setWordInput] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(gameState.remainingSeconds);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);

  const currentPlayer = gameState.players.find(p => p.username === currentUsername);
  const isHost = currentPlayer?.isHost ?? false;

  useEffect(() => {
    setTimeLeft(gameState.remainingSeconds);
  }, [gameState.remainingSeconds]);

  // Countdown timer
  useEffect(() => {
    if (gameState.state !== 'InProgress' || timeLeft === null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.state, timeLeft]);

  const handleSubmitWord = async () => {
    if (!wordInput.trim() || gameState.state !== 'InProgress') return;
    
    const word = wordInput.trim().toUpperCase();
    if (submittedWords.includes(word)) {
      setWordInput('');
      return;
    }

    const result = await onSubmitWord(word);
    if (result?.success) {
      setSubmittedWords(prev => [...prev, word]);
    }
    setWordInput('');
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="game-room">
      {/* Header */}
      <header className="game-header">
        <div className="room-info">
          <h2 className="room-title">{gameState.roomName}</h2>
          <span className="room-code">Code: {gameState.roomId}</span>
        </div>
        <div className="header-actions">
          {gameState.state === 'InProgress' && (
            <div className={`timer ${timeLeft && timeLeft < 30 ? 'warning' : ''}`}>
              <span className="timer-icon">⏱</span>
              <span className="timer-value">{formatTime(timeLeft)}</span>
            </div>
          )}
          <button className="leave-btn" onClick={onLeaveRoom}>
            Leave Room
          </button>
        </div>
      </header>

      <div className="game-content">
        {/* Main Game Area */}
        <div className="game-main">
          {gameState.state === 'Waiting' && (
            <motion.div 
              className="waiting-area"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="waiting-message">
                <span className="waiting-icon">🎯</span>
                <h3>Waiting for players...</h3>
                <p>Share the room code with friends to join!</p>
                <div className="share-code">
                  <span className="code-display">{gameState.roomId}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(gameState.roomId)}
                  >
                    Copy
                  </button>
                </div>
              </div>
              {isHost && (
                <button 
                  className="start-game-btn"
                  onClick={onStartGame}
                  disabled={gameState.players.length < 1}
                >
                  Start Game
                </button>
              )}
              {!isHost && (
                <p className="waiting-host">Waiting for host to start the game...</p>
              )}
            </motion.div>
          )}

          {(gameState.state === 'InProgress' || gameState.state === 'Finished') && (
            <>
              <GameBoard board={gameState.board} />

              {gameState.state === 'InProgress' && (
                <div className="word-input-area">
                  <input
                    type="text"
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitWord()}
                    placeholder="Type a word..."
                    className="word-input"
                    autoFocus
                  />
                  <button 
                    className="submit-word-btn"
                    onClick={handleSubmitWord}
                    disabled={!wordInput.trim()}
                  >
                    Submit
                  </button>
                </div>
              )}

              {gameState.state === 'Finished' && (
                <motion.div 
                  className="game-over"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <h2>🏆 Game Over!</h2>
                  <div className="final-scores">
                    {[...gameState.players]
                      .sort((a, b) => b.score - a.score)
                      .map((player, index) => (
                        <div 
                          key={player.username} 
                          className={`final-score-item ${index === 0 ? 'winner' : ''}`}
                        >
                          <span className="rank">{index === 0 ? '👑' : `#${index + 1}`}</span>
                          <span className="name">{player.username}</span>
                          <span className="score">{player.score} pts</span>
                        </div>
                      ))}
                  </div>
                  {isHost && (
                    <button className="play-again-btn" onClick={onResetGame}>
                      Play Again
                    </button>
                  )}
                </motion.div>
              )}
            </>
          )}

          {/* Submitted Words */}
          {gameState.state === 'InProgress' && submittedWords.length > 0 && (
            <div className="submitted-words">
              <h4>Your Words ({submittedWords.length})</h4>
              <div className="words-list">
                {submittedWords.map((word, i) => (
                  <span key={i} className="word-chip">{word}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Players */}
        <aside className="players-sidebar">
          <h3>Players ({gameState.players.length}/8)</h3>
          <div className="players-list">
            {gameState.players.map((player) => (
              <motion.div
                key={player.username}
                className={`player-card ${player.isHost ? 'host' : ''}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="player-info">
                  <span className="player-avatar">
                    {player.username.charAt(0).toUpperCase()}
                  </span>
                  <span className="player-name">
                    {player.username}
                    {player.isHost && <span className="host-badge">Host</span>}
                  </span>
                </div>
                <span className="player-score">{player.score} pts</span>
              </motion.div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

