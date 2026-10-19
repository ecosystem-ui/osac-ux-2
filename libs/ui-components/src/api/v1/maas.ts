// ============================================================================
// MaaS (Models-as-a-Service) API Hooks - MOCK IMPLEMENTATION
// ============================================================================
//
// This file contains comprehensive mock data and hooks for the AI Grid / MaaS
// integration. All types and data structures match the ai-grid-cloud-provider-poc
// reference implementation to enable UI development before backend APIs are ready.
//
// CURRENT STATE: All hooks return mock data with realistic CRUD operations.
//
// FUTURE INTEGRATION: Once fulfillment-service implements the MaaS proxy routes,
// replace the mock queryFn/mutationFn with real useApiFetch calls to generated
// protobuf service definitions.
//
// Real endpoints (Phase 3, integration.md Option 2):
//   GET    /api/fulfillment/v1/clusters/{id}/maas/models
//   GET    /api/fulfillment/v1/clusters/{id}/maas/models/{name}
//   POST   /api/fulfillment/v1/clusters/{id}/maas/models
//   DELETE /api/fulfillment/v1/clusters/{id}/maas/models/{name}
//
//   GET    /api/fulfillment/v1/clusters/{id}/maas/subscriptions
//   GET    /api/fulfillment/v1/clusters/{id}/maas/subscriptions/{name}
//   POST   /api/fulfillment/v1/clusters/{id}/maas/subscriptions
//   PUT    /api/fulfillment/v1/clusters/{id}/maas/subscriptions/{name}
//   DELETE /api/fulfillment/v1/clusters/{id}/maas/subscriptions/{name}
//
//   GET    /api/fulfillment/v1/clusters/{id}/maas/keys
//   POST   /api/fulfillment/v1/clusters/{id}/maas/keys
//   DELETE /api/fulfillment/v1/clusters/{id}/maas/keys/{keyId}
//
//   GET    /api/fulfillment/v1/clusters/{id}/maas/locations
//   GET    /api/fulfillment/v1/clusters/{id}/ai_grid_url
//
// MOCK DATA FEATURES:
// - 4 models (3 with deployments, 1 external)
// - 3 AI Grid sites (locations)
// - 3 subscriptions with different tiers and rate limits
// - 3 matching authorization policies
// - 3 API keys
// - Full CRUD operations with optimistic concurrency (revision field)
// - Realistic validation and error handling
//
// ============================================================================

import { useMutation } from '@tanstack/react-query';

import { apiQueryKey } from '../types';
import { useApiQuery, useApiQueryClient } from '../use-api-query';

// ─── Local type definitions (no protobuf types exist yet for MaaS) ────────────
// These types match the PoC's comprehensive data structures from ai-grid-cloud-provider-poc

export interface MaasModel {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  modelRef: {
    kind: 'LLMInferenceService' | 'ExternalModel';
    name: string;
  };
  locations: string[];
  phase?: 'Pending' | 'Ready' | 'Failed';
  endpoint?: string;
  status?: string;
  statusMessage?: string;
  creationTimestamp?: string;
  revision?: string;
  // Deployment config
  modelUri?: string;
  modelName?: string;
  runtimeImage?: string;
  replicas?: number;
  hasDeployment?: boolean;
  availableForSubscriptions?: boolean;
}

export interface TokenRateLimit {
  limit: number;
  window: string; // e.g., "30s", "1m", "1h"
}

export interface BillingRate {
  perToken: string;
}

export interface GuardrailAttachment {
  ref: { name: string };
  checks?: string[];
}

export interface GroupReference {
  name: string;
}

export interface OwnerSpec {
  users?: string[];
  groups: GroupReference[];
}

export interface ModelSubscriptionRef {
  name: string;
  displayName?: string;
  description?: string;
  tokenRateLimits: TokenRateLimit[];
  billingRate?: BillingRate;
  unlimited?: boolean;
  guardrails?: GuardrailAttachment[];
}

export interface TokenMetadata {
  organizationId?: string;
  costCenter?: string;
  labels?: Record<string, string>;
}

export interface MaasSubscription {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  owner: OwnerSpec;
  modelRefs: ModelSubscriptionRef[];
  priority: number;
  tokenMetadata?: TokenMetadata;
  phase?: string;
  status?: string;
  statusMessage?: string;
  conditionType?: string;
  reason?: string;
  lastTransitionTime?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  revision?: string;
  // Preserved but not edited in MVP
  inferencePriority?: number;
  guardrails?: GuardrailAttachment[];
}

