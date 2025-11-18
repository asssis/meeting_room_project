using System.ComponentModel.DataAnnotations;

namespace MeetingRoom.Api.Models;

public class User
{
    public Guid Id { get; set; }
    [Required]
    public string Name { get; set; } = "";
    [Required]
    public string Login { get; set; } = "";
    [Required]
    public string PasswordHash { get; set; } = "";
}
