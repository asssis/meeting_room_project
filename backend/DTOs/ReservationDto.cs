using System;

namespace MeetingRoom.Api.DTOs;
public record ReservationDto(Guid RoomId, DateTime Date, TimeSpan StartTime, TimeSpan EndTime);

