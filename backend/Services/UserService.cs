using MeetingRoom.Api.DTOs;
using MeetingRoom.Api.Models;
using MeetingRoom.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace MeetingRoom.Api.Services;

public interface IUserService
{
    Task<User?> AuthenticateAsync(string login, string password);
    Task<User> RegisterAsync(RegisterDto dto);
}

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    public UserService(AppDbContext db) { _db = db; }

    public async Task<User?> AuthenticateAsync(string login, string password)
    {
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Login == login);
        if (user == null) return null;
        var hash = ComputeHash(password);
        return user.PasswordHash == hash ? user : null;
    }

    public async Task<User> RegisterAsync(RegisterDto dto)
    {
        var exists = await _db.Users.AnyAsync(u => u.Login == dto.Login);
        if (exists) throw new Exception("Login already exists");
        var user = new User { Id = Guid.NewGuid(), Name = dto.Name, Login = dto.Login, PasswordHash = ComputeHash(dto.Password) };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    private static string ComputeHash(string plain)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(plain));
        return Convert.ToBase64String(bytes);
    }
}