export interface MaasAuthPolicy {
  name: string;
  displayName?: string;
  description?: string;
  modelRefs: Array<{ name: string }>;
  subjects: { groups?: GroupReference[] };
  meteringMetadata?: TokenMetadata;
  phase?: string;
  status?: string;
  statusMessage?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
}

export interface SubscriptionInfoResponse {
  subscription: MaasSubscription;
  modelRefs: MaasModel[];
  authPolicies: MaasAuthPolicy[];
  meteringMetadata?: TokenMetadata;
}

export interface CreateSubscriptionRequest {
  name: string;
  displayName?: string;
  description?: string;
  owner: OwnerSpec;
  modelRefs: ModelSubscriptionRef[];
  priority: number;
  createAuthPolicy: boolean;
}

export interface UpdateSubscriptionRequest {
  displayName?: string;
  description?: string;
  owner: OwnerSpec;
  modelRefs: ModelSubscriptionRef[];
  tokenMetadata?: TokenMetadata;
  priority: number;
  inferencePriority?: number;
  guardrails?: GuardrailAttachment[];
}

export interface CreateSubscriptionResponse {
  subscription: MaasSubscription;
  authPolicy?: MaasAuthPolicy;
}

export interface CreateAuthPolicyRequest {
  name: string;
  displayName?: string;
  description?: string;
  modelRefs: Array<{ name: string }>;
  groups: GroupReference[];
}

export interface MaasApiKey {
  id: string;
  keyPreview: string;
  createdAt: string;
  subscriptionId: string;
  subscriptionName?: string;
}

export interface MaasApiKeyCreateRequest {
  clusterId: string;
  subscriptionId: string;
}

export interface MaasApiKeyRevokeRequest {
  clusterId: string;
  keyId: string;
}

export interface AiGridUrlResult {
  url: string;
  expiresAt: string;
}

export interface MaasLocation {
  id: string;
  name: string;
  site?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// Comprehensive mock data matching the PoC's data structures

const MOCK_LOCATIONS: MaasLocation[] = [
  { id: 'site1', name: 'US East (Virginia)', site: 'site1' },
  { id: 'site2', name: 'US West (California)', site: 'site2' },
  { id: 'site3', name: 'EU Central (Frankfurt)', site: 'site3' },
];

const MOCK_MODELS: MaasModel[] = [
  {
    id: 'mistral-7b-instruct',
    name: 'mistral-7b-instruct',
    displayName: 'Mistral 7B Instruct',
    description: 'Mistral 7B instruction-tuned model for general-purpose tasks',
    modelRef: { kind: 'LLMInferenceService', name: 'mistral-7b-instruct' },
    locations: ['site1', 'site2', 'site3'],
    phase: 'Ready',
    endpoint: 'https://inference.site1.example.com/v1/mistral-7b-instruct',
    status: 'Ready',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 30).toISOString(),
    revision: '1',
    modelUri: 's3://models/mistral-7b-instruct-v0.2',
    runtimeImage: 'quay.io/vllm/vllm-openai:latest',
    replicas: 3,
    hasDeployment: true,
    availableForSubscriptions: true,
  },
  {
    id: 'llama-3-70b-instruct',
    name: 'llama-3-70b-instruct',
    displayName: 'Llama 3 70B Instruct',
    description: 'Meta Llama 3 70B parameter instruction-tuned model',
    modelRef: { kind: 'LLMInferenceService', name: 'llama-3-70b-instruct' },
    locations: ['site1', 'site2'],
    phase: 'Ready',
    endpoint: 'https://inference.site1.example.com/v1/llama-3-70b-instruct',
    status: 'Ready',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 20).toISOString(),
    revision: '2',
    modelUri: 's3://models/llama-3-70b-instruct',
    runtimeImage: 'quay.io/vllm/vllm-openai:latest',
    replicas: 2,
    hasDeployment: true,
    availableForSubscriptions: true,
  },
  {
    id: 'codestral-22b',
    name: 'codestral-22b',
    displayName: 'Codestral 22B',
    description: 'Mistral Codestral 22B specialized for code generation',
    modelRef: { kind: 'LLMInferenceService', name: 'codestral-22b' },
    locations: ['site1', 'site3'],
    phase: 'Ready',
    endpoint: 'https://inference.site1.example.com/v1/codestral-22b',
    status: 'Ready',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 15).toISOString(),
    revision: '1',
    modelUri: 's3://models/codestral-22b',
    runtimeImage: 'quay.io/vllm/vllm-openai:latest',
    replicas: 2,
    hasDeployment: true,
    availableForSubscriptions: true,
  },
  {
    id: 'granite-7b-lab',
    name: 'granite-7b-lab',
    displayName: 'Granite 7B Lab',
    description: 'IBM Granite 7B for enterprise use cases',
    modelRef: { kind: 'ExternalModel', name: 'granite-7b-lab' },
    locations: [],
    phase: 'Ready',
    status: 'Ready',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 10).toISOString(),
    revision: '1',
    hasDeployment: false,
    availableForSubscriptions: true,
  },
];

