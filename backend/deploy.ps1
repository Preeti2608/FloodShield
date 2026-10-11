# FloodShield Automated AWS Serverless Deployment Script (PowerShell 5.1 & 7 Compatible)
# Region: Default to Mumbai (ap-south-1) for lowest latency and cost efficiency

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " FLOODSHIELD - AWS SERVERLESS BACKEND DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check AWS CLI
try {
    $callerJson = aws sts get-caller-identity --output json
    if (-not $callerJson) {
        throw "AWS CLI returned empty response"
    }
    $caller = $callerJson | ConvertFrom-Json
    Write-Host "[OK] AWS CLI Authenticated: $($caller.Arn)" -ForegroundColor Green
    Write-Host "[OK] AWS Account ID: $($caller.Account)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] AWS CLI is not configured or credentials are missing." -ForegroundColor Red
    Write-Host "Please run 'aws configure' in terminal with your AWS Access Key and Secret Key." -ForegroundColor Yellow
    exit 1
}

$Region = "ap-south-1"
$Environment = "hackathon"
$StackName = "FloodShield-Backend-$Environment"

Write-Host ""
Write-Host "[INFO] Target AWS Region: $Region" -ForegroundColor Cyan
Write-Host "[INFO] Target Environment: $Environment" -ForegroundColor Cyan

# 2. Check Amazon Bedrock Model Availability (Optional)
$EnableBedrock = "false"
try {
    Write-Host "[INFO] Checking Amazon Bedrock access in $Region..." -ForegroundColor Cyan
    $bedrockModels = aws bedrock list-foundation-models --region $Region --output json 2>&1
    if ($LASTEXITCODE -eq 0 -and $bedrockModels) {
        $modelsObj = $bedrockModels | ConvertFrom-Json
        if ($modelsObj -and $modelsObj.modelSummaries) {
            $hasClaude = $modelsObj.modelSummaries | Where-Object { $_.modelId -like "*claude-3-haiku*" }
            if ($hasClaude) {
                Write-Host "[OK] Claude 3 Haiku foundation model found in Bedrock." -ForegroundColor Green
                $EnableBedrock = "true"
            }
        }
    }
} catch {
    Write-Host "[INFO] Bedrock check skipped. Using deterministic fallback engine." -ForegroundColor Yellow
    $EnableBedrock = "false"
}

# 3. Install backend dependencies
Write-Host ""
Write-Host "[INFO] Installing backend dependencies..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot"
npm install --production
Pop-Location

# 4. Check if AWS SAM is installed, else use CloudFormation CLI
$hasSam = $false
try {
    $samVer = sam --version 2>&1
    if ($LASTEXITCODE -eq 0 -and $samVer) { 
        $hasSam = $true 
    }
} catch {
    $hasSam = $false
}

$ApiUrl = ""

if ($hasSam) {
    Write-Host "[OK] AWS SAM CLI detected. Building and deploying..." -ForegroundColor Green
    Push-Location "$PSScriptRoot"
    sam build --template template.yaml
    sam deploy --stack-name $StackName `
               --region $Region `
               --capabilities CAPABILITY_IAM `
               --parameter-overrides EnvironmentName=$Environment EnableBedrock=$EnableBedrock `
               --resolve-s3 `
               --no-confirm-changeset
    
    $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --output json | ConvertFrom-Json
    $apiOutput = $outputs.Stacks[0].Outputs | Where-Object { $_.OutputKey -eq "ApiEndpointUrl" }
    $ApiUrl = $apiOutput.OutputValue
    Pop-Location
} else {
    Write-Host "[INFO] Deploying via AWS CloudFormation & S3 Package..." -ForegroundColor Yellow
    
    $BucketName = "floodshield-deploy-$($caller.Account)-$Region"
    aws s3 mb "s3://$BucketName" --region $Region 2>&1 | Out-Null

    Push-Location "$PSScriptRoot"
    aws cloudformation package `
        --template-file template.yaml `
        --s3-bucket $BucketName `
        --output-template-file packaged.yaml `
        --region $Region

    aws cloudformation deploy `
        --template-file packaged.yaml `
        --stack-name $StackName `
        --capabilities CAPABILITY_IAM `
        --region $Region `
        --parameter-overrides EnvironmentName=$Environment EnableBedrock=$EnableBedrock

    $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --output json | ConvertFrom-Json
    $apiOutput = $outputs.Stacks[0].Outputs | Where-Object { $_.OutputKey -eq "ApiEndpointUrl" }
    $ApiUrl = $apiOutput.OutputValue
    Pop-Location
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host " Deployed API Gateway URL: $ApiUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

# 5. Automatically update root .env file
$envPath = "$PSScriptRoot\..\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    $envContent = $envContent -replace 'VITE_API_BASE_URL=.*', "VITE_API_BASE_URL=$ApiUrl"
    $envContent = $envContent -replace 'VITE_USE_MOCK_DATA=.*', "VITE_USE_MOCK_DATA=false"
    Set-Content -Path $envPath -Value $envContent
    Write-Host "[OK] Updated frontend .env with live AWS API URL: $ApiUrl" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next Step: Run the test suite:" -ForegroundColor Cyan
Write-Host ".\test-and-verify.ps1" -ForegroundColor Yellow
