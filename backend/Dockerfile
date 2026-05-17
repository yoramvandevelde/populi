# Stage 1: build
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY Populi/Populi.csproj Populi/
RUN dotnet restore Populi/Populi.csproj
COPY . .
RUN dotnet publish Populi/Populi.csproj -c Release -o /app/publish

# Stage 2: runtime (non-root)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /app/publish .
RUN chown -R app:app /app
USER app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "Populi.dll"]