const MOCK_SUBSCRIPTIONS: MaasSubscription[] = [
  {
    id: 'standard-tier',
    name: 'standard-tier',
    displayName: 'Standard Tier',
    description: 'Standard subscription with basic models and rate limits',
    owner: {
      groups: [{ name: 'developers' }, { name: 'data-scientists' }],
    },
    modelRefs: [
      {
        name: 'mistral-7b-instruct',
        displayName: 'Mistral 7B Instruct',
        tokenRateLimits: [
          { limit: 100_000, window: '1m' },
          { limit: 500_000, window: '1h' },
        ],
        billingRate: { perToken: '0.0001' },
      },
      {
        name: 'granite-7b-lab',
        displayName: 'Granite 7B Lab',
        tokenRateLimits: [
          { limit: 50_000, window: '1m' },
          { limit: 250_000, window: '1h' },
        ],
        billingRate: { perToken: '0.00008' },
      },
    ],
    priority: 100,
    tokenMetadata: {
      organizationId: 'org-demo-001',
      costCenter: 'engineering',
      labels: { environment: 'production', team: 'ai-ml' },
    },
    phase: 'Ready',
    status: 'Active',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 7).toISOString(),
    revision: '3',
  },
  {
    id: 'premium-tier',
    name: 'premium-tier',
    displayName: 'Premium Tier',
    description: 'Premium subscription with all models and higher rate limits',
    owner: {
      groups: [{ name: 'senior-engineers' }, { name: 'ml-research' }],
    },
    modelRefs: [
      {
        name: 'mistral-7b-instruct',
        tokenRateLimits: [
          { limit: 500_000, window: '1m' },
          { limit: 2_000_000, window: '1h' },
        ],
        billingRate: { perToken: '0.0001' },
      },
      {
        name: 'llama-3-70b-instruct',
        tokenRateLimits: [
          { limit: 200_000, window: '1m' },
          { limit: 1_000_000, window: '1h' },
        ],
        billingRate: { perToken: '0.0003' },
      },
      {
        name: 'codestral-22b',
        tokenRateLimits: [
          { limit: 300_000, window: '1m' },
          { limit: 1_500_000, window: '1h' },
        ],
        billingRate: { perToken: '0.00015' },
      },
    ],
    priority: 200,
    tokenMetadata: {
      organizationId: 'org-demo-001',
      costCenter: 'research',
      labels: { environment: 'production', tier: 'premium' },
    },
    phase: 'Ready',
    status: 'Active',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 5).toISOString(),
    revision: '2',
  },
  {
    id: 'dev-tier',
    name: 'dev-tier',
    displayName: 'Development Tier',
    description: 'Development and testing subscription with lower limits',
    owner: {
      groups: [{ name: 'developers' }],
    },
    modelRefs: [
      {
        name: 'mistral-7b-instruct',
        tokenRateLimits: [
          { limit: 10_000, window: '1m' },
          { limit: 50_000, window: '1h' },
        ],
      },
    ],
    priority: 50,
    tokenMetadata: {
      organizationId: 'org-demo-001',
      costCenter: 'engineering',
      labels: { environment: 'development' },
    },
    phase: 'Ready',
    status: 'Active',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    revision: '1',
  },
];

