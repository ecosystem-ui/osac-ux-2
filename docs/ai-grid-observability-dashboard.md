# AI Grid Observability Dashboard

## Overview

The AI Grid Observability Dashboard is a cloud admin-only feature that monitors cluster availability, gateway performance, and infrastructure resource usage across the AI Grid fleet.

**Status**: Mock implementation ready for UI development and testing.

**Persona**: Cloud Provider Admin only

**Access**: `/admin/observability` (visible in admin navigation sidebar)

## Features

### Overview Section
- **Available Clusters**: Shows ratio of ready clusters to total enrolled
- **Requests in Window**: Total gateway requests for selected time period
- **Average GPU Utilization**: Fleet-wide GPU utilization with warning indicator at >85%
- **Request Success Rate**: Percentage of successful requests (non-5xx responses)

### Cluster Resource Overview
- **Infrastructure GPU Utilization**: Time-series chart showing GPU usage across fleet
- **Gateway Request Rate**: Time-series chart showing requests per second

### Gateway Performance
- **Gateway Error Rate (5xx)**: Time-series chart of 5xx errors per second
- **Gateway p95 Latency**: Time-series chart of 95th percentile latency in milliseconds

### Managed Clusters Table
Lists all enrolled clusters with:
- Cluster name
- Site name and identifier
- Location label
- Availability status (Ready/Offline/Unknown)
- Provisioning status (Provisioned/Pending/Failed)

### Time Range Selection
- Last 1 hour (default)
- Last 6 hours
- Last 24 hours

### Interactive Charts
- Hover to see exact values at specific timestamps
- Auto-scaling based on data range
- Visual indicators (warning line at 90% GPU utilization)
- Color-coded by metric type (GPU=blue, requests=green, errors=red, latency=purple)

## Architecture

### Files Created

#### API Layer
**`libs/ui-components/src/api/v1/grid-monitoring.ts`**
- `useGridOverview` query hook
- TypeScript interfaces for grid clusters, metrics, and overview data
- Mock data generator with realistic time-series patterns
- Utility functions for metric aggregation

#### UI Layer
**`libs/ui-components/src/pages/admin/GridObservabilityPage.tsx`**
- Main dashboard page component
- `StatCard` component for overview metrics
- `MetricChart` component for interactive time-series visualization
- Integrated with PatternFly components

**`libs/ui-components/src/pages/admin/GridObservabilityPage.css`**
- Dashboard layout and styling
- Responsive grid for metric charts
- Chart interaction styles

#### Routing & Navigation
- **AppShell**: Added `/admin/observability` route
- **shellNav**: Added to Administration section (cloud admin only)
- **api/types**: Added `v1/grid/overview` to ApiRoute union

## Mock Data

### Clusters
5 mock clusters across 3 regions:
- **US East (Virginia)**: 2 clusters, both Ready
- **US West (California)**: 1 cluster, Ready
- **EU Central (Frankfurt)**: 1 cluster, Offline
- **EU West (Ireland)**: 1 cluster, Ready

### Metrics
All metrics generated with deterministic pseudo-random values:
- **Request rate**: ~800 req/s baseline with ±200 req/s variation and periodic trends
- **Error rate**: 1-3% of request rate
- **Latency**: 50-100ms baseline, increases with load
- **GPU utilization**: Follows request traffic with lag, caps at 95%

### Time Series Generation
- 60 data points per time range
- Deterministic noise based on timestamp seeds
- Correlation between request load and GPU usage
- Offline clusters produce no metrics

## Integration Path

### Current State
✅ Mock implementation with comprehensive UI
✅ Cloud admin persona restriction
✅ Time range selection and chart interaction
✅ All overview stats and cluster table

### Phase 1: Backend API Stub
**fulfillment-service** needs:
```
GET /api/fulfillment/v1/grid/overview?range={1h|6h|24h}&site={site_id}
```

Return structure:
```typescript
{
  updatedAt: string;           // ISO timestamp
  inventorySource: 'git' | 'acm' | 'demo';
  demo: boolean;               // True if using mock data
  metricsSource: 'thanos' | 'demo';
  clusters: GridCluster[];     // ACM inventory
  metrics: GridMetric[];       // Time-series data
}
```

