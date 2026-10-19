# MaaS Mock Data Implementation Summary

**Date**: 2026-10-19  
**Purpose**: Enable UI development for AI Grid / MaaS integration before fulfillment-service backend APIs are ready

## What Was Done

### 1. Enhanced Type Definitions

**File**: `libs/ui-components/src/api/v1/maas.ts`

Expanded from basic types to comprehensive structures matching the [ai-grid-cloud-provider-poc](https://github.com/osac-project/ai-grid-cloud-provider-poc) reference implementation:

#### New/Enhanced Types:

- **`MaasModel`** - Complete model metadata including:
  - Display name, description
  - Model reference (kind: LLMInferenceService | ExternalModel)
  - Deployment locations (multi-site)
  - Phase, status, endpoints
  - Deployment configuration (modelUri, runtimeImage, replicas)

- **`MaasSubscription`** - Full subscription structure:
  - Owner (groups + users)
  - Model references with per-model rate limits and billing rates
  - Token metadata (organizationId, costCenter, labels)
  - Priority, guardrails, inference priority
  - Phase, status, timestamps, revision (for optimistic concurrency)

- **`MaasAuthPolicy`** - Authorization policy metadata
- **`TokenRateLimit`** - Rate limit specification (limit + window)
- **`SubscriptionInfoResponse`** - Joined subscription detail response
- **`CreateSubscriptionRequest`** / **`UpdateSubscriptionRequest`** - CRUD request types
- **`MaasLocation`** - AI Grid site definition

### 2. Comprehensive Mock Data

Added realistic mock data for:

#### Models (4)
- **mistral-7b-instruct** - 3 sites, LLMInferenceService, Ready
- **llama-3-70b-instruct** - 2 sites, LLMInferenceService, Ready
- **codestral-22b** - 2 sites, LLMInferenceService, Ready
- **granite-7b-lab** - ExternalModel, Ready

#### Locations (3)
- site1 - US East (Virginia)
- site2 - US West (California)  
- site3 - EU Central (Frankfurt)

#### Subscriptions (3)
- **standard-tier** - 2 models, 2 groups, priority 100
- **premium-tier** - 3 models, 2 groups, priority 200
- **dev-tier** - 1 model, 1 group, priority 50

Each subscription includes:
- Display name and description
- Owner groups
- Per-model token rate limits (per minute + per hour)
- Billing rates
- Token metadata (organizationId, costCenter, labels)
- Phase, status, revision

#### Auth Policies (3)
- Matching policy for each subscription
- Auto-created/deleted with subscription

#### API Keys (3)
- Realistic key previews (`sk-oai-abc…123`)
- Linked to subscriptions
- Creation timestamps

### 3. Query Hooks

Implemented comprehensive query hooks:

```typescript
useMaasModels(clusterId)              // List all models
useMaasSubscriptions(clusterId)       // List all subscriptions  
useMaasSubscription(clusterId, name)  // Get subscription + joined data
useMaasApiKeys(clusterId)             // List API keys
useMaasLocations(clusterId)           // List AI Grid sites
```

### 4. Mutation Hooks

Implemented full CRUD operations:

```typescript
useCreateMaasSubscription()    // POST with createAuthPolicy option
useUpdateMaasSubscription()    // PUT with revision check
useDeleteMaasSubscription()    // DELETE with revision check + policy cleanup
useCreateMaasApiKey()          // POST to mint new key
useRevokeMaasApiKey()          // DELETE to revoke key
useFetchAiGridUrl()            // GET escape hatch URL
```

Features:
- **Optimistic concurrency control** via revision field
- **Automatic policy management** (create/delete with subscription)
- **Realistic validation** (duplicate names, required fields)
- **Proper cache invalidation** via TanStack Query

### 5. Enhanced UI Components

**File**: `libs/ui-components/src/components/Cluster/Details/ClusterAiGridTab.tsx`

#### Models Table Updates:
- Display name + description
- Model type (kind)
- Location count
- Phase

#### Subscriptions Table Updates:
- Display name + description  
- Model names (display names)
- Owner groups
- Priority
- Phase

### 6. Documentation

Created comprehensive documentation:

- **`docs/maas-mock-data.md`** - Full usage guide
- **Inline code comments** - 40+ line header in maas.ts explaining structure

## Files Modified

```
libs/ui-components/src/api/v1/maas.ts                     +600 lines
libs/ui-components/src/components/Cluster/Details/ClusterAiGridTab.tsx  +40 lines  
docs/maas-mock-data.md                                    NEW
docs/MAAS_MOCK_IMPLEMENTATION_SUMMARY.md                  NEW (this file)
```

## How to Use

### For UI Developers

1. **View the AI Grid tab**:
   - Navigate to any cluster with `RHOAI` add-on installed
   - The "AI Grid" tab appears conditionally
   - See realistic models, subscriptions, and API keys

2. **Test CRUD operations**:
   ```typescript
   const { mutate: createSub } = useCreateMaasSubscription();
   
   createSub({
     clusterId: 'my-cluster-id',
     input: {
       name: 'test-subscription',
       displayName: 'Test Subscription',
       owner: { groups: [{ name: 'developers' }] },
       modelRefs: [
         {
           name: 'mistral-7b-instruct',
           tokenRateLimits: [
             { limit: 100_000, window: '1m' }
           ]
         }
       ],
       priority: 100,
       createAuthPolicy: true
     }
   });
   ```

3. **Use revision-based updates**:
   ```typescript
   const { data } = useMaasSubscription(clusterId, name);
   
   updateSub({
     clusterId,
     name,
     input: { ...changes },
     revision: data.subscription.revision  // Required!
   });
   ```

### For Backend Developers

When implementing fulfillment-service MaaS proxy routes:

1. Use these type definitions as the contract
2. Match field names and structures exactly
3. Implement optimistic concurrency with revision field
4. Support createAuthPolicy parameter for atomic policy creation
5. Inject `tokenMetadata.organizationId` from JWT `organization` claim

## Integration Path

### Phase 1: Protobuf Definitions (Backend)
Define in fulfillment-service:
- `osac/public/v1/maas_model_type.proto`
- `osac/public/v1/maas_subscription_type.proto`  
- `osac/public/v1/maas_api_key_type.proto`
- `osac/public/v1/maas_locations_service.proto`

### Phase 2: Generate Types (UI)
```bash
cd osac-ux
buf generate
```

### Phase 3: Replace Mock Implementations (UI)
```typescript
// Before
queryFn: () => Promise.resolve(MOCK_MODELS)

// After
useApiFetch(MaaSModelsServiceDef, 'list', { clusterId })
```

### Phase 4: Backend Implementation
Fulfillment-service proxy routes:
- Look up ClusterOrder + verify RHOAI installed
- Get HCP kubeconfig via HubClientProvider
- Call maas-api on tenant's HCP cluster
- Transform CRD → protobuf DTO
- Inject organizationId from JWT

## Testing

Mock data enables testing:
- ✅ Form validation with realistic structures
- ✅ Table rendering with multi-field data
- ✅ Optimistic concurrency (revision checks)
- ✅ Error handling (duplicate names, missing revisions)
- ✅ Cache invalidation after mutations

## References

- [AI Grid Integration Plan](../.cursor/plans/ai_grid_osac_integration_*.plan.md)
- [MaaS Mock Data Guide](./maas-mock-data.md)
- [ai-grid-cloud-provider-poc](https://github.com/osac-project/ai-grid-cloud-provider-poc)
- [integration.md](../../forks/arch/ai-grid/integration.md)

## Next Steps

For continued UI development:
1. Build subscription create/edit wizards using mock CRUD hooks
2. Add model deployment wizard (optional, may be private API only)
3. Enhance API key management (key details modal, usage stats)
4. Add subscription detail page with rate limit visualization
5. Integrate with quota system when backend ready

For backend integration:
1. Define protobuf schemas matching these types
2. Implement fulfillment-service proxy routes
3. Wire up ClusterOrder lookup + HubClientProvider
4. Add GPU quota enforcement
5. Create AITenant on ClusterOrder READY with RHOAI

---

**Status**: ✅ Mock implementation complete and ready for UI development
**Blocked by**: Fulfillment-service MaaS proxy routes implementation
