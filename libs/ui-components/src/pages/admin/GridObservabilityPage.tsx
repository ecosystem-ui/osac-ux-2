import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Label,
  PageSection,
  Stack,
  StackItem,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import {
  getMetricAverage,
  getMetricTotal,
  useGridOverview,
} from '../../api/v1/grid-monitoring';
import type { GridMetric } from '../../api/v1/grid-monitoring';
import { useTranslation } from '../../hooks/useTranslation';

import './GridObservabilityPage.css';

// ─── Stat Card Component ───────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  warn?: boolean;
}

const StatCard = ({ label, value, unit, warn = false }: StatCardProps) => (
  <Card
    isCompact
    className={`grid-observability__stat-card${warn ? ' grid-observability__stat-card--warn' : ''}`}
  >
    <CardBody>
      <div className="grid-observability__stat-label">{label}</div>
      <div className="grid-observability__stat-value">
        {value}
        {unit && <span className="grid-observability__stat-unit">{unit}</span>}
      </div>
    </CardBody>
  </Card>
);

// ─── Metric Chart Component ────────────────────────────────────────────────────

interface MetricChartProps {
  metric: GridMetric;
}

const MetricChart = ({ metric }: MetricChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (metric.status !== 'ok' || metric.points.length === 0) {
    return (
      <Card isCompact>
        <CardBody>
          <Title headingLevel="h3" size="md">
            {metric.label}
          </Title>
          <p className="grid-observability__empty-metric">
            {metric.message ?? 'No data available.'}
          </p>
        </CardBody>
      </Card>
    );
  }

  const points = metric.points;
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const start = firstPoint.timestamp;
  const end = lastPoint.timestamp;
  const ceiling = metric.unit === '%' ? 100 : Math.max(1, ...points.map((p) => p.value)) * 1.12;

  const x = (timestamp: number) => 48 + ((timestamp - start) / (end - start || 1)) * 506;
  const y = (value: number) => 156 - (value / ceiling) * 132;

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.timestamp)} ${y(p.value)}`)
    .join(' ');

  const colorMap: Record<string, string> = {
    gpu: 'var(--pf-t--global--color--blue--40)',
    requests: 'var(--pf-t--global--color--green--40)',
    errors: 'var(--pf-t--global--color--red--40)',
    latency: 'var(--pf-t--global--color--purple--40)',
  };
  const color = colorMap[metric.key] || 'var(--pf-t--global--color--blue--40)';

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : undefined;

  const format = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: ceiling < 5 ? 3 : 1 });

  return (
    <Card isCompact>
      <CardBody>
        <Title headingLevel="h3" size="md" className="grid-observability__chart-title">
          {metric.label}
        </Title>
        <svg
          viewBox="0 0 580 190"
          role="img"
          aria-label={`${metric.label} over time`}
          className="grid-observability__chart"
          onMouseLeave={() => setHoveredIndex(null)}
          onMouseMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const cursor = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 580;
            const index = Math.max(
              0,
              Math.min(points.length - 1, Math.round(((cursor - 48) / 506) * (points.length - 1))),
            );
            setHoveredIndex(index);
          }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line
                x1="48"
                x2="554"
                y1={y(ceiling * f)}
                y2={y(ceiling * f)}
                stroke="currentColor"
                opacity="0.1"
              />
              <text x="42" y={y(ceiling * f) + 4} textAnchor="end" fontSize="10" fill="currentColor">
                {format(ceiling * f)}
                {metric.unit === '%' ? '%' : ''}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={`${pathData} L554 156 L48 156 Z`} fill={color} opacity="0.2" />

          {/* Line */}
          <path d={pathData} fill="none" stroke={color} strokeWidth="1.5" />

          {/* GPU warning line at 90% */}
          {metric.key === 'gpu' && (
            <line
              x1="48"
              x2="554"
              y1={y(90)}
              y2={y(90)}
              stroke="var(--pf-t--global--color--orange--40)"
              strokeDasharray="4 3"
            />
          )}

          {/* Time labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <text
              key={f}
              x={48 + f * 506}
              y="179"
              textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
              fontSize="10"
              fill="currentColor"
            >
              {new Date((start + f * (end - start)) * 1000).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </text>
          ))}

          {/* Hover indicator */}
          {hoveredPoint && (
            <g>
              <line
                x1={x(hoveredPoint.timestamp)}
                x2={x(hoveredPoint.timestamp)}
                y1="24"
                y2="156"
                stroke={color}
                opacity="0.5"
              />
              <circle cx={x(hoveredPoint.timestamp)} cy={y(hoveredPoint.value)} r="3" fill={color} />
              <rect
                x={Math.min(370, Math.max(48, x(hoveredPoint.timestamp) - 80))}
                y="0"
                width="185"
                height="22"
                rx="3"
                fill="var(--pf-t--global--background--color--primary--default)"
                stroke={color}
              />
              <text
                x={Math.min(370, Math.max(48, x(hoveredPoint.timestamp) - 80)) + 7}
                y="15"
                fontSize="11"
                fill="currentColor"
              >
                {new Date(hoveredPoint.timestamp * 1000).toLocaleTimeString()} ·{' '}
                {format(hoveredPoint.value)} {metric.unit}
              </text>
            </g>
          )}
        </svg>
        <p className="grid-observability__chart-caption">
          Latest: {format(lastPoint.value)} {metric.unit} ·{' '}
          {new Date(lastPoint.timestamp * 1000).toLocaleTimeString()}
        </p>
      </CardBody>
    </Card>
  );
};

// ─── Main Page Component ───────────────────────────────────────────────────────

const GridObservabilityPage = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState<'1h' | '6h' | '24h'>('1h');

  const { data, isLoading, error, refetch } = useGridOverview({ range });

  const clusters = data?.clusters ?? [];
  const metrics = data?.metrics ?? [];

  const requestsMetric = metrics.find((m) => m.key === 'requests');
  const errorsMetric = metrics.find((m) => m.key === 'errors');
  const latencyMetric = metrics.find((m) => m.key === 'latency');
  const gpuMetric = metrics.find((m) => m.key === 'gpu');

  const requestTotal = getMetricTotal(requestsMetric);
  const errorTotal = getMetricTotal(errorsMetric);
  const avgGpu = getMetricAverage(gpuMetric);

  const successRate =
    requestTotal !== undefined && requestTotal > 0 && errorTotal !== undefined
      ? Math.max(0, 100 * (1 - errorTotal / requestTotal))
      : undefined;

  const formatMetric = (value: number | undefined) =>
    value === undefined ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <>
      <PageSection variant="default">
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'wrap' }}
        >
          <FlexItem>
            <Stack>
              <StackItem>
                <Title headingLevel="h1" size="3xl">
                  {t('AI Grid Observability')}
                </Title>
              </StackItem>
              <StackItem>
                <p>
                  {t(
                    'Monitor cluster availability, gateway performance, and infrastructure resource usage.',
                  )}
                </p>
              </StackItem>
            </Stack>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                <span>{t('Time period')}:</span>
              </FlexItem>
              <FlexItem>
                <ToggleGroup aria-label={t('Time range')} isCompact>
                  {(['1h', '6h', '24h'] as const).map((r) => (
                    <ToggleGroupItem
                      key={r}
                      text={`${t('Last')} ${r}`}
                      buttonId={`range-${r}`}
                      isSelected={range === r}
                      onChange={() => setRange(r)}
                    />
                  ))}
                </ToggleGroup>
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" onClick={() => refetch()} isDisabled={isLoading}>
                  {t('Refresh')}
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        {error && (
          <Alert isInline variant="danger" title={t('Unable to load observability data')}>
            {error instanceof Error ? error.message : String(error)}
          </Alert>
        )}

        {isLoading && !data && <p role="status">{t('Loading metrics…')}</p>}

        {data && (
          <Stack hasGutter>
            {data.demo && (
              <StackItem>
                <Alert isInline variant="info" title={t('Demo data')}>
                  {t('Inventory and metrics on this page are simulated.')}
                </Alert>
              </StackItem>
            )}

            <StackItem>
              <p style={{ fontSize: '0.875rem', color: 'var(--pf-t--global--color--text--secondary)' }}>
                {t('Inventory')}: {data.inventorySource.toUpperCase()} · {t('Retrieved')}{' '}
                {new Date(data.updatedAt).toLocaleString()} · {t('Metrics')}:{' '}
                {data.metricsSource === 'demo' || data.demo ? t('Demo') : 'Thanos'}
              </p>
            </StackItem>

            {/* Overview Stats */}
            <StackItem>
              <Title headingLevel="h2" size="lg">
                {t('Overview')}
              </Title>
              <p style={{ fontSize: '0.875rem', marginBottom: 'var(--pf-t--global--spacer--md)' }}>
                {t('Metrics summarize the selected')} {range} {t('window. Cluster availability is current ACM inventory.')}
              </p>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <StatCard
                  label={t('Available clusters')}
                  value={`${clusters.filter((c) => c.status === 'Ready').length}/${clusters.length}`}
                />
                <StatCard label={t('Requests in window')} value={formatMetric(requestTotal)} />
                <StatCard
                  label={t('Average GPU utilization')}
                  value={formatMetric(avgGpu)}
                  unit="%"
                  warn={avgGpu !== undefined && avgGpu > 85}
                />
                <StatCard
                  label={t('Request success rate')}
                  value={formatMetric(successRate)}
                  unit="%"
                />
              </Flex>
            </StackItem>

            {/* Cluster Resource Overview */}
            <StackItem>
              <Title headingLevel="h2" size="lg">
                {t('Cluster resource overview')}
              </Title>
              <div className="grid-observability__chart-grid">
                {gpuMetric && <MetricChart metric={gpuMetric} />}
                {requestsMetric && <MetricChart metric={requestsMetric} />}
              </div>
            </StackItem>

            {/* Gateway Performance */}
            <StackItem>
              <Title headingLevel="h2" size="lg">
                {t('Gateway performance')}
              </Title>
              <div className="grid-observability__chart-grid">
                {errorsMetric && <MetricChart metric={errorsMetric} />}
                {latencyMetric && <MetricChart metric={latencyMetric} />}
              </div>
            </StackItem>

            {/* Managed Clusters Table */}
            <StackItem>
              <Title headingLevel="h2" size="lg">
                {t('Managed clusters')}
              </Title>
              <Card>
                <CardBody>
                  <Table aria-label={t('Managed clusters')} variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('Cluster')}</Th>
                        <Th>{t('Site')}</Th>
                        <Th>{t('Location')}</Th>
                        <Th>{t('Availability')}</Th>
                        <Th>{t('Provisioning')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {clusters.length === 0 ? (
                        <Tr>
                          <Td colSpan={5}>{t('No enrolled clusters match this selection.')}</Td>
                        </Tr>
                      ) : (
                        clusters.map((c) => (
                          <Tr key={c.name}>
                            <Td dataLabel={t('Cluster')}>{c.name}</Td>
                            <Td dataLabel={t('Site')}>{c.siteName ?? c.site ?? t('Not assigned')}</Td>
                            <Td dataLabel={t('Location')}>{c.location ?? '—'}</Td>
                            <Td dataLabel={t('Availability')}>
                              <Label
                                color={
                                  c.status === 'Ready' ? 'green' : c.status === 'Offline' ? 'red' : 'grey'
                                }
                              >
                                {c.status}
                              </Label>
                            </Td>
                            <Td dataLabel={t('Provisioning')}>{c.provisioningStatus}</Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </StackItem>
          </Stack>
        )}
      </PageSection>
    </>
  );
};

export default GridObservabilityPage;
