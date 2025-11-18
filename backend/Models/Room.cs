using System.ComponentModel.DataAnnotations;

namespace MeetingRoom.Api.Models;

public class Room
{
    public Guid Id { get; set; }
    [Required]
    public string Name { get; set; } = "";
    public int Capacity { get; set; }
    public string? Location { get; set; }
    public string? Description { get; set; }

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
