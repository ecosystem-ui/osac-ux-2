import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  PageSection,
  Pagination,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { useMaasModels } from '../../api/v1/maas';
import type { MaasModel } from '../../api/v1/maas';
import { useTranslation } from '../../hooks/useTranslation';

const GOVERNANCE_CLUSTER_ID = 'cloud-provider';

const modelStatus = (model: MaasModel) => {
  if (model.hasDeployment) {
    return { label: 'Saved to Git', color: 'green' as const };
  }
  return { label: 'Registered', color: 'blue' as const };
};

const MaaSModelsPage = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [expandedModel, setExpandedModel] = useState<string>();
  const { data: models = [], error, isLoading, refetch } = useMaasModels(GOVERNANCE_CLUSTER_ID);

  const filteredModels = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return models;
    }
    return models.filter((model) =>
      [model.name, model.displayName, model.modelName, model.description, ...model.locations]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [models, search]);

  const pagedModels = filteredModels.slice((page - 1) * perPage, page * perPage);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <PageSection>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1">{t('Models')}</Title>
          <Content component="p">
            {t('Add and remove model deployments saved to Git for AI Grid serving.')}
          </Content>
        </StackItem>
        <StackItem>
          {error ? (
            <Alert variant="danger" isInline title={t('Unable to load models')}>
              {error instanceof Error ? error.message : t('Try again later.')}
              <Button variant="link" onClick={() => void refetch()}>
                {t('Retry')}
              </Button>
            </Alert>
          ) : isLoading ? (
            <div className="maas-governance__loading">
              <Spinner />
            </div>
          ) : models.length === 0 ? (
            <EmptyState titleText={t('No models')}>
              <EmptyStateBody>
                {t('Add a deployment to configure a model for serving.')}
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <>
              <Toolbar>
                <ToolbarContent>
                  <ToolbarGroup>
                    <ToolbarItem>
                      <SearchInput
                        value={search}
                        onChange={(_event, value) => onSearch(value)}
                        onClear={() => onSearch('')}
                        placeholder={t('Filter models')}
                        aria-label={t('Filter models')}
                      />
                    </ToolbarItem>
                    <ToolbarItem>
                      <Button variant="primary" onClick={() => undefined}>
                        {t('Deploy model')}
                      </Button>
                    </ToolbarItem>
                  </ToolbarGroup>
                </ToolbarContent>
              </Toolbar>
              {filteredModels.length === 0 ? (
                <EmptyState titleText={t('No models match the filter')}>
                  <EmptyStateBody>
                    <Button variant="link" onClick={() => onSearch('')}>
                      {t('Clear filter')}
                    </Button>
                  </EmptyStateBody>
                </EmptyState>
              ) : (
                <>
                  <Table aria-label={t('Model deployments')} variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('Model deployment name')}</Th>
                        <Th>{t('Model')}</Th>
                        <Th>{t('Replica count')}</Th>
                        <Th>{t('Locations')}</Th>
                        <Th>{t('Last saved')}</Th>
                        <Th>{t('Status')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {pagedModels.map((model) => {
                        const status = modelStatus(model);
                        const isExpanded = expandedModel === model.name;
                        return (
                          <Tbody key={model.name} isExpanded={isExpanded}>
                            <Tr>
                              <Td dataLabel={t('Model deployment name')}>
                                <strong>{model.displayName ?? model.name}</strong>
                                <Content component="small">{model.name}</Content>
                              </Td>
                              <Td dataLabel={t('Model')}>
                                {model.modelName ?? model.modelRef.name}
                              </Td>
                              <Td dataLabel={t('Replica count')}>{model.replicas ?? '—'}</Td>
                              <Td dataLabel={t('Locations')}>
                                <Button
                                  variant="link"
                                  isInline
                                  onClick={() =>
                                    setExpandedModel(isExpanded ? undefined : model.name)
                                  }
                                >
                                  {model.locations.length}
                                </Button>
                              </Td>
                              <Td dataLabel={t('Last saved')}>
                                {model.creationTimestamp
                                  ? new Date(model.creationTimestamp).toLocaleString()
                                  : '—'}
                              </Td>
                              <Td dataLabel={t('Status')}>
                                <Label color={status.color} isCompact>
                                  {t(status.label)}
                                </Label>
                              </Td>
                            </Tr>
                            {isExpanded && (
                              <Tr>
                                <Td colSpan={6}>
                                  <Table aria-label={t('Locations')} variant="compact">
                                    <Thead>
                                      <Tr>
                                        <Th>{t('Location name')}</Th>
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      {model.locations.length === 0 ? (
                                        <Tr>
                                          <Td>{t('No locations')}</Td>
                                        </Tr>
                                      ) : (
                                        model.locations.map((location) => (
                                          <Tr key={location}>
                                            <Td dataLabel={t('Location name')}>{location}</Td>
                                          </Tr>
                                        ))
                                      )}
                                    </Tbody>
                                  </Table>
                                </Td>
                              </Tr>
                            )}
                          </Tbody>
                        );
                      })}
                    </Tbody>
                  </Table>
                  <Pagination
                    itemCount={filteredModels.length}
                    page={page}
                    perPage={perPage}
                    onSetPage={(_event, nextPage) => setPage(nextPage)}
                    onPerPageSelect={(_event, nextPerPage, nextPage) => {
                      setPerPage(nextPerPage);
                      setPage(nextPage);
                    }}
                    perPageOptions={[
                      { title: '5', value: 5 },
                      { title: '10', value: 10 },
                      { title: '20', value: 20 },
                    ]}
                    isCompact
                  />
                </>
              )}
            </>
          )}
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default MaaSModelsPage;
