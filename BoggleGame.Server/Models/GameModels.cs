namespace BoggleGame.Server.Models;

public class Player
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int Score { get; set; } = 0;
    public List<string> FoundWords { get; set; } = new();
    public bool IsReady { get; set; } = false;
}

public class GameRoom
{
    public string RoomId { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string HostConnectionId { get; set; } = string.Empty;
    public Dictionary<string, Player> Players { get; set; } = new();
    public char[,] Board { get; set; } = new char[4, 4];
    public GameState State { get; set; } = GameState.Waiting;
    public DateTime? GameStartTime { get; set; }
    public int GameDurationSeconds { get; set; } = 180; // 3 minutes default
    public HashSet<string> ValidWords { get; set; } = new();
}

public enum GameState
{
    Waiting,
    InProgress,
    Finished
}

public class GameRoomDto
{
    public string RoomId { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public int PlayerCount { get; set; }
    public GameState State { get; set; }
    public string HostUsername { get; set; } = string.Empty;
}

public class PlayerDto
{
    public string Username { get; set; } = string.Empty;
    public int Score { get; set; }
    public bool IsReady { get; set; }
    public bool IsHost { get; set; }
}

public class GameStateDto
{
    public string RoomId { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public List<PlayerDto> Players { get; set; } = new();
    public char[][]? Board { get; set; }
    public GameState State { get; set; }
    public int? RemainingSeconds { get; set; }
}

