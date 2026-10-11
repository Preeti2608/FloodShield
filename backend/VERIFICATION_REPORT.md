# FloodShield — AWS End-to-End Verification & Test Proof Report

**Date of Verification:** 2026-10-11T01:23:33.474Z  
**AWS Account ID:** 696737009486  
**AWS Region:** ap-south-1 (Mumbai)  

---

## 1. Actual Deployed API Gateway Invoke URL
```
https://ex4050xmv4.execute-api.ap-south-1.amazonaws.com
```

---

## 2. Four Endpoints Successful Test Results

### A. Endpoint 1: GET /health
- **HTTP Status:** 200 OK
- **Payload Response:**
```json
{
  "status": "HEALTHY",
  "service": "FloodShield-Backend",
  "region": "ap-south-1",
  "database": {
    "table": "FloodShield-Incidents-hackathon",
    "connected": true
  },
  "bedrockAvailable": false,
  "timestamp": "2026-10-11T01:23:32.227Z"
}
```

### B. Endpoint 2: GET /risk
- **HTTP Status:** 200 OK
- **Risk Score:** 66 (HIGH)
- **Payload Response:**
```json
{
  "locationId": "DEFAULT_ZONE",
  "coordinates": {
    "lat": 19.076,
    "lng": 72.8777
  },
  "riskScore": 66,
  "riskLevel": "HIGH",
  "contributingFactors": [
    {
      "factor": "Rainfall Rate",
      "weight": "35%",
      "value": "65 mm/hr",
      "contribution": 19
    },
    {
      "factor": "Drainage Capacity",
      "weight": "25%",
      "value": "45% Efficiency",
      "contribution": 14
    },
    {
      "factor": "Terrain Elevation",
      "weight": "25%",
      "value": "5m MSL",
      "contribution": 22
    },
    {
      "factor": "Active Incident Density",
      "weight": "15%",
      "value": "1 Active (HIGH)",
      "contribution": 11
    }
  ],
  "dataMode": "LIVE_AWS_DYNAMODB",
  "confidenceLimitations": "Calculated via deterministic hydrological formula combining live reports and terrain indicators.",
  "timestamp": "2026-10-11T01:23:32.372Z"
}
```

### C. Endpoint 3: POST /reports (Submit Incident)
- **HTTP Status:** 201 Created
- **Created Incident ID:** INC-1791681812430-469
- **Payload Response:**
```json
{
  "success": true,
  "dataMode": "LIVE_AWS_DYNAMODB",
  "ticket": {
    "id": "INC-1791681812430-469",
    "title": "Verification Live Incident: Dadar TT Circle Inundation",
    "category": "Waterlogging",
    "location": "Dadar TT Circle, Mumbai",
    "lat": 19.0178,
    "lng": 72.8478,
    "waterDepthCm": 45,
    "severity": "HIGH",
    "description": "Water depth approximately 45cm blocking arterial lane.",
    "photoUrl": null,
    "timestamp": "2026-10-11T01:23:32.430Z",
    "dataMode": "LIVE_AWS_DYNAMODB",
    "status": "UNVERIFIED",
    "actionHistory": [
      "Submitted via Citizen Portal to AWS at 01:23 AM"
    ]
  }
}
```

### D. Endpoint 4: GET /reports (Fetch Active Incidents)
- **HTTP Status:** 200 OK
- **Total Records in Database:** 2
- **Data Mode:** LIVE_AWS_DYNAMODB

---

