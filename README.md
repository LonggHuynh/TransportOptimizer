# TransportOptimizer: Efficient Trip Planning Application

## Description

TransportOptimizer assists users in efficiently planning their travel route by sequencing their desired destinations. Leveraging the modified Traveling Salesman Problem (TSP) algorithm, it lets users apply optional constraints, such as mandating the sequence of specific locations. The app uses Google Maps APIs for map rendering, geocoding/autocomplete, directions, and time-aware matrix optimization.

## Tech stack

- React/TypeScript
- C#/.NET 8
- Docker
- Kubernetes/EKS
- Terraform
- Github Actions

## Architecture

![Alt text](TransportEKSArchitecture.png "EKS Architecture")

## Variables

### Frontend Build Environment Variables

| Variable Name                       | Description                                                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                      | URL of the backend API (default: `/api`).                                                                                                                                                             |
| `VITE_TILE_URL`                     | Optional override for the backend tile endpoint (default: `${VITE_API_URL}/tiles/{z}/{x}/{y}.png`).                                                                                                 |

### Backend Runtime Environment Variables

| Variable Name                 | Description                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `CorsSettings:AllowedOrigins` | Origins for CORS settings in the backend. No cors needed for the deployment. |
| `GoogleMaps:ServiceAccountScopes:0` | OAuth scope item. Default is `https://www.googleapis.com/auth/cloud-platform`. |
| `GoogleMaps:QuotaProject` | Optional billing/quota project ID sent as `X-Goog-User-Project`. |
| `GoogleMaps:TilesApiUrl` | Tiles base URL (default: `https://tile.googleapis.com/v1`). |
| `GoogleMaps:PlacesApiUrl` | Places base URL (default: `https://places.googleapis.com/v1`). |
| `GoogleMaps:RoutesApiUrl` | Routes base URL (default: `https://routes.googleapis.com`). |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name for backend traces (default: `transport-optimizer-backend`). |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint for backend trace export (for example `http://otel-collector:4318/v1/traces`). |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | OTLP protocol for backend exporter. Use `http/protobuf` for HTTP endpoint mode. |

### Worker Runtime Environment Variables

| Variable Name | Description |
| ------------- | ----------- |
| `REDIS_URL` | Redis endpoint or URL used by worker. |
| `CELERY_QUEUE` | Celery queue key (default: `route`). |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name for worker traces (default: `transport-optimizer-worker`). |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint for worker trace export (for example `http://otel-collector:4318/v1/traces`). |

### Local Trace Server (Collector + Jaeger)

Start local dependencies:

```bash
docker compose up -d redis jaeger otel-collector
```

Use these env vars for local backend and worker:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

If backend/worker run inside Kubernetes, use:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

Jaeger UI:

```bash
http://localhost:16686
```

## Running the application

### With locally .NET and Node.js (TBD)

### Deploy locally with Docker compose

Start local dependencies (Redis + observability stack):

```bash
docker compose up -d
```

To shutdown

```bash
docker compose down
```

### Deploy to K8s cluster

You first need to connect to the K8s cluster, e.g.:

```bash
aws eks update-kubeconfig --name _your_eks_cluster_name
```

or create your own local cluster, e.g.

```
k3d create cluster _your_cluster_name
```

The k8s cluster will pull the images from DockerHub. After that, apply the k8s files with the environment variables using

```
kubectl apply -f infra/k8s/namespaces.yaml
helm upgrade --install transport-optimizer infra/app-chart --namespace transport-stage
# or use --namespace transport-prod
```

## Google Service Account Setup

1. In Google Cloud Console, open your project and enable: Places API (New), Routes API, and Map Tiles API.
2. Create a service account:
`IAM & Admin -> Service Accounts -> Create Service Account`.
3. Grant required roles to that service account:
`roles/serviceusage.serviceUsageConsumer` (or another role that includes `serviceusage.services.use`).
4. Create and download a JSON key for the service account.
5. Store the key securely on the backend host (for example `/secrets/google-maps-sa.json`).
6. Configure backend env vars:
`GOOGLE_APPLICATION_CREDENTIALS=/secrets/google-maps-sa.json`
and optionally set app config
`GoogleMaps:QuotaProject=<your-gcp-project-id>`.
7. Restart backend and verify `/api/tiles/{z}/{x}/{y}.png` and route/geocode flows.
