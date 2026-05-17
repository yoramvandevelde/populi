# Populi

Demo app: React frontend + C# Minimal API backend.

## Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Frontend | React + Vite, served by nginx |
| Backend  | ASP.NET Core 8 Minimal API  |
| Registry | ghcr.io/yoramvandevelde     |
| Deploy   | ArgoCD + Kustomize          |

## Repo structure

```
populi/
├── frontend/          # React app
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   └── Populi/        # C# Minimal API
│       ├── Program.cs
│       ├── Populi.csproj
│       └── Dockerfile (in backend/)
├── k8s/
│   ├── base/          # Namespace, deployments, services, ingress, network policies
│   └── overlays/dev/  # Image tags (updated by CI)
└── .github/workflows/
    └── build.yaml     # Build + push + update image tags
```

## CI/CD flow

1. Push to `main`
2. GitHub Actions builds both images, pushes to ghcr.io with the short SHA as tag
3. Action commits the updated tag back to `k8s/overlays/dev/kustomization.yaml`
4. ArgoCD detects the change and syncs

## Deploy to cluster

Drop `k8s/argocd-app.yaml` into `k8s-gitops/apps/` and ArgoCD picks it up.

## Local dev

```bash
# Backend
cd backend/Populi && dotnet run

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Frontend proxies `/api` to `http://localhost:5000` via Vite dev server.
# populi
