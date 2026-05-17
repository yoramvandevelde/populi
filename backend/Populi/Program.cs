using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Authentication;

var builder = WebApplication.CreateBuilder(args);

var dbPath = Environment.GetEnvironmentVariable("DATABASE_PATH") ?? "recepten.db";
var haUrl = (Environment.GetEnvironmentVariable("HA_URL") ?? "").TrimEnd('/');
var haToken = Environment.GetEnvironmentVariable("HA_TOKEN") ?? "";
const string haList = "todo.shopping_list";
var adminUser = Environment.GetEnvironmentVariable("ADMIN_USER") ?? "admin";
var adminPasswordHash = Environment.GetEnvironmentVariable("ADMIN_PASSWORD_HASH") ?? "";

builder.Services.AddAuthentication("Cookies")
    .AddCookie("Cookies", o =>
    {
        o.Cookie.Name = "populi_session";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.ExpireTimeSpan = TimeSpan.FromDays(30);
        o.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = 401;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()));

var app = builder.Build();
app.UseCors("DevCors");
app.UseAuthentication();
app.UseAuthorization();

InitDb(dbPath);

// ── Health ────────────────────────────────────────────────────────────────────
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.MapPost("/api/auth/login", async (HttpContext ctx, LoginRequest req) =>
{
    if (req.Username == adminUser
        && !string.IsNullOrEmpty(adminPasswordHash)
        && BCrypt.Net.BCrypt.Verify(req.Password, adminPasswordHash))
    {
        var claims = new[] { new Claim(ClaimTypes.Name, adminUser) };
        var identity = new ClaimsIdentity(claims, "Cookies");
        await ctx.SignInAsync("Cookies", new ClaimsPrincipal(identity));
        return Results.Ok(new { username = adminUser });
    }
    return Results.Json(new { error = "Ongeldige gebruikersnaam of wachtwoord." }, statusCode: 401);
});

app.MapPost("/api/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync("Cookies");
    return Results.Ok();
}).RequireAuthorization();

app.MapGet("/api/auth/me", (HttpContext ctx) =>
    Results.Ok(new { username = ctx.User.Identity!.Name })
).RequireAuthorization();

