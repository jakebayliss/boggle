using System.Collections.Concurrent;
using BoggleGame.Server.Models;

namespace BoggleGame.Server.Services;

public class GameService
{
    private readonly ConcurrentDictionary<string, GameRoom> _rooms = new();
    private readonly ConcurrentDictionary<string, string> _playerRooms = new(); // connectionId -> roomId
    private readonly LetterGenerator _letterGenerator = new();

    public GameRoom CreateRoom(string roomName, string hostConnectionId, string hostUsername)
    {
        var roomId = GenerateRoomId();
        var room = new GameRoom
        {
            RoomId = roomId,
            RoomName = roomName,
            HostConnectionId = hostConnectionId,
            State = GameState.Waiting
        };

        room.Players[hostConnectionId] = new Player
        {
            ConnectionId = hostConnectionId,
            Username = hostUsername
        };

        _rooms[roomId] = room;
        _playerRooms[hostConnectionId] = roomId;

        return room;
    }

    public (bool success, string message, GameRoom? room) JoinRoom(string roomId, string connectionId, string username)
    {
        if (!_rooms.TryGetValue(roomId, out var room))
        {
            return (false, "Room not found", null);
        }

        if (room.State != GameState.Waiting)
        {
            return (false, "Game already in progress", null);
        }

        if (room.Players.Count >= 8)
        {
            return (false, "Room is full", null);
        }

        if (room.Players.Values.Any(p => p.Username.Equals(username, StringComparison.OrdinalIgnoreCase)))
        {
            return (false, "Username already taken in this room", null);
        }

        room.Players[connectionId] = new Player
        {
            ConnectionId = connectionId,
            Username = username
        };

        _playerRooms[connectionId] = roomId;

        return (true, "Joined successfully", room);
    }

    public (bool success, GameRoom? room, string? newHostId) LeaveRoom(string connectionId)
    {
        if (!_playerRooms.TryRemove(connectionId, out var roomId))
        {
            return (false, null, null);
        }

        if (!_rooms.TryGetValue(roomId, out var room))
        {
            return (false, null, null);
        }

        room.Players.Remove(connectionId);

        // If room is empty, remove it
        if (room.Players.Count == 0)
        {
            _rooms.TryRemove(roomId, out _);
            return (true, null, null);
        }

        // If host left, assign new host
        string? newHostId = null;
        if (room.HostConnectionId == connectionId)
        {
            newHostId = room.Players.Keys.First();
            room.HostConnectionId = newHostId;
        }

        return (true, room, newHostId);
    }

    public (bool success, string message, GameRoom? room) StartGame(string connectionId)
    {
        var room = GetRoomByConnectionId(connectionId);
        if (room == null)
        {
            return (false, "Room not found", null);
        }

        if (room.HostConnectionId != connectionId)
        {
            return (false, "Only the host can start the game", null);
        }

        if (room.Players.Count < 1) // Could require 2+ for multiplayer
        {
            return (false, "Need at least 1 player to start", null);
        }

        // Generate new board
        room.Board = _letterGenerator.GenerateBoard();
        room.State = GameState.InProgress;
        room.GameStartTime = DateTime.UtcNow;

        // Reset player scores
        foreach (var player in room.Players.Values)
        {
            player.Score = 0;
            player.FoundWords.Clear();
        }

        return (true, "Game started", room);
    }

    public GameRoom? GetRoom(string roomId)
    {
        _rooms.TryGetValue(roomId, out var room);
        return room;
    }

    public GameRoom? GetRoomByConnectionId(string connectionId)
    {
        if (!_playerRooms.TryGetValue(connectionId, out var roomId))
        {
            return null;
        }
        return GetRoom(roomId);
    }

    public List<GameRoomDto> GetAvailableRooms()
    {
        return _rooms.Values
            .Where(r => r.State == GameState.Waiting)
            .Select(r => new GameRoomDto
            {
                RoomId = r.RoomId,
                RoomName = r.RoomName,
                PlayerCount = r.Players.Count,
                State = r.State,
                HostUsername = r.Players.TryGetValue(r.HostConnectionId, out var host) 
                    ? host.Username 
                    : "Unknown"
            })
            .ToList();
    }

    public GameStateDto? GetGameState(string roomId)
    {
        var room = GetRoom(roomId);
        if (room == null) return null;

        var remainingSeconds = room.State == GameState.InProgress && room.GameStartTime.HasValue
            ? Math.Max(0, room.GameDurationSeconds - (int)(DateTime.UtcNow - room.GameStartTime.Value).TotalSeconds)
            : (int?)null;

        return new GameStateDto
        {
            RoomId = room.RoomId,
            RoomName = room.RoomName,
            State = room.State,
            Board = room.State == GameState.InProgress ? LetterGenerator.ToJaggedArray(room.Board) : null,
            RemainingSeconds = remainingSeconds,
            Players = room.Players.Values.Select(p => new PlayerDto
            {
                Username = p.Username,
                Score = p.Score,
                IsReady = p.IsReady,
                IsHost = p.ConnectionId == room.HostConnectionId
            }).ToList()
        };
    }

    public void EndGame(string roomId)
    {
        if (_rooms.TryGetValue(roomId, out var room))
        {
            room.State = GameState.Finished;
        }
    }

    public void ResetRoom(string roomId)
    {
        if (_rooms.TryGetValue(roomId, out var room))
        {
            room.State = GameState.Waiting;
            room.Board = new char[4, 4];
            room.GameStartTime = null;
            foreach (var player in room.Players.Values)
            {
                player.Score = 0;
                player.FoundWords.Clear();
                player.IsReady = false;
            }
        }
    }

    private string GenerateRoomId()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }
}

