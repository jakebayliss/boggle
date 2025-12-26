'use client';

import { useSignalR } from '@/hooks/useSignalR';
import { Lobby } from '@/components/Lobby';
import { GameRoom } from '@/components/GameRoom';

export default function Home() {
  const {
    isConnected,
    gameState,
    availableRooms,
    error,
    currentUsername,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    getRooms,
    submitWord,
    resetGame,
  } = useSignalR();

  return (
    <main className="app-container">
      <div className="background-pattern"></div>
      
      {!gameState ? (
        <Lobby
          isConnected={isConnected}
          availableRooms={availableRooms}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onRefreshRooms={getRooms}
          error={error}
        />
      ) : (
        <GameRoom
          gameState={gameState}
          currentUsername={currentUsername}
          onLeaveRoom={leaveRoom}
          onStartGame={startGame}
          onResetGame={resetGame}
          onSubmitWord={submitWord}
        />
      )}
    </main>
  );
}

