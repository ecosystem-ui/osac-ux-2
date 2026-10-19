import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  PageSection,
  Pagination,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TextInput,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import {
  useCreateMaasAuthPolicy,
  useCreateMaasSubscription,
  useDeleteMaasSubscription,
  useMaasAuthPolicies,
  useMaasModels,
  useMaasSubscriptions,
} from '../../api/v1/maas';
import type { MaasAuthPolicy, MaasModel, MaasSubscription } from '../../api/v1/maas';
import { useTranslation } from '../../hooks/useTranslation';

import './MaaSGovernancePage.css';

const GOVERNANCE_CLUSTER_ID = 'cloud-provider';

type GovernanceTab = 'overview' | 'subscriptions' | 'policies';
type AccessView = 'models' | 'groups';

interface ModelAccessRow {
  model: MaasModel;
  groups: string[];
  subscriptions: string[];
}

interface GroupAccessRow {
  group: string;
  models: string[];
  subscriptions: string[];
}

const statusColor = (subscription: MaasSubscription) =>
  subscription.phase === 'Ready' ? ('green' as const) : ('orange' as const);

const AuthorizationPolicyRow = ({ policy }: { policy: MaasAuthPolicy }) => (
  <Tr>
    <Td dataLabel="Policy">
      <strong>{policy.displayName ?? policy.name}</strong>
      <Content component="small">{policy.name}</Content>
    </Td>
    <Td dataLabel="Status">
      <Label color={policy.phase === 'Ready' ? 'green' : 'orange'} isCompact>
        {policy.phase ?? 'Unknown'}
      </Label>
    </Td>
    <Td dataLabel="Groups">
      {policy.subjects.groups?.map((group) => group.name).join(', ') || 'No groups'}
    </Td>
    <Td dataLabel="Models">{policy.modelRefs.length}</Td>
    <Td dataLabel="Description">{policy.description ?? '—'}</Td>
  </Tr>
);

