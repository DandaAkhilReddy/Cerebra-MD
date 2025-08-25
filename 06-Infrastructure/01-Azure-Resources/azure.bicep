/*
Azure Infrastructure for Cerebra-MD
HHA Medicine Analytics Platform
*/

@description('Prefix for all resources')
param namePrefix string = 'cerebra'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Environment (dev/prod)')
@allowed(['dev', 'prod'])
param environment string = 'dev'

// Variables
var resourceSuffix = '${namePrefix}-${environment}-${uniqueString(resourceGroup().id)}'
var storageAccountName = replace('${resourceSuffix}data', '-', '')
var keyVaultName = '${namePrefix}-kv-${environment}'
var appServicePlanName = '${namePrefix}-plan-${environment}'
var frontendAppName = '${namePrefix}-fe-${environment}'
var backendAppName = '${namePrefix}-api-${environment}'

// Storage Account (Data Lake Gen2)
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    isHnsEnabled: true  // Enable hierarchical namespace for Data Lake
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenant().tenantId
    enablePurgeProtection: true
    enableSoftDelete: true
    enableRbacAuthorization: true
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: environment == 'prod' ? 'P1v2' : 'B1'
  }
  kind: 'linux'
  properties: {
    reserved: true  // Linux
  }
}

// Frontend Web App (Next.js)
resource frontendApp 'Microsoft.Web/sites@2023-01-01' = {
  name: frontendAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: environment == 'prod'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'NEXT_PUBLIC_API_BASE_URL'
          value: 'https://${backendApp.properties.defaultHostName}'
        }
      ]
    }
    httpsOnly: true
  }
}

// Backend API App (FastAPI)  
resource backendApp 'Microsoft.Web/sites@2023-01-01' = {
  name: backendAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      alwaysOn: environment == 'prod'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'ENVIRONMENT'
          value: environment
        }
      ]
    }
    httpsOnly: true
  }
}

// Outputs
output storageAccountName string = storageAccount.name
output keyVaultName string = keyVault.name
output frontendAppName string = frontendApp.name
output backendAppName string = backendApp.name
output frontendUrl string = 'https://${frontendApp.properties.defaultHostName}'
output backendUrl string = 'https://${backendApp.properties.defaultHostName}'