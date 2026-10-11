#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " FLOODSHIELD — AWS SERVERLESS BACKEND DEPLOYMENT (BASH)"
echo "=========================================================="

REGION="${AWS_REGION:-ap-south-1}"
ENV="hackathon"
STACK_NAME="FloodShield-Backend-${ENV}"

# 1. Check Caller Identity
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Authenticated AWS Account: ${ACCOUNT_ID} (Region: ${REGION})"

# 2. Install dependencies
echo "Installing Lambda dependencies..."
npm install --prefix "$(dirname "$0")" --production

# 3. Check SAM CLI
if command -v sam &> /dev/null; then
    echo "Using AWS SAM CLI..."
    sam build --template "$(dirname "$0")/template.yaml"
    sam deploy --stack-name "${STACK_NAME}" \
               --region "${REGION}" \
               --capabilities CAPABILITY_IAM \
               --parameter-overrides EnvironmentName="${ENV}" EnableBedrock=false \
               --resolve-s3 \
               --no-confirm-changeset
else
    echo "Using AWS CloudFormation CLI..."
    BUCKET="floodshield-deploy-${ACCOUNT_ID}-${REGION}"
    aws s3 mb "s3://${BUCKET}" --region "${REGION}" 2>/dev/null || true
    
    aws cloudformation package \
        --template-file "$(dirname "$0")/template.yaml" \
        --s3-bucket "${BUCKET}" \
        --output-template-file "$(dirname "$0")/packaged.yaml" \
        --region "${REGION}"
        
    aws cloudformation deploy \
        --template-file "$(dirname "$0")/packaged.yaml" \
        --stack-name "${STACK_NAME}" \
        --capabilities CAPABILITY_IAM \
        --region "${REGION}" \
        --parameter-overrides EnvironmentName="${ENV}" EnableBedrock=false
fi

API_URL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" --query "Stacks[0].Outputs[?OutputKey=='ApiEndpointUrl'].OutputValue" --output text)

echo "=========================================================="
echo " Deployed API Gateway URL: ${API_URL}"
echo "=========================================================="

# Update .env
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "${ENV_FILE}" ]; then
    sed -i.bak "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=${API_URL}|" "${ENV_FILE}"
    sed -i.bak "s|VITE_USE_MOCK_DATA=.*|VITE_USE_MOCK_DATA=false|" "${ENV_FILE}"
    rm -f "${ENV_FILE}.bak"
    echo "Updated .env with live AWS API URL."
fi