// ── Recipes ───────────────────────────────────────────────────────────────────
app.MapGet("/api/recipes", (string? q) =>
{
    using var db = OpenDb(dbPath);
    List<Dictionary<string, object?>> rows;
    if (!string.IsNullOrWhiteSpace(q))
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT DISTINCT r.* FROM recipe r
            LEFT JOIN ingredient i ON i.recipe_id = r.id
            WHERE r.title LIKE $q OR r.tags LIKE $q OR i.item LIKE $q
            ORDER BY r.updated_at DESC
        """;
        cmd.Parameters.AddWithValue("$q", $"%{q}%");
        rows = ReadRows(cmd);
    }
    else
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT * FROM recipe ORDER BY updated_at DESC";
        rows = ReadRows(cmd);
    }
    return Results.Ok(rows);
}).RequireAuthorization();

app.MapGet("/api/recipes/{id:long}", (long id) =>
{
    using var db = OpenDb(dbPath);
    var recipe = GetRecipe(db, id);
    if (recipe is null) return Results.NotFound();
    var ingredients = GetIngredients(db, id);
    return Results.Ok(new { recipe, ingredients });
}).RequireAuthorization();

app.MapPost("/api/recipes", (RecipeRequest req) =>
{
    using var db = OpenDb(dbPath);
    using var cmd = db.CreateCommand();
    cmd.CommandText = """
        INSERT INTO recipe (title, steps, servings, cook_time, prep_time, tags)
        VALUES ($title, $steps, $servings, $cook_time, $prep_time, $tags)
    """;
    SetRecipeParams(cmd, req);
    cmd.ExecuteNonQuery();
    using var idCmd = db.CreateCommand();
    idCmd.CommandText = "SELECT last_insert_rowid()";
    var newId = (long)idCmd.ExecuteScalar()!;
    SaveIngredients(db, newId, req.Ingredients);
    return Results.Created($"/api/recipes/{newId}", new { id = newId });
}).RequireAuthorization();

app.MapPut("/api/recipes/{id:long}", (long id, RecipeRequest req) =>
{
    using var db = OpenDb(dbPath);
    if (GetRecipe(db, id) is null) return Results.NotFound();

    using var cmd = db.CreateCommand();
    cmd.CommandText = """
        UPDATE recipe
        SET title=$title, steps=$steps, servings=$servings,
            cook_time=$cook_time, prep_time=$prep_time, tags=$tags,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$id
    """;
    SetRecipeParams(cmd, req);
    cmd.Parameters.AddWithValue("$id", id);
    cmd.ExecuteNonQuery();

    using var del = db.CreateCommand();
    del.CommandText = "DELETE FROM ingredient WHERE recipe_id=$id";
    del.Parameters.AddWithValue("$id", id);
    del.ExecuteNonQuery();

    SaveIngredients(db, id, req.Ingredients);
    return Results.Ok(new { id });
}).RequireAuthorization();

app.MapDelete("/api/recipes/{id:long}", (long id) =>
{
    using var db = OpenDb(dbPath);
    using var cmd = db.CreateCommand();
    cmd.CommandText = "DELETE FROM recipe WHERE id=$id";
    cmd.Parameters.AddWithValue("$id", id);
    cmd.ExecuteNonQuery();
    return Results.NoContent();
}).RequireAuthorization();

app.MapPatch("/api/recipes/{id:long}/tags", async (long id, HttpContext ctx) =>
{
    var body = await JsonDocument.ParseAsync(ctx.Request.Body);
    var tags = body.RootElement.TryGetProperty("tags", out var t) ? t.GetString() ?? "" : "";
    using var db = OpenDb(dbPath);
    using var cmd = db.CreateCommand();
    cmd.CommandText = "UPDATE recipe SET tags=$tags WHERE id=$id";
    cmd.Parameters.AddWithValue("$tags", tags);
    cmd.Parameters.AddWithValue("$id", id);
    cmd.ExecuteNonQuery();
    return Results.NoContent();
}).RequireAuthorization();

// ── Shopping list ─────────────────────────────────────────────────────────────
app.MapPost("/api/recipes/{id:long}/shop", async (long id) =>
{
    if (string.IsNullOrEmpty(haUrl) || string.IsNullOrEmpty(haToken))
        return Results.Json(new { error = "HA niet geconfigureerd" }, statusCode: 503);

    using var db = OpenDb(dbPath);
    var ingredients = GetIngredients(db, id);

    using var http = new HttpClient();
    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", haToken);

    var errors = new List<string>();
    foreach (var ing in ingredients)
    {
        var item = ing["item"]?.ToString() ?? "";
        var amount = ing["amount"];
        var unit = ing["unit"]?.ToString();

        if (amount is not null && !string.IsNullOrEmpty(unit))
            item = $"{item} - {FormatAmount(amount)} {unit}";
        else if (amount is not null)
            item = $"{item} - {FormatAmount(amount)}x";

        var payload = JsonSerializer.Serialize(new { entity_id = haList, item });
        var content = new StringContent(payload, Encoding.UTF8, "application/json");
        try
        {
            var res = await http.PostAsync($"{haUrl}/api/services/todo/add_item", content);
            if (!res.IsSuccessStatusCode)
                errors.Add($"HTTP {(int)res.StatusCode}");
        }
        catch (Exception e)
        {
            errors.Add(e.Message);
        }
    }

    return errors.Count > 0
        ? Results.Json(new { error = errors }, statusCode: 502)
        : Results.NoContent();
}).RequireAuthorization();

// ── Admin ─────────────────────────────────────────────────────────────────────
app.MapGet("/api/admin/info", () =>
{
    var size = File.Exists(dbPath) ? new FileInfo(dbPath).Length : 0;
    return Results.Ok(new { db_size = size, db_path = dbPath });
}).RequireAuthorization();

app.MapGet("/api/admin/db/download", () =>
{
    if (!File.Exists(dbPath)) return Results.NotFound();
    return Results.File(File.ReadAllBytes(dbPath), "application/octet-stream", "recepten.db");
}).RequireAuthorization();

app.MapPost("/api/admin/db/upload", async (HttpRequest request) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { error = "Ongeldig verzoek." });
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("database");
    if (file is null || !file.FileName.EndsWith(".db"))
        return Results.BadRequest(new { error = "Ongeldig bestand. Upload een .db file." });
    await using var stream = File.OpenWrite(dbPath);
    stream.SetLength(0);
    await file.CopyToAsync(stream);
    return Results.Ok(new { message = "Database succesvol vervangen." });
}).RequireAuthorization().DisableAntiforgery();

app.Run();

// ── Helpers ───────────────────────────────────────────────────────────────────
static SqliteConnection OpenDb(string path)
{
    var conn = new SqliteConnection($"Data Source={path}");
    conn.Open();
    using var pragma = conn.CreateCommand();
    pragma.CommandText = "PRAGMA foreign_keys = ON";
    pragma.ExecuteNonQuery();
    return conn;
}

static List<Dictionary<string, object?>> ReadRows(SqliteCommand cmd)
{
    var rows = new List<Dictionary<string, object?>>();
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        var row = new Dictionary<string, object?>();
        for (int i = 0; i < reader.FieldCount; i++)
            row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
        rows.Add(row);
    }
    return rows;
}

static Dictionary<string, object?>? GetRecipe(SqliteConnection db, long id)
{
    using var cmd = db.CreateCommand();
    cmd.CommandText = "SELECT * FROM recipe WHERE id=$id";
    cmd.Parameters.AddWithValue("$id", id);
    return ReadRows(cmd).FirstOrDefault();
}

static List<Dictionary<string, object?>> GetIngredients(SqliteConnection db, long id)
{
    using var cmd = db.CreateCommand();
    cmd.CommandText = "SELECT * FROM ingredient WHERE recipe_id=$id ORDER BY sort_order";
    cmd.Parameters.AddWithValue("$id", id);
    return ReadRows(cmd);
}

static void SetRecipeParams(SqliteCommand cmd, RecipeRequest req)
{
    cmd.Parameters.AddWithValue("$title", req.Title);
    cmd.Parameters.AddWithValue("$steps", req.Steps);
    cmd.Parameters.AddWithValue("$servings", req.Servings);
    cmd.Parameters.AddWithValue("$cook_time", (object?)req.CookTime ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$prep_time", (object?)req.PrepTime ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$tags", (object?)req.Tags ?? DBNull.Value);
}

static void SaveIngredients(SqliteConnection db, long recipeId, List<IngredientRequest> ingredients)
{
    for (int i = 0; i < ingredients.Count; i++)
    {
        var ing = ingredients[i];
        if (string.IsNullOrWhiteSpace(ing.Item)) continue;
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            INSERT INTO ingredient (recipe_id, item, amount, unit, sort_order)
            VALUES ($recipe_id, $item, $amount, $unit, $sort_order)
        """;
        cmd.Parameters.AddWithValue("$recipe_id", recipeId);
        cmd.Parameters.AddWithValue("$item", ing.Item);
        cmd.Parameters.AddWithValue("$amount", (object?)ing.Amount ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$unit", (object?)ing.Unit ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$sort_order", i);
        cmd.ExecuteNonQuery();
    }
}

static string FormatAmount(object? amount)
{
    if (amount is double d) return d % 1 == 0 ? ((long)d).ToString() : d.ToString("G");
    if (amount is long l) return l.ToString();
    return amount?.ToString() ?? "";
}

static void InitDb(string path)
{
    using var db = new SqliteConnection($"Data Source={path}");
    db.Open();
    using var cmd = db.CreateCommand();
    cmd.CommandText = """
        CREATE TABLE IF NOT EXISTS recipe (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            steps TEXT NOT NULL DEFAULT '',
            servings INTEGER NOT NULL DEFAULT 2,
            cook_time TEXT,
            prep_time TEXT,
            tags TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS ingredient (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_id INTEGER NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
            item TEXT NOT NULL,
            amount REAL,
            unit TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0
        );
    """;
    cmd.ExecuteNonQuery();
}

record LoginRequest(string Username, string Password);
record RecipeRequest(
    string Title, string Steps, int Servings,
    string? CookTime, string? PrepTime, string? Tags,
    List<IngredientRequest> Ingredients);
record IngredientRequest(string Item, double? Amount, string? Unit);
