using Microsoft.AspNetCore.Mvc;
using MeetingRoom.Api.DTOs;
using MeetingRoom.Api.Services;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Authorization;

namespace MeetingRoom.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IUserService userService, IConfiguration config, ILogger<AuthController> logger)
    {
        _userService = userService;
        _config = config;
        _logger = logger;
    }

    // Allow anonymous so non-authenticated users can register
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var user = await _userService.RegisterAsync(dto);
            return Ok(new { user.Id, user.Name, user.Login });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error on Register for login={Login}", dto?.Login);
            return BadRequest(new { error = ex.Message });
        }
    }

    // Allow anonymous so non-authenticated users can login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var user = await _userService.AuthenticateAsync(dto.Login, dto.Password);
            if (user == null)
            {
                _logger.LogInformation("Login failed for {Login}", dto.Login);
                return Unauthorized(new { error = "Credenciais inválidas" });
            }

            var token = GenerateToken(user);
            _logger.LogInformation("Login success for {Login}", dto.Login);

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
#if DEBUG
                Secure = false,
#else
                Secure = true,
#endif
                SameSite = SameSiteMode.None,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            };

            Response.Cookies.Append("access_token", token, cookieOptions);

            return Ok(new { token, userId = user.Id, user = new { user.Id, user.Name, user.Login } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error on Login for login={Login}", dto?.Login);
#if DEBUG
            return StatusCode(500, new { error = ex.Message, stack = ex.StackTrace });
#else
            return Problem(detail: ex.Message, statusCode: 500);
#endif
        }
    }

    /// <summary>
    /// Logout: remove/expira o cookie de autenticação.
    /// Método idempotente — pode ser chamado mesmo se o cookie não existir.
    /// </summary>
    [HttpPost("logout")]
    [Authorize] // opcional: pode ser AllowAnonymous se quiser permitir sempre limpar o cookie
    public IActionResult Logout()
    {
        try
        {
            // Para remover cookie, sobrescrevemos com mesmo nome e expiramos.
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
#if DEBUG
                Secure = false,
#else
                Secure = true,
#endif
                SameSite = SameSiteMode.None,
                Expires = DateTimeOffset.UtcNow.AddDays(-1) // expira no passado
            };

            Response.Cookies.Append("access_token", string.Empty, cookieOptions);
            _logger.LogInformation("User logged out (cookie cleared).");

            // 204 No Content é apropriado para logout simples
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error on Logout");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Retorna dados do usuário atualmente autenticado.
    /// Requer que o middleware de autenticação/jwt esteja configurado e populando User.Claims.
    /// </summary>
    
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        try
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
    
            if (string.IsNullOrWhiteSpace(idClaim))
            {
                _logger.LogWarning("Me requested but no NameIdentifier claim present.");
                return Unauthorized(new { error = "Claim de identidade ausente" });
            }
    
            // Construção básica a partir de claims (fallback seguro)
            var claimName = User.FindFirst(ClaimTypes.Name)?.Value
                            ?? User.FindFirst("name")?.Value;
            var claimLogin = User.FindFirst(ClaimTypes.Upn)?.Value
                             ?? User.FindFirst("preferred_username")?.Value
                             ?? User.FindFirst("login")?.Value;
            var basicFromClaims = new {
                id = idClaim,
                name = claimName,
                login = claimLogin
            };
    
            // Tentativa dinâmica de chamar um método do IUserService que retorne o usuário por id.
            // Procura por nomes comuns e por métodos com 1 parâmetro.
            var candidateNames = new[] { "GetByIdAsync", "GetById", "FindByIdAsync", "FindById", "GetAsync" };
            var svcType = _userService.GetType();
            var method = svcType.GetMethods()
                .FirstOrDefault(m =>
                    candidateNames.Contains(m.Name, StringComparer.OrdinalIgnoreCase)
                    && m.GetParameters().Length == 1);
    
            if (method == null)
            {
                // não há método conhecido — retorna dados das claims
                return Ok(basicFromClaims);
            }
    
            // converte idClaim para o tipo do parâmetro do método (Guid/int/string)
            var paramType = method.GetParameters()[0].ParameterType;
            object convertedArg = ConvertIdStringToType(idClaim, paramType);
    
            if (convertedArg == null)
            {
                _logger.LogWarning("Me: não foi possível converter idClaim '{IdClaim}' para {ParamType}", idClaim, paramType);
                return Ok(basicFromClaims);
            }
    
            // invoca o método (pode retornar Task ou Task<T> ou T)
            var invokeResult = method.Invoke(_userService, new[] { convertedArg });
            if (invokeResult == null)
            {
                return Ok(basicFromClaims);
            }
    
            // Se for Task ou Task<T>, await e obter Result (se existir)
            if (invokeResult is System.Threading.Tasks.Task task)
            {
                await task.ConfigureAwait(false);
                // se for Task<T>, pegar .Result via reflexao
                var taskType = task.GetType();
                if (taskType.IsGenericType)
                {
                    var resultProp = taskType.GetProperty("Result");
                    var userObj = resultProp?.GetValue(task);
                    if (userObj != null)
                    {
                        // mapear campos comuns do userObj dinamicamente (id,name,login,email)
                        var projected = ProjectUserObject(userObj);
                        return Ok(projected);
                    }
                }
    
                // método retornou Task sem resultado
                return Ok(basicFromClaims);
            }
            else
            {
                // método retornou um objeto síncrono
                var userObj = invokeResult;
                var projected = ProjectUserObject(userObj);
                return Ok(projected);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error on Me");
            return StatusCode(500, new { error = ex.Message });
        }
    
        // helpers locais
        object? ConvertIdStringToType(string idStr, Type targetType)
        {
            if (targetType == typeof(string)) return idStr;
            if (targetType == typeof(Guid) || targetType == typeof(Guid?))
            {
                if (Guid.TryParse(idStr, out var g)) return g;
                return null;
            }
            if (targetType == typeof(int) || targetType == typeof(int?))
            {
                if (int.TryParse(idStr, out var i)) return i;
                return null;
            }
            if (targetType == typeof(long) || targetType == typeof(long?))
            {
                if (long.TryParse(idStr, out var l)) return l;
                return null;
            }
            // tentativa final: se o tipo aceita string via ctor
            try
            {
                return Convert.ChangeType(idStr, targetType);
            }
            catch
            {
                return null;
            }
        }
    
        object ProjectUserObject(object userObj)
        {
            var t = userObj.GetType();
            // tenta pegar propriedades comuns: Id, id, Name, name, Login, login, Email, email
            string? id = TryGetProp(t, userObj, "Id") ?? TryGetProp(t, userObj, "id");
            string? name = TryGetProp(t, userObj, "Name") ?? TryGetProp(t, userObj, "name");
            string? login = TryGetProp(t, userObj, "Login") ?? TryGetProp(t, userObj, "login") ?? TryGetProp(t, userObj, "UserName") ?? TryGetProp(t, userObj, "username");
            string? email = TryGetProp(t, userObj, "Email") ?? TryGetProp(t, userObj, "email");
    
            return new { id, name, login, email };
        }
    
        string? TryGetProp(Type t, object obj, string propName)
        {
            var prop = t.GetProperty(propName);
            if (prop == null) return null;
            var val = prop.GetValue(obj);
            return val?.ToString();
        }
    }

    private string GenerateToken(MeetingRoom.Api.Models.User user)
    {
        var keyString = _config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(keyString))
            throw new InvalidOperationException("Jwt:Key is not configured. Set Jwt:Key in appsettings or environment.");

        byte[] keyBytes;
        try
        {
            keyBytes = Convert.FromBase64String(keyString);
        }
        catch
        {
            keyBytes = Encoding.UTF8.GetBytes(keyString);
        }

        if (keyBytes.Length < 32)
            throw new InvalidOperationException($"Jwt:Key is too short ({keyBytes.Length} bytes). Provide at least 32 bytes (e.g. `openssl rand -base64 48`).");

        var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var signingKey = new SymmetricSecurityKey(keyBytes);
        var signingCreds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name ?? string.Empty),
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = signingCreds
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