const MOCK_AUTH_POLICIES: MaasAuthPolicy[] = [
  {
    name: 'standard-tier-policy',
    displayName: 'Standard Tier Policy',
    description: 'Authorization policy for standard tier subscription',
    modelRefs: [{ name: 'mistral-7b-instruct' }, { name: 'granite-7b-lab' }],
    subjects: {
      groups: [{ name: 'developers' }, { name: 'data-scientists' }],
    },
    phase: 'Ready',
    status: 'Active',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 7).toISOString(),
  },
  {
    name: 'premium-tier-policy',
    displayName: 'Premium Tier Policy',
    description: 'Authorization policy for premium tier subscription',
    modelRefs: [
      { name: 'mistral-7b-instruct' },
      { name: 'llama-3-70b-instruct' },
      { name: 'codestral-22b' },
    ],
    subjects: {
      groups: [{ name: 'senior-engineers' }, { name: 'ml-research' }],
    },
    phase: 'Ready',
    status: 'Active',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 5).toISOString(),
  },
  {
    name: 'dev-tier-policy',
    displayName: 'Development Tier Policy',
    modelRefs: [{ name: 'mistral-7b-instruct' }],
    subjects: {
      groups: [{ name: 'developers' }],
    },
    phase: 'Ready',
    status: 'Active',
    creationTimestamp: new Date(Date.now() - 86_400_000 * 2).toISOString(),
  },
];

const MOCK_KEYS: MaasApiKey[] = [
  {
    id: 'key-abc123',
    keyPreview: 'sk-oai-abc…123',
    createdAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
    subscriptionId: 'standard-tier',
    subscriptionName: 'Standard Tier',
  },
  {
    id: 'key-def456',
    keyPreview: 'sk-oai-def…456',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    subscriptionId: 'premium-tier',
    subscriptionName: 'Premium Tier',
  },
  {
    id: 'key-xyz789',
    keyPreview: 'sk-oai-xyz…789',
    createdAt: new Date(Date.now() - 86_400_000 * 5).toISOString(),
    subscriptionId: 'standard-tier',
    subscriptionName: 'Standard Tier',
  },
];

// ─── Query hooks ──────────────────────────────────────────────────────────────

// MISSING: replace with real useApiQuery call once endpoint exists
export const useMaasModels = (_clusterId: string) =>
  useApiQuery<MaasModel[], MaasModel[]>({
    queryKey: apiQueryKey('v1/maas/models', [_clusterId]),
    queryFn: () => Promise.resolve(MOCK_MODELS),
    enabled: Boolean(_clusterId),
  });

// MISSING: replace with real useApiQuery call once endpoint exists
export const useMaasSubscriptions = (_clusterId: string) =>
  useApiQuery<MaasSubscription[], MaasSubscription[]>({
    queryKey: apiQueryKey('v1/maas/subscriptions', [_clusterId]),
    queryFn: () => Promise.resolve(MOCK_SUBSCRIPTIONS),
    enabled: Boolean(_clusterId),
  });

// MISSING: replace with real useApiQuery call once endpoint exists
export const useMaasAuthPolicies = (_clusterId: string) =>
  useApiQuery<MaasAuthPolicy[], MaasAuthPolicy[]>({
    queryKey: apiQueryKey('v1/maas/policies', [_clusterId]),
    queryFn: () => Promise.resolve(MOCK_AUTH_POLICIES),
    enabled: Boolean(_clusterId),
  });

export const useCreateMaasAuthPolicy = () => {
  const qc = useApiQueryClient();
  return useMutation({
    mutationFn: async ({
      clusterId: _clusterId,
      input,
    }: {
      clusterId: string;
      input: CreateAuthPolicyRequest;
    }) => {
      if (MOCK_AUTH_POLICIES.some((policy) => policy.name === input.name)) {
        throw new Error('An authorization policy with this name already exists');
      }
      const policy: MaasAuthPolicy = {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        modelRefs: input.modelRefs,
        subjects: { groups: input.groups },
        phase: 'Ready',
        status: 'Active',
        creationTimestamp: new Date().toISOString(),
      };
      MOCK_AUTH_POLICIES.push(policy);
      return policy;
    },
    onSuccess: (_data, { clusterId }) => {
      void qc.invalidateQueries({ queryKey: apiQueryKey('v1/maas/policies', [clusterId]) });
    },
    retry: false,
  });
};