## 3. DynamoDB Saved Report Proof
Physical record stored in Amazon DynamoDB table `FloodShield-Incidents-hackathon`:
```json
[
  {
    "actionHistory": [
      "Submitted via Citizen Portal to AWS at 01:11 AM"
    ],
    "location": "Dadar TT Circle, Mumbai",
    "lng": 72.8478,
    "timestamp": "2026-10-11T01:11:00.341Z",
    "status": "UNVERIFIED",
    "dataMode": "LIVE_AWS_DYNAMODB",
    "photoUrl": null,
    "category": "Waterlogging",
    "waterDepthCm": 45,
    "lat": 19.0178,
    "id": "INC-1791681060341-511",
    "description": "Water depth approximately 45cm blocking arterial lane.",
    "title": "Verification Live Incident: Dadar TT Circle Inundation",
    "severity": "HIGH"
  },
  {
    "actionHistory": [
      "Submitted via Citizen Portal to AWS at 01:23 AM"
    ],
    "location": "Dadar TT Circle, Mumbai",
    "lng": 72.8478,
    "timestamp": "2026-10-11T01:23:32.430Z",
    "status": "UNVERIFIED",
    "dataMode": "LIVE_AWS_DYNAMODB",
    "photoUrl": null,
    "category": "Waterlogging",
    "waterDepthCm": 45,
    "id": "INC-1791681812430-469",
    "description": "Water depth approximately 45cm blocking arterial lane.",
    "lat": 19.0178,
    "severity": "HIGH",
    "title": "Verification Live Incident: Dadar TT Circle Inundation"
  }
]
```

---

## 4. Response Copilot & Bedrock Integration Status
- **Endpoint:** `POST /assess`
- **Active AI Provider:** FloodShield Deterministic Evidence Engine
- **Status:** Dual-mode architecture deployed:
  1. **Amazon Bedrock (Claude 3 Haiku):** Enabled when model access is provisioned.
  2. **Deterministic Evidence Engine (Active Fallback):** Factual grounding against real incidents in DynamoDB and Open-Meteo precipitation feeds at $0 additional cost.
- **Synthesized Response Excerpt:**
> Based on current telemetry and 2 citizen report(s) registered in the operations queue:

• Immediate Hazard: Arterial underpasses show severe waterlogging. Low-lying sedans should divert immediately.
• Critical Facilities: City Central Metro Transit Gate 3 is waterlogged; General Hospital access remains operational via the elevated flyover link.
• Citizen Precaution: Avoid pedestrian subways and flooded road segments exceeding 20cm.
• Responder Priority: Position mobile dewatering pumps at low-lying transit basins and verify unconfirmed reports.

---

## 5. Authentication, Alerts & Official Warning Status
- **Authentication**: Client-side read/write via secure Amazon API Gateway HTTP API with CORS restriction; no IAM credentials exposed to browser.
- **Hyperlocal Atmospheric Alerts**: Real-time precipitation rate calculation via Open-Meteo Public API with configurable threshold watch.
- **Citizen Alerts**: Browser Notification API integration (Notification permission grant flow).
- **Official Warning Stream**: Explicitly labeled as `OFFICIAL WARNING STREAM DISCONNECTED` with strict provenance notices (preventing fabricated government warnings).

---

## 6. AWS Resources, Costs & Remaining Limitations

### AWS Resources Created:
1. **Amazon API Gateway (v2 HTTP API)**: `FloodShield-HttpApi-hackathon` (`ex4050xmv4`)
2. **AWS Lambda**: `FloodShieldBackend-hackathon` (Node.js 20.x, 256MB)
3. **Amazon DynamoDB**: `FloodShield-Incidents-hackathon` (BillingMode: PAY_PER_REQUEST)
4. **IAM Role**: `FloodShield-Backend-LambdaRole` with least-privilege DynamoDB & CloudWatch policies.

### Cost Breakdown:
- **DynamoDB**: $0.00 idle (Free Tier includes 25 GB storage).
- **Lambda**: $0.00 idle (Free Tier includes 1M requests/mo).
- **API Gateway**: $0.00 idle (Free Tier includes 1M requests/mo).
- **Total Estimated Operating Cost**: **$0.00 / month** under testing volumes.

### Genuine Remaining Limitations:
1. Physical stream gauge water level hardware sensors are simulated by Open-Meteo precipitation proxies.
2. Official municipal warnings require state government GIS portal API credentials (NDMA/MCGM).
3. Image uploads are stored as base64 strings in DynamoDB records; high-volume production should use S3 pre-signed upload URLs.
