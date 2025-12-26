// Boggle Game - Azure Infrastructure
// Deploys: App Service (backend) + Static Web App (frontend)

targetScope = 'resourceGroup'

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Base name for all resources')
param appName string = 'bogglegame'

@description('GitHub repository URL for Static Web App deployment')
param repositoryUrl string = ''

@description('GitHub branch for deployment')
param branch string = 'main'

// Generate unique suffix for globally unique names
var uniqueSuffix = uniqueString(resourceGroup().id)
var resourcePrefix = '${appName}-${environment}'

// ============================================================================
// App Service Plan (for .NET backend)
// ============================================================================
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${resourcePrefix}-plan-${uniqueSuffix}'
  location: location
  sku: {
    name: environment == 'prod' ? 'P1v3' : 'B1'
    tier: environment == 'prod' ? 'PremiumV3' : 'Basic'
  }
  properties: {
    reserved: false // Windows for .NET
  }
  tags: {
    environment: environment
    app: appName
  }
}

// ============================================================================
// App Service (for .NET SignalR backend)
// ============================================================================
resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: '${resourcePrefix}-api-${uniqueSuffix}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      netFrameworkVersion: 'v8.0'
      webSocketsEnabled: true // Required for SignalR
      alwaysOn: environment == 'prod'
      http20Enabled: true
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [
          'https://${staticWebApp.properties.defaultHostname}'
          'http://localhost:3000' // For local development
        ]
        supportCredentials: true
      }
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: environment == 'prod' ? 'Production' : 'Development'
        }
      ]
    }
  }
  tags: {
    environment: environment
    app: appName
    component: 'backend'
  }
}

// ============================================================================
// Static Web App (for Next.js frontend)
// ============================================================================
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${resourcePrefix}-web-${uniqueSuffix}'
  location: 'eastus2' // SWA has limited regions
  sku: {
    name: environment == 'prod' ? 'Standard' : 'Free'
    tier: environment == 'prod' ? 'Standard' : 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    buildProperties: {
      appLocation: '/boggle-client'
      apiLocation: ''
      outputLocation: ''
      appBuildCommand: 'npm run build'
    }
  }
  tags: {
    environment: environment
    app: appName
    component: 'frontend'
  }
}

// Static Web App app settings (environment variables)
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    NEXT_PUBLIC_HUB_URL: 'https://${appService.properties.defaultHostName}/gameHub'
  }
}

// ============================================================================
// Outputs
// ============================================================================
output backendUrl string = 'https://${appService.properties.defaultHostName}'
output frontendUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output appServiceName string = appService.name
output staticWebAppName string = staticWebApp.name
output signalRHubUrl string = 'https://${appService.properties.defaultHostName}/gameHub'

