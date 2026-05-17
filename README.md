# Populi

Zelf-gehoste receptenmanager. Gebaseerd op [recipit](https://github.com/yoramvandevelde/recipit), herschreven in C# + React.

## Features

- Recepten aanmaken, bewerken en verwijderen
- Zoeken op titel, ingrediënten of tags
- Kookmodus met uitschuifbaar ingrediëntenpaneel
- Ingrediënten toevoegen aan HomeAssistant boodschappenlijst
- Tags voor organisatie
- Admin panel: database downloaden en terugzetten
- Wachtwoordbeveiliging (bcrypt)

## Stack

| Laag      | Tech                              |
|-----------|-----------------------------------|
| Frontend  | React + Vite, geserveerd via nginx |
| Backend   | ASP.NET Core 8 Minimal API + SQLite |
| Registry  | ghcr.io/yoramvandevelde           |
| Deploy    | ArgoCD + Kustomize                |

## Repo structuur

```
populi/
├── frontend/          # React app
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   └── Populi/        # C# Minimal API
│       ├── Program.cs
│       └── Populi.csproj
├── k8s/
│   ├── base/          # Namespace, deployments, services, ingress
│   └── overlays/dev/  # Image tags (bijgewerkt door CI)
└── .github/workflows/
    └── build.yaml     # Build + push + image tags updaten
```

## Lokaal draaien met Docker

```bash
# 1. Maak een .env aan op basis van het voorbeeld
cp .env.example .env

# 2. Genereer een bcrypt wachtwoordhash
docker run --rm python:3 sh -c \
  'pip install bcrypt -q && python3 -c "import bcrypt,sys; print(bcrypt.hashpw(sys.argv[1].encode(),bcrypt.gensalt()).decode())" jouwwachtwoord'

# 3. Plak de hash in .env bij ADMIN_PASSWORD_HASH=

# 4. Bouwen en starten
docker compose up --build
```

App is bereikbaar op `http://localhost:8080`.

## Environment variables

| Variable              | Beschrijving                                      |
|-----------------------|---------------------------------------------------|
| `ADMIN_USER`          | Gebruikersnaam (default: `admin`)                 |
| `ADMIN_PASSWORD_HASH` | bcrypt hash van het wachtwoord                    |
| `DATABASE_PATH`       | Pad naar de SQLite database (default: `recepten.db`) |
| `HA_URL`              | HomeAssistant URL (optioneel)                     |
| `HA_TOKEN`            | HomeAssistant access token (optioneel)            |

## Lokale ontwikkeling (zonder Docker)

```bash
# Backend
cd backend/Populi && dotnet run

# Frontend (apart terminal)
cd frontend && npm install && npm run dev
```

Frontend proxyt `/api` naar `http://localhost:5000` via de Vite dev server.

## Deployen naar cluster

Drop `k8s/argocd-app.yaml` in `k8s-gitops/apps/` en ArgoCD pakt het op.
