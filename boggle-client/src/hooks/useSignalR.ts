import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

export interface Player {
  username: string;
  score: number;
  isReady: boolean;
  isHost: boolean;
}

export interface GameState {
  roomId: string;
  roomName: string;
  players: Player[];
  board: string[][] | null;
  state: 'Waiting' | 'InProgress' | 'Finished';
  remainingSeconds: number | null;
}

export interface GameRoom {
  roomId: string;
  roomName: string;
  playerCount: number;
  state: string;
  hostUsername: string;
}

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || 'http://localhost:5000/gameHub';

export function useSignalR() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // Initialize connection
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = connection;

    // Set up event handlers
    connection.on('PlayerJoined', (data: { username: string; gameState: GameState }) => {
      console.log('Player joined:', data.username);
      setGameState(data.gameState);
    });

    connection.on('PlayerLeft', (data: { connectionId: string; newHostId: string; gameState: GameState }) => {
      console.log('Player left');
      setGameState(data.gameState);
    });

    connection.on('GameStarted', (state: GameState) => {
      console.log('Game started!');
      setGameState(state);
    });

    connection.on('GameEnded', (state: GameState) => {
      console.log('Game ended!');
      setGameState(state);
    });

    connection.on('GameReset', (state: GameState) => {
      console.log('Game reset');
      setGameState(state);
    });

    connection.on('ScoreUpdated', (data: { username: string; score: number; wordCount: number }) => {
      console.log('Score updated:', data);
      // Update the specific player's score in game state
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map(p => 
            p.username === data.username 
              ? { ...p, score: data.score }
              : p
          )
        };
      });
    });

    connection.onreconnecting(() => {
      console.log('Reconnecting...');
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      console.log('Reconnected!');
      setIsConnected(true);
    });

    connection.onclose(() => {
      console.log('Connection closed');
      setIsConnected(false);
    });

    // Start connection
    connection
      .start()
      .then(() => {
        console.log('Connected to SignalR hub');
        setIsConnected(true);
      })
      .catch((err) => {
        console.error('Failed to connect:', err);
        setError('Failed to connect to game server');
      });

    return () => {
      connection.stop();
    };
  }, []);

  const createRoom = useCallback(async (roomName: string, username: string) => {
    if (!connectionRef.current) return null;
    
    try {
      const result = await connectionRef.current.invoke('CreateRoom', roomName, username);
      if (result.success) {
        setCurrentUsername(username);
        setGameState(result.gameState);
        setError(null);
        return result;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room');
      return null;
    }
  }, []);

  const joinRoom = useCallback(async (roomId: string, username: string) => {
    if (!connectionRef.current) return null;
    
    try {
      const result = await connectionRef.current.invoke('JoinRoom', roomId, username);
      if (result.success) {
        setCurrentUsername(username);
        setGameState(result.gameState);
        setError(null);
        return result;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room');
      return null;
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    if (!connectionRef.current) return;
    
    try {
      await connectionRef.current.invoke('LeaveRoom');
      setGameState(null);
      setCurrentUsername(null);
      setError(null);
    } catch (err) {
      console.error('Error leaving room:', err);
      setError('Failed to leave room');
    }
  }, []);

  const startGame = useCallback(async () => {
    if (!connectionRef.current) return null;
    
    try {
      const result = await connectionRef.current.invoke('StartGame');
      if (result.success) {
        setGameState(result.gameState);
        setError(null);
        return result;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Failed to start game');
      return null;
    }
  }, []);

  const getRooms = useCallback(async () => {
    if (!connectionRef.current) return [];
    
    try {
      const rooms = await connectionRef.current.invoke('GetRooms');
      setAvailableRooms(rooms);
      return rooms;
    } catch (err) {
      console.error('Error getting rooms:', err);
      return [];
    }
  }, []);

  const submitWord = useCallback(async (word: string) => {
    if (!connectionRef.current) return null;
    
    try {
      const result = await connectionRef.current.invoke('SubmitWord', word);
      return result;
    } catch (err) {
      console.error('Error submitting word:', err);
      return null;
    }
  }, []);

  const resetGame = useCallback(async () => {
    if (!connectionRef.current) return null;
    
    try {
      const result = await connectionRef.current.invoke('ResetGame');
      if (result.success) {
        setGameState(result.gameState);
        setError(null);
        return result;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      console.error('Error resetting game:', err);
      setError('Failed to reset game');
      return null;
    }
  }, []);

  return {
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
    clearError: () => setError(null),
  };
}

