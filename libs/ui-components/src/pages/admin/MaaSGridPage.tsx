import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Label,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import type { GridCluster } from '../../api/v1/grid-monitoring';
import { useGridOverview } from '../../api/v1/grid-monitoring';
import type { MaasModel } from '../../api/v1/maas';
import { useMaasModels } from '../../api/v1/maas';
import { useTranslation } from '../../hooks/useTranslation';

const GRID_CLUSTER_ID = 'cloud-provider';
const EMPTY_CLUSTERS: GridCluster[] = [];
const EMPTY_MODELS: MaasModel[] = [];
type GridRange = '1h' | '6h' | '24h';

const statusColor = (status: GridCluster['status']) => {
  if (status === 'Ready') {
    return 'green' as const;
  }
  if (status === 'Offline') {
    return 'red' as const;
  }
  return 'grey' as const;
};

const modelsAtCluster = (models: MaasModel[], cluster: GridCluster) =>
  models.filter(
    (model) => model.locations.length === 0 || model.locations.includes(cluster.location ?? ''),
  );

const MaaSGridPage = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState<GridRange>('1h');
  const { data, error, isLoading, refetch } = useGridOverview({ range, includeMetrics: false });
  const {
    data: modelsData,
    error: modelsError,
    refetch: refetchModels,
  } = useMaasModels(GRID_CLUSTER_ID);
  const clusters = data?.clusters ?? EMPTY_CLUSTERS;
  const models = modelsData ?? EMPTY_MODELS;
  const readyClusters = clusters.filter((cluster) => cluster.status === 'Ready').length;
  const sites = new Set(clusters.map((cluster) => cluster.site).filter(Boolean)).size;

  const modelsByCluster = useMemo(
    () => new Map(clusters.map((cluster) => [cluster.name, modelsAtCluster(models, cluster)])),
    [clusters, models],
  );

  const refresh = () => {
    void Promise.all([refetch(), refetchModels()]);
  };

  return (
    <PageSection>
      <Stack hasGutter>
        <StackItem>
          <div className="maas-grid-page__header">
            <div>
              <Title headingLevel="h1">{t('AI Grid')}</Title>
              <Content component="p">
                {t('View enrolled clusters, sites, and model placement across the AI Grid fleet.')}
              </Content>
            </div>
            {/* <div className="maas-grid-page__controls">
              <ToggleGroup aria-label={t('Time range')} isCompact>
                {(['1h', '6h', '24h'] as const).map((value) => (
                  <ToggleGroupItem
                    key={value}
                    text={`${t('Last')} ${value}`}
                    buttonId={`grid-range-${value}`}
                    isSelected={range === value}
                    onChange={() => setRange(value)}
                  />
                ))}
              </ToggleGroup>
              <Button variant="secondary" onClick={refresh} isDisabled={isLoading}>
                {t('Refresh')}
              </Button>
            </div> */}
          </div>
        </StackItem>
        {error && (
          <StackItem>
            <Alert variant="danger" isInline title={t('Unable to load AI Grid')}>
              {error instanceof Error ? error.message : t('Try again later.')}
            </Alert>
          </StackItem>
        )}
        {modelsError && (
          <StackItem>
            <Alert variant="warning" isInline title={t('Models unavailable')}>
              {modelsError instanceof Error ? modelsError.message : t('Try again later.')}
            </Alert>
          </StackItem>
        )}
        {isLoading ? (
          <StackItem>
            <div className="maas-grid-page__loading">
              <Spinner />
            </div>
          </StackItem>
        ) : (
          <>
            {/* <StackItem>
              <div className="maas-grid-page__summary">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Available clusters')}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Title headingLevel="h2" size="4xl">
                      {readyClusters}/{clusters.length}
                    </Title>
                    <Content component="p">{t('Ready / enrolled')}</Content>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Sites')}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Title headingLevel="h2" size="4xl">
                      {sites}
                    </Title>
                    <Content component="p">{t('AI Grid locations')}</Content>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Models')}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Title headingLevel="h2" size="4xl">
                      {models.length}
                    </Title>
                    <Content component="p">{t('Registered and saved')}</Content>
                  </CardBody>
                </Card>
              </div>
            </StackItem> */}
            <StackItem>
              <Card>
                <CardHeader>
                  <CardTitle>{t('Managed clusters')}</CardTitle>
                </CardHeader>
                <CardBody>
                  <Table aria-label={t('Managed clusters')} variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('Cluster')}</Th>
                        <Th>{t('Site')}</Th>
                        <Th>{t('Location')}</Th>
                        <Th>{t('Availability')}</Th>
                        <Th>{t('Provisioning')}</Th>
                        <Th>{t('Models')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {clusters.map((cluster) => (
                        <Tr key={cluster.name}>
                          <Td dataLabel={t('Cluster')}>
                            <strong>{cluster.name}</strong>
                          </Td>
                          <Td dataLabel={t('Site')}>
                            {cluster.siteName ?? cluster.site ?? t('Not assigned')}
                          </Td>
                          <Td dataLabel={t('Location')}>{cluster.location ?? t('Not assigned')}</Td>
                          <Td dataLabel={t('Availability')}>
                            <Label color={statusColor(cluster.status)} isCompact>
                              {cluster.status}
                            </Label>
                          </Td>
                          <Td dataLabel={t('Provisioning')}>{cluster.provisioningStatus}</Td>
                          <Td dataLabel={t('Models')}>
                            {modelsByCluster.get(cluster.name)?.length ?? 0}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {clusters.length === 0 && (
                    <Content component="p">
                      {t('No enrolled clusters match this selection.')}
                    </Content>
                  )}
                </CardBody>
              </Card>
            </StackItem>
          </>
        )}
      </Stack>
    </PageSection>
  );
};

export default MaaSGridPage;
