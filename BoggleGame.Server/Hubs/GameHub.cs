using Microsoft.AspNetCore.SignalR;
using BoggleGame.Server.Models;
using BoggleGame.Server.Services;

namespace BoggleGame.Server.Hubs;

public class GameHub : Hub
{
    private readonly GameService _gameService;
    private readonly ILogger<GameHub> _logger;

    public GameHub(GameService gameService, ILogger<GameHub> logger)
    {
        _gameService = gameService;
        _logger = logger;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var (success, room, newHostId) = _gameService.LeaveRoom(Context.ConnectionId);
        
        if (success && room != null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, room.RoomId);
            
            await Clients.Group(room.RoomId).SendAsync("PlayerLeft", new
            {
                ConnectionId = Context.ConnectionId,
                NewHostId = newHostId,
                GameState = _gameService.GetGameState(room.RoomId)
            });
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Create a new game room
    /// </summary>
    public async Task<object> CreateRoom(string roomName, string username)
    {
        try
        {
            var room = _gameService.CreateRoom(roomName, Context.ConnectionId, username);
            await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomId);

            _logger.LogInformation("Room {RoomId} created by {Username}", room.RoomId, username);

            return new
            {
                Success = true,
                RoomId = room.RoomId,
                GameState = _gameService.GetGameState(room.RoomId)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating room");
            return new { Success = false, Message = "Failed to create room" };
        }
    }

    /// <summary>
    /// Join an existing room
    /// </summary>
    public async Task<object> JoinRoom(string roomId, string username)
    {
        try
        {
            var (success, message, room) = _gameService.JoinRoom(roomId, Context.ConnectionId, username);

            if (!success)
            {
                return new { Success = false, Message = message };
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            // Notify other players
            await Clients.OthersInGroup(roomId).SendAsync("PlayerJoined", new
            {
                Username = username,
                GameState = _gameService.GetGameState(roomId)
            });

            _logger.LogInformation("{Username} joined room {RoomId}", username, roomId);

            return new
            {
                Success = true,
                GameState = _gameService.GetGameState(roomId)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining room {RoomId}", roomId);
            return new { Success = false, Message = "Failed to join room" };
        }
    }

    /// <summary>
    /// Leave current room
    /// </summary>
    public async Task<object> LeaveRoom()
    {
        try
        {
            var room = _gameService.GetRoomByConnectionId(Context.ConnectionId);
            if (room == null)
            {
                return new { Success = false, Message = "Not in a room" };
            }

            var roomId = room.RoomId;
            var (success, updatedRoom, newHostId) = _gameService.LeaveRoom(Context.ConnectionId);

            if (success)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

                if (updatedRoom != null)
                {
                    await Clients.Group(roomId).SendAsync("PlayerLeft", new
                    {
                        ConnectionId = Context.ConnectionId,
                        NewHostId = newHostId,
                        GameState = _gameService.GetGameState(roomId)
                    });
                }
            }

            return new { Success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving room");
            return new { Success = false, Message = "Failed to leave room" };
        }
    }

    /// <summary>
    /// Start the game (host only)
    /// </summary>
    public async Task<object> StartGame()
    {
        try
        {
            var (success, message, room) = _gameService.StartGame(Context.ConnectionId);

            if (!success)
            {
                return new { Success = false, Message = message };
            }

            var gameState = _gameService.GetGameState(room!.RoomId);

            // Notify all players that game has started
            await Clients.Group(room.RoomId).SendAsync("GameStarted", gameState);

            _logger.LogInformation("Game started in room {RoomId}", room.RoomId);

            // Schedule game end
            _ = Task.Run(async () =>
            {
                await Task.Delay(room.GameDurationSeconds * 1000);
                await EndGameInternal(room.RoomId);
            });

            return new { Success = true, GameState = gameState };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting game");
            return new { Success = false, Message = "Failed to start game" };
        }
    }

    /// <summary>
    /// Get list of available rooms
    /// </summary>
    public Task<List<GameRoomDto>> GetRooms()
    {
        return Task.FromResult(_gameService.GetAvailableRooms());
    }

    /// <summary>
    /// Get current game state
    /// </summary>
    public Task<GameStateDto?> GetGameState()
    {
        var room = _gameService.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null) return Task.FromResult<GameStateDto?>(null);
        return Task.FromResult(_gameService.GetGameState(room.RoomId));
    }

    /// <summary>
    /// Submit a word (placeholder for future implementation)
    /// </summary>
    public async Task<object> SubmitWord(string word)
    {
        var room = _gameService.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null || room.State != GameState.InProgress)
        {
            return new { Success = false, Message = "Game not in progress" };
        }

        // TODO: Validate word against board and dictionary
        // For now, just acknowledge receipt
        var player = room.Players[Context.ConnectionId];
        
        if (!player.FoundWords.Contains(word.ToUpper()))
        {
            player.FoundWords.Add(word.ToUpper());
            // Simple scoring: 1 point per letter over 2
            player.Score += Math.Max(1, word.Length - 2);

            await Clients.Group(room.RoomId).SendAsync("ScoreUpdated", new
            {
                Username = player.Username,
                Score = player.Score,
                WordCount = player.FoundWords.Count
            });
        }

        return new { Success = true, Score = player.Score };
    }

    /// <summary>
    /// Reset room for new game (host only)
    /// </summary>
    public async Task<object> ResetGame()
    {
        var room = _gameService.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null)
        {
            return new { Success = false, Message = "Not in a room" };
        }

        if (room.HostConnectionId != Context.ConnectionId)
        {
            return new { Success = false, Message = "Only the host can reset the game" };
        }

        _gameService.ResetRoom(room.RoomId);
        var gameState = _gameService.GetGameState(room.RoomId);

        await Clients.Group(room.RoomId).SendAsync("GameReset", gameState);

        return new { Success = true, GameState = gameState };
    }

    private async Task EndGameInternal(string roomId)
    {
        var room = _gameService.GetRoom(roomId);
        if (room == null || room.State != GameState.InProgress) return;

        _gameService.EndGame(roomId);
        var gameState = _gameService.GetGameState(roomId);

        await Clients.Group(roomId).SendAsync("GameEnded", gameState);
        _logger.LogInformation("Game ended in room {RoomId}", roomId);
    }
}

