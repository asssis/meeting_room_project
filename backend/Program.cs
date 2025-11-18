using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MeetingRoom.Api.Data;
using MeetingRoom.Api.Services;
using System.Text;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ========== CORS (origem específica + credenciais) ==========
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",      // Vite Dev
            "http://127.0.0.1:5173",
            "http://localhost:3000",      // Front em Docker/Nginx
            "http://127.0.0.1:3000",
            "http://api"                  // backend via docker-compose
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials(); // use somente se enviar cookies/tokens via credenciais
    });
});
// ============================================================

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MeetingRoom API", Version = "v1" });
    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' [space] and then your valid token."
    };
    c.AddSecurityDefinition("Bearer", securityScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        { securityScheme, new string[] {} }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=meetingroom.db"));

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IReservationService, ReservationService>();


// Program.cs — construção da chave (substitua o trecho onde você tem Encoding.ASCII.GetBytes)
byte[] keyBytes;
var jwtSecret = builder.Configuration["Jwt:Key"] ?? "xxxxxx"; // <--- use Jwt:Key
try
{
    keyBytes = Convert.FromBase64String(jwtSecret);
}
catch
{
    keyBytes = Encoding.UTF8.GetBytes(jwtSecret);
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = false,
        ValidateAudience = false,
    };

    options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var logger = context.HttpContext.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("JwtDebug");

        var header = context.Request.Headers["Authorization"].FirstOrDefault();
        var cookie = context.Request.Cookies["access_token"];

        Console.WriteLine("===== JWT DEBUG (OnMessageReceived) =====");
        Console.WriteLine($"Authorization Header: {header}");
        Console.WriteLine($"Cookie access_token: {cookie}");
        Console.WriteLine("========================================");

        logger.LogInformation("Authorization Header: {Header}", header ?? "<none>");
        logger.LogInformation("Cookie access_token: {Cookie}", cookie ?? "<none>");

        // Se não tiver header, usa o token do cookie
        if (string.IsNullOrEmpty(header) && !string.IsNullOrEmpty(cookie))
        {
            logger.LogInformation("Using TOKEN from COOKIE.");
            context.Token = cookie;
        }
        else if (!string.IsNullOrEmpty(header))
        {
            logger.LogInformation("Using TOKEN from HEADER.");
        }

        return Task.CompletedTask;
    },

    OnAuthenticationFailed = context =>
    {
        var logger = context.HttpContext.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("JwtAuthFailed");

        Console.WriteLine("===== JWT AUTH FAILED =====");
        Console.WriteLine($"Exception: {context.Exception.Message}");
        Console.WriteLine($"StackTrace: {context.Exception.StackTrace}");
        Console.WriteLine("===========================");

        logger.LogError(context.Exception, "JWT authentication failed: {Message}", context.Exception?.Message);

        return Task.CompletedTask;
    },

    OnTokenValidated = context =>
    {
        var logger = context.HttpContext.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("JwtValidated");

        var userId = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        Console.WriteLine("===== JWT VALIDATED SUCCESS =====");
        Console.WriteLine($"UserId from Claims: {userId}");
        Console.WriteLine("=================================");

        logger.LogInformation("JWT Token validated. UserId: {UserId}", userId);

        return Task.CompletedTask;
    }
};

});

builder.Services.AddHttpContextAccessor();
builder.Services.AddAuthorization();

var app = builder.Build();

// Swagger
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "MeetingRoom API v1"));

// **IMPORTANTE: CORS ANTES de Authentication/Authorization**
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Migration automática
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.Run();
