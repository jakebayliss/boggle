<#
.SYNOPSIS
    Builds and deploys the .NET backend to Azure App Service

.PARAMETER ResourceGroupName
    The resource group containing the App Service

.PARAMETER AppServiceName
    The name of the App Service (from Bicep output)

.EXAMPLE
    .\deploy-backend.ps1 -ResourceGroupName rg-bogglegame-dev -AppServiceName bogglegame-dev-api-xxx
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory = $true)]
    [string]$AppServiceName
)

$ErrorActionPreference = 'Stop'
$projectPath = "$PSScriptRoot\..\BoggleGame.Server"
$publishPath = "$PSScriptRoot\..\publish"

Write-Host "🔨 Building .NET Backend" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Clean and publish
Write-Host "Publishing project..." -ForegroundColor Gray
if (Test-Path $publishPath) {
    Remove-Item $publishPath -Recurse -Force
}

dotnet publish $projectPath -c Release -o $publishPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Create zip for deployment
$zipPath = "$PSScriptRoot\backend-deploy.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host "Creating deployment package..." -ForegroundColor Gray
Compress-Archive -Path "$publishPath\*" -DestinationPath $zipPath

# Deploy to Azure
Write-Host "Deploying to Azure App Service..." -ForegroundColor Gray
az webapp deployment source config-zip `
    --resource-group $ResourceGroupName `
    --name $AppServiceName `
    --src $zipPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Cleanup
Remove-Item $zipPath -Force
Remove-Item $publishPath -Recurse -Force

Write-Host ""
Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green

# Get the URL
$appUrl = az webapp show --resource-group $ResourceGroupName --name $AppServiceName --query "defaultHostName" -o tsv
Write-Host "🌐 Backend URL: https://$appUrl" -ForegroundColor Cyan
Write-Host "🔌 SignalR Hub: https://$appUrl/gameHub" -ForegroundColor Cyan

