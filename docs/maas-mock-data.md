# MaaS Mock Data for UI Development

This document describes the comprehensive mock MaaS (Models-as-a-Service) data implemented in osac-ui to enable UI development before the fulfillment-service backend APIs are ready.

## Overview

The mock implementation in [`libs/ui-components/src/api/v1/maas.ts`](../libs/ui-components/src/api/v1/maas.ts) provides realistic, stateful CRUD operations matching the [ai-grid-cloud-provider-poc](https://github.com/osac-project/ai-grid-cloud-provider-poc) reference implementation.

## Mock Data Included

### Models (4 total)

| Name | Display Name | Type | Locations | Description |
|------|--------------|------|-----------|-------------|
| `mistral-7b-instruct` | Mistral 7B Instruct | LLMInferenceService | site1, site2, site3 | General-purpose instruction-tuned model |
| `llama-3-70b-instruct` | Llama 3 70B Instruct | LLMInferenceService | site1, site2 | Meta's 70B parameter model |
| `codestral-22b` | Codestral 22B | LLMInferenceService | site1, site3 | Code generation specialist |
| `granite-7b-lab` | Granite 7B Lab | ExternalModel | (none) | IBM Granite for enterprise use |

### Locations (3 sites)

- `site1` - US East (Virginia)
- `site2` - US West (California)
- `site3` - EU Central (Frankfurt)

### Subscriptions (3 tiers)

#### Standard Tier
- **Groups**: developers, data-scientists
- **Models**: mistral-7b-instruct, granite-7b-lab
- **Rate Limits**: 100K tokens/min, 500K tokens/hour
- **Priority**: 100

#### Premium Tier
- **Groups**: senior-engineers, ml-research
- **Models**: All 3 LLM models
- **Rate Limits**: 500K tokens/min, 2M tokens/hour
- **Priority**: 200

#### Development Tier
- **Groups**: developers
- **Models**: mistral-7b-instruct only
- **Rate Limits**: 10K tokens/min, 50K tokens/hour
- **Priority**: 50

### API Keys (3 total)

- 2 keys for Standard Tier
- 1 key for Premium Tier

## Available Hooks

### Query Hooks

```typescript
// List all models
const { data: models } = useMaasModels(clusterId);

// List all subscriptions
const { data: subscriptions } = useMaasSubscriptions(clusterId);

// Get subscription details with joined data
const { data: info } = useMaasSubscription(clusterId, subscriptionName);
// Returns: { subscription, modelRefs, authPolicies, meteringMetadata }

// List API keys
const { data: keys } = useMaasApiKeys(clusterId);

// List available locations
const { data: locations } = useMaasLocations(clusterId);
```

### Mutation Hooks

```typescript
// Create subscription
const { mutate: createSub } = useCreateMaasSubscription();
createSub({ 
  clusterId, 
  input: { name, displayName, owner, modelRefs, priority, createAuthPolicy: true }
});

// Update subscription
const { mutate: updateSub } = useUpdateMaasSubscription();
updateSub({ 
  clusterId, 
  name, 
  input: { displayName, owner, modelRefs, priority },
  revision // Required for optimistic concurrency
});

// Delete subscription
const { mutate: deleteSub } = useDeleteMaasSubscription();
deleteSub({ clusterId, name, revision });

// Create API key
const { mutate: createKey } = useCreateMaasApiKey();
createKey({ clusterId, subscriptionId });

// Revoke API key
const { mutate: revokeKey } = useRevokeMaasApiKey();
revokeKey({ clusterId, keyId });

// Get AI Grid URL (escape hatch)
const { mutate: getUrl } = useFetchAiGridUrl();
getUrl(clusterId);
```

## Key Features

### 1. Optimistic Concurrency Control

All subscriptions have a `revision` field (opaque string). Update and delete operations require the current revision:

```typescript
// Get current subscription
const { data } = useMaasSubscription(clusterId, name);

// Update with revision check
updateSub({ 
  clusterId, 
  name, 
  input: {...}, 
  revision: data.subscription.revision 
});
```

If the revision doesn't match, the operation fails with "Subscription was modified. Reload before saving."

### 2. Automatic Policy Management

When creating a subscription with `createAuthPolicy: true`:
- A matching `MaaSAuthPolicy` is created with name `{subscription-name}-policy`
- The policy grants access to the same models and groups
- When deleting the subscription, the matching policy is also deleted

### 3. Realistic Validation

- Duplicate subscription names are rejected
- Required fields are validated
- Group names and model references are checked

### 4. Cache Invalidation

All mutations properly invalidate TanStack Query caches to trigger UI updates:

```typescript
onSuccess: (_data, { clusterId }) => {
  void qc.invalidateQueries({ 
    queryKey: apiQueryKey('v1/maas/subscriptions', [clusterId]) 
  });
}
```

## UI Integration

The mock data is already integrated into the UI at:

**[`libs/ui-components/src/components/Cluster/Details/ClusterAiGridTab.tsx`](../libs/ui-components/src/components/Cluster/Details/ClusterAiGridTab.tsx)**

The tab displays:
1. **Models table** - Shows all available models with type, locations, and phase
2. **Subscriptions table** - Shows subscriptions with name, models, groups, priority, and phase
3. **API keys table** - Shows keys with preview, subscription, creation date, and revoke action
4. **Create API key modal** - Select subscription and generate new key

## Transition to Real APIs

When fulfillment-service implements the MaaS proxy routes:

1. **Define protobuf types** in fulfillment-service:
   ```
   osac/public/v1/maas_model_type.proto
   osac/public/v1/maas_subscription_type.proto
   osac/public/v1/maas_api_key_type.proto
   ```

2. **Run `buf generate`** to create TypeScript types in `libs/types/src/`

3. **Replace mock implementations** with real API calls:
   ```typescript
   // Before (mock)
   export const useMaasModels = (clusterId: string) =>
     useApiQuery({
       queryKey: apiQueryKey('v1/maas/models', [clusterId]),
       queryFn: () => Promise.resolve(MOCK_MODELS),
     });

   // After (real API)
   export const useMaasModels = (clusterId: string) =>
     useApiFetch(MaaSModelsServiceDef, 'list', { clusterId });
   ```

4. **Update type imports**:
   ```typescript
   import { 
     MaaSModel, 
     MaaSSubscription, 
     MaaSApiKey 
   } from '@osac/types';
   ```

## Testing

The mock data enables:
- **UI component development** without backend dependencies
- **Form validation testing** with realistic data structures
- **Error handling testing** with simulated failures
- **Optimistic concurrency testing** with revision checks

## References

- [AI Grid Integration Plan](../../.cursor/plans/ai_grid_osac_integration_*.plan.md)
- [ai-grid-cloud-provider-poc](https://github.com/osac-project/ai-grid-cloud-provider-poc)
- [integration.md](../../forks/arch/ai-grid/integration.md)
- [ClusterAiGridTab Component](../libs/ui-components/src/components/Cluster/Details/ClusterAiGridTab.tsx)
