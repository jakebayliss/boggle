namespace BoggleGame.Server.Services;

/// <summary>
/// Generates weighted letters for Boggle board - mimics real Boggle dice distribution
/// </summary>
public class LetterGenerator
{
    // Classic Boggle dice configurations (16 dice, 6 faces each)
    private static readonly string[] BoggleDice = new[]
    {
        "AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS",
        "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
        "DISTTY", "EEGHNW", "EEINSU", "EHRTVW",
        "EIOSST", "ELRTTY", "HIMNQU", "HLNNRZ"
    };

    // Alternative: weighted letter distribution based on English frequency
    private static readonly Dictionary<char, int> LetterWeights = new()
    {
        { 'A', 9 }, { 'B', 2 }, { 'C', 2 }, { 'D', 4 }, { 'E', 12 },
        { 'F', 2 }, { 'G', 3 }, { 'H', 2 }, { 'I', 9 }, { 'J', 1 },
        { 'K', 1 }, { 'L', 4 }, { 'M', 2 }, { 'N', 6 }, { 'O', 8 },
        { 'P', 2 }, { 'Q', 1 }, { 'R', 6 }, { 'S', 4 }, { 'T', 6 },
        { 'U', 4 }, { 'V', 2 }, { 'W', 2 }, { 'X', 1 }, { 'Y', 2 },
        { 'Z', 1 }
    };

    private readonly Random _random = new();
    private readonly List<char> _weightedPool;

    public LetterGenerator()
    {
        // Build weighted pool for alternative generation
        _weightedPool = new List<char>();
        foreach (var (letter, weight) in LetterWeights)
        {
            for (int i = 0; i < weight; i++)
            {
                _weightedPool.Add(letter);
            }
        }
    }

    /// <summary>
    /// Generates a 4x4 Boggle board using authentic dice rolls
    /// </summary>
    public char[,] GenerateBoard()
    {
        var board = new char[4, 4];
        var shuffledDice = BoggleDice.OrderBy(_ => _random.Next()).ToArray();
        
        int dieIndex = 0;
        for (int row = 0; row < 4; row++)
        {
            for (int col = 0; col < 4; col++)
            {
                var die = shuffledDice[dieIndex++];
                var face = die[_random.Next(die.Length)];
                // 'Q' in Boggle is always 'Qu'
                board[row, col] = face;
            }
        }

        return board;
    }

    /// <summary>
    /// Alternative: Generate board using weighted letter frequency
    /// </summary>
    public char[,] GenerateBoardWeighted()
    {
        var board = new char[4, 4];
        
        for (int row = 0; row < 4; row++)
        {
            for (int col = 0; col < 4; col++)
            {
                board[row, col] = _weightedPool[_random.Next(_weightedPool.Count)];
            }
        }

        return board;
    }

    /// <summary>
    /// Convert 2D array to jagged array for JSON serialization
    /// </summary>
    public static char[][] ToJaggedArray(char[,] board)
    {
        int rows = board.GetLength(0);
        int cols = board.GetLength(1);
        var jagged = new char[rows][];
        
        for (int i = 0; i < rows; i++)
        {
            jagged[i] = new char[cols];
            for (int j = 0; j < cols; j++)
            {
                jagged[i][j] = board[i, j];
            }
        }
        
        return jagged;
    }
}

