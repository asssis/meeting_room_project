using Microsoft.EntityFrameworkCore;
using MeetingRoom.Api.Models;

namespace MeetingRoom.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options): base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Reservation> Reservations => Set<Reservation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Login).IsUnique();
        modelBuilder.Entity<Reservation>()
            .Property(r => r.StartTime)
            .HasConversion(
                v => v.Ticks,          // to db
                v => TimeSpan.FromTicks(v) // from db
            );
        modelBuilder.Entity<Reservation>()
            .Property(r => r.EndTime)
            .HasConversion(v => v.Ticks, v => TimeSpan.FromTicks(v));
    }
}