// MISSING: replace with real useApiQuery call once endpoint exists
export const useMaasSubscription = (_clusterId: string, name: string) =>
  useApiQuery<SubscriptionInfoResponse, SubscriptionInfoResponse>({
    queryKey: apiQueryKey('v1/maas/subscriptions', [_clusterId, name]),
    queryFn: () => {
      const subscription = MOCK_SUBSCRIPTIONS.find((s) => s.name === name);
      if (!subscription) {
        return Promise.reject(new Error('Subscription not found'));
      }
      const modelRefs = MOCK_MODELS.filter((m) =>
        subscription.modelRefs.some((ref) => ref.name === m.name),
      );
      const authPolicies = MOCK_AUTH_POLICIES.filter((p) =>
        p.modelRefs.some((m) => subscription.modelRefs.some((ref) => ref.name === m.name)),
      );
      return Promise.resolve({
        subscription,
        modelRefs,
        authPolicies,
        meteringMetadata: subscription.tokenMetadata,
      });
    },
    enabled: Boolean(_clusterId && name),
  });

// MISSING: replace with real useApiQuery call once endpoint exists
export const useMaasApiKeys = (_clusterId: string) =>
  useApiQuery<MaasApiKey[], MaasApiKey[]>({
    queryKey: apiQueryKey('v1/maas/keys', [_clusterId]),
    queryFn: () => Promise.resolve(MOCK_KEYS),
    enabled: Boolean(_clusterId),
  });

// MISSING: replace with real useApiQuery call once endpoint exists
export const useMaasLocations = (_clusterId: string) =>
  useApiQuery<MaasLocation[], MaasLocation[]>({
    queryKey: apiQueryKey('v1/maas/locations', [_clusterId]),
    queryFn: () => Promise.resolve(MOCK_LOCATIONS),
    enabled: Boolean(_clusterId),
  });

// ─── Mutation hooks ───────────────────────────────────────────────────────────

// MISSING: replace body with real fetch once endpoint exists
export const useCreateMaasSubscription = () => {
  const qc = useApiQueryClient();
  return useMutation({
    mutationFn: async ({
      clusterId,
      input,
    }: {
      clusterId: string;
      input: CreateSubscriptionRequest;
    }): Promise<CreateSubscriptionResponse> => {
      // Simulate validation
      if (MOCK_SUBSCRIPTIONS.some((s) => s.name === input.name)) {
        throw new Error('A subscription with this name already exists');
      }

      const newSubscription: MaasSubscription = {
        id: `sub-${Math.random().toString(36).slice(2, 8)}`,
        ...input,
        phase: 'Ready',
        status: 'Active',
        creationTimestamp: new Date().toISOString(),
        revision: '1',
        tokenMetadata: {
          organizationId: 'org-demo-001',
          ...input.tokenMetadata,
        },
      };

      let authPolicy: MaasAuthPolicy | undefined;
      if (input.createAuthPolicy) {
        authPolicy = {
          name: `${input.name}-policy`,
          displayName: input.displayName,
          description: input.description,
          modelRefs: input.modelRefs.map((m) => ({ name: m.name })),
          subjects: { groups: input.owner.groups },
          phase: 'Ready',
          status: 'Active',
          creationTimestamp: newSubscription.creationTimestamp,
        };
        MOCK_AUTH_POLICIES.push(authPolicy);
      }

      MOCK_SUBSCRIPTIONS.push(newSubscription);
      return { subscription: newSubscription, authPolicy };
    },
    onSuccess: (_data, { clusterId }) => {
      void qc.invalidateQueries({ queryKey: apiQueryKey('v1/maas/subscriptions', [clusterId]) });
    },
    retry: false,
  });
};

