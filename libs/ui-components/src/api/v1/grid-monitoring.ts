// ============================================================================
// AI Grid Observability / Monitoring API Hooks - MOCK IMPLEMENTATION
// ============================================================================
//
// This file provides mock grid monitoring and observability data for the
// Cloud Provider Admin dashboard. All metrics are simulated for UI development.
//
// CURRENT STATE: Mock data with realistic metric structures
//
// FUTURE INTEGRATION: Connect to Thanos Query API via fulfillment-service proxy
//
// Real endpoints:
//   GET /api/fulfillment/v1/grid/overview?range={1h|6h|24h}&site={site_id}
//
// ============================================================================

import { useQuery } from '@tanstack/react-query';

import { apiQueryKey } from '../types';

// ─── Type definitions ──────────────────────────────────────────────────────────

export interface GridCluster {
  name: string;
  site?: string;
  siteName?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  region?: string;
  aiGridEnabled: boolean;
  provisioned: boolean;
  provisioningStatus: 'Provisioned' | 'Pending' | 'Failed';
  status: 'Ready' | 'Offline' | 'Unknown';
}

export interface MetricPoint {
  timestamp: number; // Unix seconds
  value: number;
}

export interface GridMetric {
  key: string;
  label: string;
  unit: string;
  points: MetricPoint[];
  status: 'ok' | 'not-configured' | 'unavailable' | 'no-data';
  message?: string;
}