const MaaSGovernancePage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<GovernanceTab>('overview');
  const [search, setSearch] = useState('');
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionPerPage, setSubscriptionPerPage] = useState(10);
  const [policyPage, setPolicyPage] = useState(1);
  const [policyPerPage, setPolicyPerPage] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaasSubscription>();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [group, setGroup] = useState('');
  const [priority, setPriority] = useState(100);
  const [policyName, setPolicyName] = useState('');
  const [policyDisplayName, setPolicyDisplayName] = useState('');
  const [policyGroup, setPolicyGroup] = useState('');
  const [policyModel, setPolicyModel] = useState('');

  const {
    data: subscriptions = [],
    error,
    isLoading,
    refetch: refetchSubscriptions,
  } = useMaasSubscriptions(GOVERNANCE_CLUSTER_ID);
  const { data: policies = [], error: policiesError } = useMaasAuthPolicies(GOVERNANCE_CLUSTER_ID);
  const {
    data: models = [],
    error: modelsError,
    refetch: refetchModels,
  } = useMaasModels(GOVERNANCE_CLUSTER_ID);
  const createSubscription = useCreateMaasSubscription();
  const createPolicy = useCreateMaasAuthPolicy();
  const deleteSubscription = useDeleteMaasSubscription();
  const [accessView, setAccessView] = useState<AccessView>('models');
  const [accessSearch, setAccessSearch] = useState('');
  const [accessPage, setAccessPage] = useState(1);
  const [accessPerPage, setAccessPerPage] = useState(10);

  const modelAccess = useMemo<ModelAccessRow[]>(() => {
    const subscriptionsByModel = new Map<string, MaasSubscription[]>();
    subscriptions.forEach((subscription) =>
      subscription.modelRefs.forEach((modelRef) => {
        const current = subscriptionsByModel.get(modelRef.name) ?? [];
        current.push(subscription);
        subscriptionsByModel.set(modelRef.name, current);
      }),
    );

    return models.map((model) => {
      const modelSubscriptions = subscriptionsByModel.get(model.name) ?? [];
      return {
        model,
        groups: [
          ...new Set(
            modelSubscriptions.flatMap((subscription) =>
              subscription.owner.groups.map((group) => group.name),
            ),
          ),
        ],
        subscriptions: modelSubscriptions.map(
          (subscription) => subscription.displayName ?? subscription.name,
        ),
      };
    });
  }, [models, subscriptions]);

  const groupAccess = useMemo<GroupAccessRow[]>(() => {
    const groups = new Map<string, { models: Set<string>; subscriptions: Set<string> }>();
    subscriptions.forEach((subscription) => {
      const subscriptionName = subscription.displayName ?? subscription.name;
      subscription.owner.groups.forEach((group) => {
        const current = groups.get(group.name) ?? {
          models: new Set<string>(),
          subscriptions: new Set<string>(),
        };
        subscription.modelRefs.forEach((model) =>
          current.models.add(model.displayName ?? model.name),
        );
        current.subscriptions.add(subscriptionName);
        groups.set(group.name, current);
      });
    });
    return [...groups.entries()].map(([group, access]) => ({
      group,
      models: [...access.models],
      subscriptions: [...access.subscriptions],
    }));
  }, [subscriptions]);

  const filteredModelAccess = useMemo(() => {
    const normalizedSearch = accessSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return modelAccess;
    }
    return modelAccess.filter(({ model, groups, subscriptions: accessSubscriptions }) =>
      [model.name, model.displayName, ...groups, ...accessSubscriptions]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [accessSearch, modelAccess]);

  const filteredGroupAccess = useMemo(() => {
    const normalizedSearch = accessSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return groupAccess;
    }
    return groupAccess.filter(
      ({ group, models: groupModels, subscriptions: accessSubscriptions }) =>
        [group, ...groupModels, ...accessSubscriptions].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        ),
    );
  }, [accessSearch, groupAccess]);

  const accessRows = accessView === 'models' ? filteredModelAccess : filteredGroupAccess;
  const pageStart = (accessPage - 1) * accessPerPage;
  const pagedModelAccess = filteredModelAccess.slice(pageStart, pageStart + accessPerPage);
  const pagedGroupAccess = filteredGroupAccess.slice(pageStart, pageStart + accessPerPage);

  const onAccessSearch = (value: string) => {
    setAccessSearch(value);
    setAccessPage(1);
  };

  const onAccessViewChange = (view: AccessView) => {
    setAccessView(view);
    setAccessPage(1);
  };

  const refreshOverview = () => {
    void Promise.all([refetchModels(), refetchSubscriptions()]);
  };

  const filteredSubscriptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return subscriptions;
    }
    return subscriptions.filter((subscription) =>
      [subscription.name, subscription.displayName, subscription.description]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }, [search, subscriptions]);

  const pagedSubscriptions = filteredSubscriptions.slice(
    (subscriptionPage - 1) * subscriptionPerPage,
    subscriptionPage * subscriptionPerPage,
  );

  const onSubscriptionSearch = (value: string) => {
    setSearch(value);
    setSubscriptionPage(1);
  };

  const filteredPolicies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return policies;
    }
    return policies.filter((policy) =>
      [policy.name, policy.displayName, policy.description]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }, [policies, search]);

  const pagedPolicies = filteredPolicies.slice(
    (policyPage - 1) * policyPerPage,
    policyPage * policyPerPage,
  );

  const onPolicySearch = (value: string) => {
    setSearch(value);
    setPolicyPage(1);
  };

  const resetPolicyCreate = () => {
    setPolicyName('');
    setPolicyDisplayName('');
    setPolicyGroup('');
    setPolicyModel('');
    setIsCreatePolicyOpen(false);
  };

  const onCreatePolicy = () => {
    if (!policyName.trim() || !policyGroup.trim() || !policyModel.trim()) {
      return;
    }
    createPolicy.mutate(
      {
        clusterId: GOVERNANCE_CLUSTER_ID,
        input: {
          name: policyName.trim(),
          displayName: policyDisplayName.trim() || undefined,
          groups: [{ name: policyGroup.trim() }],
          modelRefs: [{ name: policyModel.trim() }],
        },
      },
      { onSuccess: resetPolicyCreate },
    );
  };

  const resetCreate = () => {
    setName('');
    setDisplayName('');
    setGroup('');
    setPriority(100);
    setIsCreateOpen(false);
  };

  const onCreate = () => {
    if (!name.trim() || !group.trim()) {
      return;
    }
    createSubscription.mutate(
      {
        clusterId: GOVERNANCE_CLUSTER_ID,
        input: {
          name: name.trim(),
          displayName: displayName.trim() || undefined,
          owner: { groups: [{ name: group.trim() }] },
          modelRefs: [],
          priority,
          createAuthPolicy: true,
        },
      },
      { onSuccess: resetCreate },
    );
  };

  const onDelete = () => {
    if (!deleteTarget?.revision) {
      return;
    }
    deleteSubscription.mutate(
      {
        clusterId: GOVERNANCE_CLUSTER_ID,
        name: deleteTarget.name,
        revision: deleteTarget.revision,
      },
      { onSuccess: () => setDeleteTarget(undefined) },
    );
  };

  return (
    <PageSection>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1">{t('MaaS Governance')}</Title>
          <Content component="p">
            {t('Manage model subscriptions, access groups, and token limits for AI Grid users.')}
          </Content>
        </StackItem>
        {Boolean(error) && (
          <StackItem>
            <Alert variant="danger" isInline title={t('Unable to load MaaS governance data')}>
              {error instanceof Error ? error.message : t('Try again later.')}
            </Alert>
          </StackItem>
        )}
        {Boolean(policiesError) && (
          <StackItem>
            <Alert variant="danger" isInline title={t('Unable to load authorization policies')}>
              {policiesError instanceof Error ? policiesError.message : t('Try again later.')}
            </Alert>
          </StackItem>
        )}
        {Boolean(modelsError) && (
          <StackItem>
            <Alert variant="warning" isInline title={t('Unable to load model inventory')}>
              {modelsError instanceof Error ? modelsError.message : t('Try again later.')}
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <Tabs
            activeKey={activeTab}
            onSelect={(_event, key) => setActiveTab(key as GovernanceTab)}
            aria-label={t('MaaS governance sections')}
          >
            <Tab eventKey="overview" title={t('Overview')} />
            <Tab eventKey="subscriptions" title={t('Subscriptions')} />
            <Tab eventKey="policies" title={t('Authorization policies')} />
          </Tabs>
        </StackItem>
        {activeTab === 'overview' && (
          <StackItem>
            <div className="maas-governance__access-list">
              <div>
                <Toolbar>
                  <ToolbarContent>
                    <ToolbarGroup>
                      <ToolbarItem>
                        <SearchInput
                          value={accessSearch}
                          onChange={(_event, value) => onAccessSearch(value)}
                          onClear={() => onAccessSearch('')}
                          placeholder={t('Filter models and groups')}
                          aria-label={t('Filter models and groups')}
                        />
                      </ToolbarItem>
                      <ToolbarItem>
                        <ToggleGroup aria-label={t('Model access view')} isCompact>
                          <ToggleGroupItem
                            text={t('Model view')}
                            buttonId="maas-model-view"
                            isSelected={accessView === 'models'}
                            onChange={() => onAccessViewChange('models')}
                          />
                          <ToggleGroupItem
                            text={t('Group view')}
                            buttonId="maas-group-view"
                            isSelected={accessView === 'groups'}
                            onChange={() => onAccessViewChange('groups')}
                          />
                        </ToggleGroup>
                      </ToolbarItem>
                      <ToolbarItem>
                        <Button variant="secondary" onClick={refreshOverview}>
                          {t('Refresh')}
                        </Button>
                      </ToolbarItem>
                    </ToolbarGroup>
                  </ToolbarContent>
                </Toolbar>
                {accessView === 'models' ? (
                  <Table aria-label={t('Model access by model')} variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('Model')}</Th>
                        <Th>{t('Status')}</Th>
                        <Th>{t('Groups')}</Th>
                        <Th>{t('Subscriptions')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {pagedModelAccess.map(
                        ({ model, groups, subscriptions: accessSubscriptions }) => (
                          <Tr key={model.id}>
                            <Td dataLabel={t('Model')}>
                              <strong>{model.displayName ?? model.name}</strong>
                              <Content component="small">{model.name}</Content>
                            </Td>
                            <Td dataLabel={t('Status')}>
                              <Label color={model.phase === 'Ready' ? 'green' : 'orange'} isCompact>
                                {model.phase ?? t('Unknown')}
                              </Label>
                            </Td>
                            <Td dataLabel={t('Groups')}>{groups.join(', ') || t('No groups')}</Td>
                            <Td dataLabel={t('Subscriptions')}>
                              {accessSubscriptions.join(', ') || t('Not assigned')}
                            </Td>
                          </Tr>
                        ),
                      )}
                    </Tbody>
                  </Table>
                ) : (
                  <Table aria-label={t('Model access by group')} variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('Group')}</Th>
                        <Th>{t('Models')}</Th>
                        <Th>{t('Subscriptions')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {pagedGroupAccess.map(
                        ({ group, models: groupModels, subscriptions: accessSubscriptions }) => (
                          <Tr key={group}>
                            <Td dataLabel={t('Group')}>
                              <strong>{group}</strong>
                            </Td>
                            <Td dataLabel={t('Models')}>
                              {groupModels.join(', ') || t('No models')}
                            </Td>
                            <Td dataLabel={t('Subscriptions')}>{accessSubscriptions.join(', ')}</Td>
                          </Tr>
                        ),
                      )}
                    </Tbody>
                  </Table>
                )}
                <Pagination
                  itemCount={accessRows.length}
                  page={accessPage}
                  perPage={accessPerPage}
                  onSetPage={(_event, page) => setAccessPage(page)}
                  onPerPageSelect={(_event, perPage, page) => {
                    setAccessPerPage(perPage);
                    setAccessPage(page);
                  }}
                  perPageOptions={[
                    { title: '5', value: 5 },
                    { title: '10', value: 10 },
                    { title: '20', value: 20 },
                  ]}
                  isCompact
                  className="maas-governance__pagination"
                />
              </div>
            </div>
          </StackItem>
        )}
        {activeTab === 'subscriptions' && (
          <StackItem>
            <Card>
              <CardHeader>
                <CardTitle>{t('Model subscriptions')}</CardTitle>
              </CardHeader>
              <CardBody>
                <Toolbar>
                  <ToolbarContent>
                    <ToolbarGroup>
                      <ToolbarItem>
                        <SearchInput
                          value={search}
                          onChange={(_event, value) => onSubscriptionSearch(value)}
                          onClear={() => onSubscriptionSearch('')}
                          placeholder={t('Search subscriptions')}
                          aria-label={t('Search subscriptions')}
                        />
                      </ToolbarItem>
                      <ToolbarItem>
                        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
                          {t('Create subscription')}
                        </Button>
                      </ToolbarItem>
                    </ToolbarGroup>
                  </ToolbarContent>
                </Toolbar>
                {isLoading ? (
                  <div className="maas-governance__loading">
                    <Spinner />
                  </div>
                ) : filteredSubscriptions.length === 0 ? (
                  <EmptyState
                    titleText={search ? t('No matching subscriptions') : t('No subscriptions')}
                  >
                    <EmptyStateBody>
                      {search
                        ? t('Try a different search term.')
                        : t('Create a subscription to define model access for a user group.')}
                    </EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Table aria-label={t('Model subscriptions')} variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('Subscription')}</Th>
                        <Th>{t('Status')}</Th>
                        <Th>{t('Groups')}</Th>
                        <Th>{t('Models')}</Th>
                        <Th>{t('Priority')}</Th>
                        <Th screenReaderText={t('Actions')} />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {pagedSubscriptions.map((subscription) => (
                        <Tr key={subscription.id}>
                          <Td dataLabel={t('Subscription')}>
                            <strong>{subscription.displayName ?? subscription.name}</strong>
                            <Content component="small">{subscription.name}</Content>
                          </Td>
                          <Td dataLabel={t('Status')}>
                            <Label color={statusColor(subscription)} isCompact>
                              {subscription.phase ?? t('Unknown')}
                            </Label>
                          </Td>
                          <Td dataLabel={t('Groups')}>
                            {subscription.owner.groups.map((item) => item.name).join(', ') ||
                              t('No groups')}
                          </Td>
                          <Td dataLabel={t('Models')}>{subscription.modelRefs.length}</Td>
                          <Td dataLabel={t('Priority')}>{subscription.priority}</Td>
                          <Td modifier="fitContent">
                            <Button
                              variant="link"
                              isInline
                              onClick={() => setDeleteTarget(subscription)}
                            >
                              {t('Delete')}
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
                <Pagination
                  itemCount={filteredSubscriptions.length}
                  page={subscriptionPage}
                  perPage={subscriptionPerPage}
                  onSetPage={(_event, page) => setSubscriptionPage(page)}
                  onPerPageSelect={(_event, perPage, page) => {
                    setSubscriptionPerPage(perPage);
                    setSubscriptionPage(page);
                  }}
                  perPageOptions={[
                    { title: '5', value: 5 },
                    { title: '10', value: 10 },
                    { title: '20', value: 20 },
                  ]}
                  isCompact
                  className="maas-governance__pagination"
                />
              </CardBody>
            </Card>
          </StackItem>
        )}
        {activeTab === 'policies' && (
          <StackItem>
            <Card>
              <CardHeader>
              </CardHeader>
              <CardBody>
                <Toolbar>
                  <ToolbarContent>
                    <ToolbarGroup>
                      <ToolbarItem>
                        <SearchInput
                          value={search}
                          onChange={(_event, value) => onPolicySearch(value)}
                          onClear={() => onPolicySearch('')}
                          placeholder={t('Search authorization policies')}
                          aria-label={t('Search authorization policies')}
                        />
                      </ToolbarItem>
                      <ToolbarItem>
                        <Button variant="primary" onClick={() => setIsCreatePolicyOpen(true)}>
                          {t('Create authorization policy')}
                        </Button>
                      </ToolbarItem>
                    </ToolbarGroup>
                  </ToolbarContent>
                </Toolbar>
                {filteredPolicies.length === 0 ? (
                  <EmptyState
                    titleText={
                      search
                        ? t('No matching authorization policies')
                        : t('No authorization policies')
                    }
                  >
                    <EmptyStateBody>
                      {t(
                        'Authorization policies are generated for subscriptions and define group access to models.',
                      )}
                    </EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Table aria-label={t('Authorization policies')} variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('Policy')}</Th>
                        <Th>{t('Status')}</Th>
                        <Th>{t('Groups')}</Th>
                        <Th>{t('Models')}</Th>
                        <Th>{t('Description')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {pagedPolicies.map((policy) => (
                        <AuthorizationPolicyRow key={policy.name} policy={policy} />
                      ))}
                    </Tbody>
                  </Table>
                )}
                <Pagination
                  itemCount={filteredPolicies.length}
                  page={policyPage}
                  perPage={policyPerPage}
                  onSetPage={(_event, page) => setPolicyPage(page)}
                  onPerPageSelect={(_event, perPage, page) => {
                    setPolicyPerPage(perPage);
                    setPolicyPage(page);
                  }}
                  perPageOptions={[
                    { title: '5', value: 5 },
                    { title: '10', value: 10 },
                    { title: '20', value: 20 },
                  ]}
                  isCompact
                  className="maas-governance__pagination"
                />
              </CardBody>
            </Card>
          </StackItem>
        )}
      </Stack>
      <Modal isOpen={isCreateOpen} onClose={resetCreate} variant="small">
        <ModalHeader title={t('Create subscription')} />
        <ModalBody>
          <Stack hasGutter>
            <FormGroup label={t('Resource name')} isRequired fieldId="maas-name">
              <TextInput id="maas-name" value={name} onChange={(_event, value) => setName(value)} />
            </FormGroup>
            <FormGroup label={t('Display name')} fieldId="maas-display-name">
              <TextInput
                id="maas-display-name"
                value={displayName}
                onChange={(_event, value) => setDisplayName(value)}
              />
            </FormGroup>
            <FormGroup label={t('Owner group')} isRequired fieldId="maas-group">
              <TextInput
                id="maas-group"
                value={group}
                onChange={(_event, value) => setGroup(value)}
              />
            </FormGroup>
            <FormGroup label={t('Priority')} fieldId="maas-priority">
              <NumberInput
                inputAriaLabel={t('Priority')}
                value={priority}
                min={0}
                onMinus={() => setPriority(Math.max(0, priority - 1))}
                onPlus={() => setPriority(priority + 1)}
                onChange={(event) => setPriority(Number(event.currentTarget.value) || 0)}
              />
            </FormGroup>
            {createSubscription.error instanceof Error && (
              <Alert variant="danger" isInline title={t('Unable to create subscription')}>
                {createSubscription.error.message}
              </Alert>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={onCreate}
            isDisabled={!name.trim() || !group.trim() || createSubscription.isPending}
          >
            {t('Create')}
          </Button>
          <Button variant="link" onClick={resetCreate}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(undefined)}
        variant="small"
      >
        <ModalHeader title={t('Delete subscription')} />
        <ModalBody>
          <Content component="p">
            {t('Delete {{name}}? Its generated authorization policy will also be removed.', {
              name: deleteTarget?.displayName ?? deleteTarget?.name,
            })}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={onDelete} isDisabled={deleteSubscription.isPending}>
            {t('Delete')}
          </Button>
          <Button variant="link" onClick={() => setDeleteTarget(undefined)}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
      <Modal isOpen={isCreatePolicyOpen} onClose={resetPolicyCreate} variant="small">
        <ModalHeader title={t('Create authorization policy')} />
        <ModalBody>
          <Stack hasGutter>
            <FormGroup label={t('Resource name')} isRequired fieldId="policy-name">
              <TextInput
                id="policy-name"
                value={policyName}
                onChange={(_event, value) => setPolicyName(value)}
              />
            </FormGroup>
            <FormGroup label={t('Display name')} fieldId="policy-display-name">
              <TextInput
                id="policy-display-name"
                value={policyDisplayName}
                onChange={(_event, value) => setPolicyDisplayName(value)}
              />
            </FormGroup>
            <FormGroup label={t('Owner group')} isRequired fieldId="policy-group">
              <TextInput
                id="policy-group"
                value={policyGroup}
                onChange={(_event, value) => setPolicyGroup(value)}
              />
            </FormGroup>
            <FormGroup label={t('Model')} isRequired fieldId="policy-model">
              <TextInput
                id="policy-model"
                value={policyModel}
                onChange={(_event, value) => setPolicyModel(value)}
              />
            </FormGroup>
            {createPolicy.error instanceof Error && (
              <Alert variant="danger" isInline title={t('Unable to create authorization policy')}>
                {createPolicy.error.message}
              </Alert>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={onCreatePolicy}
            isDisabled={
              !policyName.trim() ||
              !policyGroup.trim() ||
              !policyModel.trim() ||
              createPolicy.isPending
            }
          >
            {t('Create')}
          </Button>
          <Button variant="link" onClick={resetPolicyCreate}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </Modal>
    </PageSection>
  );
};

export default MaaSGovernancePage;
