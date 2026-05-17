var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    // Allow the React dev server during local development
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("DevCors");

// In-memory store (replace with a real DB later)
var items = new List<Item>();
var nextId = 1;

app.MapGet("/api/items", () => items);

app.MapPost("/api/items", (ItemRequest req) =>
{
    var item = new Item(nextId++, req.Name);
    items.Add(item);
    return Results.Created($"/api/items/{item.Id}", item);
});

app.MapDelete("/api/items/{id:int}", (int id) =>
{
    var item = items.FirstOrDefault(i => i.Id == id);
    if (item is null) return Results.NotFound();
    items.Remove(item);
    return Results.NoContent();
});

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

record Item(int Id, string Name);
record ItemRequest(string Name);
