<# 
.SYNOPSIS
    Deploys the Boggle Game infrastructure to Azure using Bicep

.DESCRIPTION
    This script creates a resource group and deploys the Bicep template.
    Prerequisites: Azure CLI installed and logged in (az login)

.PARAMETER Environment
    Target environment (dev, staging, prod). Default: dev

.PARAMETER Location
    Azure region for the resource group. Default: eastus

.PARAMETER ResourceGroupName
    Optional custom resource group name

.EXAMPLE
    .\deploy.ps1 -Environment dev -Location eastus
#>

param(
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev',
    
    [string]$Location = 'eastus',
    
    [string]$ResourceGroupName = '',
    
    [string]$RepositoryUrl = '',
    
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

# Set resource group name if not provided
if (-not $ResourceGroupName) {
    $ResourceGroupName = "rg-bogglegame-$Environment"
}

Write-Host "🎲 Boggle Game Deployment" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host ""

# Check if logged in to Azure
Write-Host "Checking Azure login status..." -ForegroundColor Gray
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}
Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green

# Create resource group
Write-Host ""
Write-Host "Creating resource group..." -ForegroundColor Gray
az group create --name $ResourceGroupName --location $Location --output none
Write-Host "Resource group created/verified." -ForegroundColor Green

# Deploy Bicep template
Write-Host ""
Write-Host "Deploying infrastructure..." -ForegroundColor Gray

$deployParams = @(
    'deployment', 'group', 'create',
    '--resource-group', $ResourceGroupName,
    '--template-file', "$PSScriptRoot\main.bicep",
    '--parameters', "environment=$Environment",
    '--parameters', "repositoryUrl=$RepositoryUrl",
    '--parameters', "branch=$Branch",
    '--output', 'json'
)

$result = az @deployParams | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Display outputs
Write-Host ""
Write-Host "✅ Deployment Successful!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resource URLs:" -ForegroundColor Cyan
Write-Host "  Backend API:  $($result.properties.outputs.backendUrl.value)" -ForegroundColor White
Write-Host "  Frontend:     $($result.properties.outputs.frontendUrl.value)" -ForegroundColor White
Write-Host "  SignalR Hub:  $($result.properties.outputs.signalRHubUrl.value)" -ForegroundColor White
Write-Host ""
Write-Host "📦 Resource Names:" -ForegroundColor Cyan
Write-Host "  App Service:      $($result.properties.outputs.appServiceName.value)" -ForegroundColor White
Write-Host "  Static Web App:   $($result.properties.outputs.staticWebAppName.value)" -ForegroundColor White
Write-Host ""

# Next steps
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Deploy backend: " -ForegroundColor White -NoNewline
Write-Host "az webapp deploy --resource-group $ResourceGroupName --name $($result.properties.outputs.appServiceName.value) --src-path <publish-folder>" -ForegroundColor Gray
Write-Host "  2. For Static Web App: Link your GitHub repo in Azure Portal or use SWA CLI" -ForegroundColor White
Write-Host ""