// MISSING: replace body with real fetch once endpoint exists
export const useUpdateMaasSubscription = () => {
  const qc = useApiQueryClient();
  return useMutation({
    mutationFn: async ({
      clusterId,
      name,
      input,
      revision,
    }: {
      clusterId: string;
      name: string;
      input: UpdateSubscriptionRequest;
      revision: string;
    }): Promise<CreateSubscriptionResponse> => {
      const idx = MOCK_SUBSCRIPTIONS.findIndex((s) => s.name === name);
      if (idx === -1) {
        throw new Error('Subscription not found');
      }

      const existing = MOCK_SUBSCRIPTIONS[idx];
      if (existing.revision !== revision) {
        throw new Error('Subscription was modified. Reload before saving.');
      }

      const updated: MaasSubscription = {
        ...existing,
        ...input,
        name: existing.name, // Name is immutable
        revision: String(Number(existing.revision ?? '1') + 1),
      };

      MOCK_SUBSCRIPTIONS[idx] = updated;
      return { subscription: updated };
    },
    onSuccess: (_data, { clusterId, name }) => {
      void qc.invalidateQueries({ queryKey: apiQueryKey('v1/maas/subscriptions', [clusterId]) });
      void qc.invalidateQueries({
        queryKey: apiQueryKey('v1/maas/subscriptions', [clusterId, name]),
      });
    },
    retry: false,
  });
};

// MISSING: replace body with real fetch once endpoint exists
export const useDeleteMaasSubscription = () => {
  const qc = useApiQueryClient();
  return useMutation({
    mutationFn: async ({
      clusterId,
      name,
      revision,
    }: {
      clusterId: string;
      name: string;
      revision: string;
    }): Promise<void> => {
      const idx = MOCK_SUBSCRIPTIONS.findIndex((s) => s.name === name);
      if (idx === -1) {
        throw new Error('Subscription not found');
      }

      const existing = MOCK_SUBSCRIPTIONS[idx];
      if (existing.revision !== revision) {
        throw new Error('Subscription was modified. Reload before deleting.');
      }

      MOCK_SUBSCRIPTIONS.splice(idx, 1);

      // Also delete matching policy if it exists
      const policyName = `${name}-policy`;
      const policyIdx = MOCK_AUTH_POLICIES.findIndex((p) => p.name === policyName);
      if (policyIdx !== -1) {
        MOCK_AUTH_POLICIES.splice(policyIdx, 1);
      }
    },
    onSuccess: (_data, { clusterId }) => {
      void qc.invalidateQueries({ queryKey: apiQueryKey('v1/maas/subscriptions', [clusterId]) });
    },
    retry: false,
  });
};

// MISSING: replace body with real fetch once endpoint exists
export const useCreateMaasApiKey = () => {
  const qc = useApiQueryClient();
  return useMutation({
    mutationFn: async ({ clusterId: _clusterId, subscriptionId }: MaasApiKeyCreateRequest) => {
      const subscription = MOCK_SUBSCRIPTIONS.find((s) => s.id === subscriptionId);
      const newKey: MaasApiKey = {
        id: `key-${Math.random().toString(36).slice(2, 8)}`,
        keyPreview: `sk-oai-${Math.random().toString(36).slice(2, 6)}…${Math.random().toString(36).slice(2, 5)}`,
        createdAt: new Date().toISOString(),
        subscriptionId,
        subscriptionName: subscription?.displayName ?? subscription?.name,
      };
      MOCK_KEYS.push(newKey);
      return newKey;
    },
    onSuccess: (_data, { clusterId }) => {
      void qc.invalidateQueries({ queryKey: apiQueryKey('v1/maas/keys', [clusterId]) });
      void qc.invalidateQueries({ queryKey: apiQueryKey('v1/maas/subscriptions', [clusterId]) });
    },
    retry: false,
  });
};

// MISSING: replace body with real fetch once endpoint exists
export const useRevokeMaasApiKey = () => {
  const qc = useApiQueryClient();
  return useMutation({
    mutationFn: async ({ clusterId: _clusterId, keyId }: MaasApiKeyRevokeRequest) => {
      const idx = MOCK_KEYS.findIndex((k) => k.id === keyId);
      if (idx !== -1) MOCK_KEYS.splice(idx, 1);
    },
    onSuccess: (_data, { clusterId }) => {
      void qc.invalidateQueries({ queryKey: apiQueryKey('v1/maas/keys', [clusterId]) });
      void qc.invalidateQueries({ queryKey: apiQueryKey('v1/maas/subscriptions', [clusterId]) });
    },
    retry: false,
  });
};

// MISSING: replace body with real fetch once endpoint exists
export const useFetchAiGridUrl = () =>
  useMutation({
    mutationFn: async (clusterId: string): Promise<AiGridUrlResult> => {
      return {
        url: `https://odh-dashboard.example.com/clusters/${clusterId}/maas`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    },
    retry: false,
  });