### Phase 2: ACM Integration
- Connect to ACM hub to fetch enrolled ManagedClusters
- Filter by `ai-grid/enabled: "true"` label
- Map cluster status from ACM conditions
- Extract site metadata from labels/annotations:
  - `ai-grid/site`: site identifier
  - `ai-grid/site-name`: human-readable site name
  - `ai-grid/latitude`, `ai-grid/longitude`: geographic coordinates
  - `ai-grid/region`: region grouping
  - `location`: placement location for model routing

### Phase 3: Thanos Integration
Configure backend with:
- `THANOS_QUERY_URL`: Thanos Query HTTP(S) endpoint
- `THANOS_TOKEN_FILE`: Optional bearer token path
- Optional query overrides for each metric

Query structure:
```promql
# Requests
sum(rate(ai_gateway_requests_total{cluster=~__CLUSTERS__}[5m]))

# Errors (5xx)
sum(rate(ai_gateway_requests_total{status=~"5..",cluster=~__CLUSTERS__}[5m]))

# Latency (p95)
histogram_quantile(0.95, sum by(le) (rate(ai_gateway_request_duration_seconds_bucket{cluster=~__CLUSTERS__}[5m])))

# GPU utilization
avg(DCGM_FI_DEV_GPU_UTIL{cluster=~__CLUSTERS__})
```

Backend substitutes `__CLUSTERS__` with escaped regex of selected cluster names.

### Phase 4: Real-time Updates
- Remove fixed 60-second refetch interval
- Add WebSocket or SSE for live metric streaming
- Implement alert thresholds and notifications

## Usage

### As a Cloud Admin
1. Log in with cloud-provider-admin role
2. Navigate to **Administration** → **AI Grid Observability**
3. Select desired time range (1h/6h/24h)
4. Review overview metrics for quick health check
5. Examine time-series charts for trends
6. Inspect individual cluster details in the table
7. Use Refresh button to reload latest data

### For Developers
To test the dashboard in mock mode:
```bash
cd repositories/osac-prg/osac-ux
pnpm dev
```

Then navigate to `/admin/observability` with the admin persona selected.

## Design Decisions

### Cloud Admin Only
The observability dashboard exposes fleet-wide infrastructure metrics and cluster inventory that should only be visible to cloud provider administrators, not tenant admins or users.

### No Site Filtering (Initial)
The PoC includes optional site filtering, but the initial implementation shows all enrolled sites. Site filtering can be added later via a dropdown selector or URL parameter.

### No Model/Tenant Tabs (Initial)
The PoC includes additional tabs for per-model metrics and per-tenant token consumption. These are omitted from the initial implementation to focus on core cluster monitoring. They can be added in future iterations once:
- Model deployments are tracked in osac-operator
- Tenant token telemetry is available from maas-api
- Per-model and per-tenant Thanos queries are defined

### Simulated Metrics
Mock metrics use deterministic pseudo-random generation to provide realistic-looking time-series data for UI development. This allows:
- Frontend development without backend dependency
- Consistent behavior for screenshots and demos
- Easy testing of different data patterns (spikes, trends, saturation)

### PatternFly Alignment
All components use PatternFly 6 primitives (Card, Alert, Label, Table, ToggleGroup) to maintain visual consistency with the rest of OSAC UI.

## Testing Scenarios

### Healthy Fleet
- All clusters Ready
- GPU utilization <85%
- Error rate <1%
- Latency <100ms

### Degraded Performance
- Some clusters Offline
- GPU utilization >85% (warning indicator)
- Elevated error rate
- Increased latency correlated with load

### No Data
- Metrics status `not-configured` or `unavailable`
- Empty cluster list
- Helpful error messages

## Future Enhancements

1. **Site Filtering**: Add dropdown to filter by specific site/region
2. **Model Metrics Tab**: Per-model deployment performance (queue depth, TTFT, throughput, KV cache)
3. **Tenant Usage Tab**: Per-tenant token consumption (input/output/cached)
4. **Alerting**: Configurable thresholds with notifications
5. **Historical Comparison**: Overlay previous time period on charts
6. **Export**: Download metrics as CSV or JSON
7. **Custom Dashboards**: Allow admins to configure visible metrics
8. **Drill-down**: Link from cluster table to detailed cluster view

## References

- **PoC Implementation**: `repositories/UXD/ai-grid-cloud-provider-poc/src/app/pages/grid/`
- **PoC Documentation**: `repositories/UXD/ai-grid-cloud-provider-poc/docs/grid-monitoring.md`
- **Integration Architecture**: `forks/arch/ai-grid/integration.md`
- **MaaS Mock Data**: `docs/maas-mock-data.md`
