# Boggle Game - Azure Infrastructure

This folder contains Bicep templates and deployment scripts for hosting the Boggle Game on Azure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Azure                                    │
│  ┌──────────────────────┐     ┌──────────────────────────────┐ │
│  │  Static Web App      │     │  App Service                 │ │
│  │  (Next.js Frontend)  │────▶│  (.NET 8 + SignalR Backend)  │ │
│  │                      │     │                              │ │
│  │  • Global CDN        │     │  • WebSockets enabled        │ │
│  │  • Auto SSL          │ WSS │  • Always-on (prod)          │ │
│  │  • CI/CD from GitHub │────▶│  • HTTPS only                │ │
│  └──────────────────────┘     └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Resources Created

| Resource | Purpose | SKU (Dev) | SKU (Prod) |
|----------|---------|-----------|------------|
| **App Service Plan** | Hosts the backend | B1 (Basic) | P1v3 (Premium) |
| **App Service** | .NET 8 SignalR backend | - | - |
| **Static Web App** | Next.js frontend | Free | Standard |

## Prerequisites

1. **Azure CLI** installed and logged in:
   ```powershell
   az login
   ```

2. **Bicep** (included with Azure CLI 2.20.0+):
   ```powershell
   az bicep version
   ```

## Deployment

### Option 1: PowerShell Script (Recommended)

```powershell
# Deploy to dev environment
.\deploy.ps1 -Environment dev -Location eastus

# Deploy to production
.\deploy.ps1 -Environment prod -Location eastus
```

### Option 2: Azure CLI Direct

```powershell
# Create resource group
az group create --name rg-bogglegame-dev --location eastus

# Deploy Bicep template
az deployment group create \
  --resource-group rg-bogglegame-dev \
  --template-file main.bicep \
  --parameters environment=dev
```

### Deploy Backend Code

After infrastructure is created, deploy the .NET backend:

```powershell
.\deploy-backend.ps1 -ResourceGroupName rg-bogglegame-dev -AppServiceName <app-service-name>
```

## GitHub Actions (CI/CD)

The repository includes a GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) that:

1. Builds and deploys the .NET backend to App Service
2. Builds and deploys the Next.js frontend to Static Web Apps

### Setup GitHub Actions

1. Create an Azure Service Principal:
   ```powershell
   az ad sp create-for-rbac --name "bogglegame-github" --role contributor \
     --scopes /subscriptions/{subscription-id}/resourceGroups/rg-bogglegame-dev \
     --sdk-auth
   ```

2. Add the JSON output as a GitHub secret named `AZURE_CREDENTIALS`

3. Push to `main` branch to trigger deployment

## Configuration

### Backend CORS

The backend reads allowed CORS origins from configuration. In Azure, set via App Settings:

```powershell
az webapp config appsettings set \
  --resource-group rg-bogglegame-dev \
  --name <app-service-name> \
  --settings Cors__AllowedOrigins__0="https://your-static-web-app.azurestaticapps.net"
```

### Frontend Environment

The Static Web App automatically receives the `NEXT_PUBLIC_HUB_URL` environment variable pointing to the backend SignalR hub.

## Cost Estimates

| Environment | Estimated Monthly Cost |
|-------------|----------------------|
| **Dev** | ~$15-25/month (B1 App Service + Free SWA) |
| **Prod** | ~$100-150/month (P1v3 + Standard SWA) |

## Cleanup

```powershell
az group delete --name rg-bogglegame-dev --yes --no-wait
```