export interface GridOverview {
  updatedAt: string;
  inventorySource: 'git' | 'acm' | 'demo';
  demo: boolean;
  metricsSource: 'thanos' | 'demo';
  clusters: GridCluster[];
  metrics: GridMetric[];
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_GRID_CLUSTERS: GridCluster[] = [
  {
    name: 'us-east-cluster-1',
    site: 'us-east-1',
    siteName: 'US East (Virginia)',
    latitude: 38.9072,
    longitude: -77.0369,
    location: 'us-east-1',
    region: 'us-east',
    aiGridEnabled: true,
    provisioned: true,
    provisioningStatus: 'Provisioned',
    status: 'Ready',
  },
  {
    name: 'us-east-cluster-2',
    site: 'us-east-1',
    siteName: 'US East (Virginia)',
    latitude: 38.9072,
    longitude: -77.0369,
    location: 'us-east-1',
    region: 'us-east',
    aiGridEnabled: true,
    provisioned: true,
    provisioningStatus: 'Provisioned',
    status: 'Ready',
  },
  {
    name: 'us-west-cluster-1',
    site: 'us-west-2',
    siteName: 'US West (California)',
    latitude: 37.7749,
    longitude: -122.4194,
    location: 'us-west-2',
    region: 'us-west',
    aiGridEnabled: true,
    provisioned: true,
    provisioningStatus: 'Provisioned',
    status: 'Ready',
  },
  {
    name: 'eu-central-cluster-1',
    site: 'eu-central-1',
    siteName: 'EU Central (Frankfurt)',
    latitude: 50.1109,
    longitude: 8.6821,
    location: 'eu-central-1',
    region: 'europe',
    aiGridEnabled: true,
    provisioned: true,
    provisioningStatus: 'Provisioned',
    status: 'Offline',
  },
  {
    name: 'eu-west-cluster-1',
    site: 'eu-west-1',
    siteName: 'EU West (Ireland)',
    latitude: 53.3498,
    longitude: -6.2603,
    location: 'eu-west-1',
    region: 'europe',
    aiGridEnabled: true,
    provisioned: true,
    provisioningStatus: 'Provisioned',
    status: 'Ready',
  },
];

// Generate realistic time-series data
function generateMetricPoints(range: string, baseValue: number, volatility: number): MetricPoint[] {
  const duration = range === '24h' ? 86400 : range === '6h' ? 21600 : 3600;
  const intervals = 60;
  const step = duration / intervals;
  const end = Math.floor(Date.now() / 1000);
  const start = end - duration;

  const points: MetricPoint[] = [];
  for (let i = 0; i <= intervals; i++) {
    const timestamp = start + i * step;
    // Use deterministic pseudo-random based on timestamp
    const seed = timestamp % 1000;
    const noise = (Math.sin(seed) * Math.cos(seed * 1.5) * volatility) / 2;
    const trend = Math.sin((i / intervals) * Math.PI * 2) * (volatility / 4);
    const value = Math.max(0, baseValue + noise + trend);
    points.push({ timestamp, value });
  }
  return points;
}

function generateGPUMetricPoints(requestsMetric: MetricPoint[]): MetricPoint[] {
  // GPU utilization follows request traffic with lag and saturation
  return requestsMetric.map((point, idx) => {
    const prevValue = idx > 0 ? requestsMetric[idx - 1].value : point.value;
    const avgLoad = (point.value + prevValue) / 2;
    const utilization = Math.min(95, (avgLoad / 1000) * 60 + Math.random() * 10);
    return { timestamp: point.timestamp, value: Math.max(0, utilization) };
  });
}

function getMockMetrics(range: string): GridMetric[] {
  const requestPoints = generateMetricPoints(range, 800, 200);
  const errorPoints = requestPoints.map((p) => ({
    timestamp: p.timestamp,
    value: p.value * (0.01 + Math.random() * 0.02), // 1-3% error rate
  }));
  const latencyPoints = requestPoints.map((p) => ({
    timestamp: p.timestamp,
    value: 50 + (p.value / 1000) * 30 + Math.random() * 20, // Latency increases with load
  }));
  const gpuPoints = generateGPUMetricPoints(requestPoints);

  return [
    {
      key: 'requests',
      label: 'Gateway request rate',
      unit: 'req/s',
      points: requestPoints,
      status: 'ok',
    },
    {
      key: 'errors',
      label: 'Gateway error rate (5xx)',
      unit: 'err/s',
      points: errorPoints,
      status: 'ok',
    },
    {
      key: 'latency',
      label: 'Gateway p95 latency',
      unit: 'ms',
      points: latencyPoints,
      status: 'ok',
    },
    {
      key: 'gpu',
      label: 'Infrastructure GPU utilization',
      unit: '%',
      points: gpuPoints,
      status: 'ok',
    },
  ];
}

// ─── Query hooks ───────────────────────────────────────────────────────────────

export interface GridOverviewParams {
  range?: '1h' | '6h' | '24h';
  site?: string;
  includeMetrics?: boolean;
}

// MISSING: replace with real API call once endpoint exists
export const useGridOverview = ({ range = '1h', site, includeMetrics = true }: GridOverviewParams = {}) =>
  useQuery<GridOverview>({
    queryKey: apiQueryKey('v1/grid/overview', [range, site, String(includeMetrics)]),
    queryFn: async () => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const clusters = site
        ? MOCK_GRID_CLUSTERS.filter((c) => c.site === site)
        : MOCK_GRID_CLUSTERS;

      const metrics = includeMetrics ? getMockMetrics(range) : [];

      return {
        updatedAt: new Date().toISOString(),
        inventorySource: 'demo',
        demo: true,
        metricsSource: 'demo',
        clusters,
        metrics,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });

// ─── Utility functions ─────────────────────────────────────────────────────────

export function getMetricTotal(metric: GridMetric | undefined): number | undefined {
  if (!metric || metric.status !== 'ok' || metric.points.length === 0) {
    return undefined;
  }
  return metric.points.reduce((sum, point) => sum + point.value, 0);
}

export function getMetricAverage(metric: GridMetric | undefined): number | undefined {
  const total = getMetricTotal(metric);
  if (total === undefined || !metric || metric.points.length === 0) {
    return undefined;
  }
  return total / metric.points.length;
}

export function getMetricLatest(metric: GridMetric | undefined): number | undefined {
  if (!metric || metric.status !== 'ok' || metric.points.length === 0) {
    return undefined;
  }
  return metric.points[metric.points.length - 1].value;
}
