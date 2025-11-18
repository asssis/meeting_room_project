// Models/Reservation.cs
using System;

namespace MeetingRoom.Api.Models
{
    public class Reservation
    {
        public Guid Id { get; set; }
        public Guid RoomId { get; set; }

        // Armazene apenas a data (hora zerada) ou DateTime com hora zero.
        public DateTime Date { get; set; }

        // Horários como TimeSpan — fácil de comparar no EF
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }

        public Guid UserId { get; set; }

        // opcional: criação / modificação
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
