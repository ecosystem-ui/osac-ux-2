/**
 * Mock data fixtures for VITE_MOCK_MODE.
 *
 * Provides representative data for every resource type so the app is
 * fully browsable without a running fulfillment-service or OIDC provider.
 *
 * Do NOT set a bare root `$typeName` on plain fixture objects. That makes
 * protobuf create()/toBinary short-circuit and throw ForeignFieldError on
 * nested Metadata (e.g. creation_timestamp). The mock transport normalizes
 * responses with create(), which assigns $typeName across the full tree.
 */
import type {
  BareMetalInstance,
  BareMetalInstanceCatalogItem,
  BareMetalInstanceType,
  Cluster,
  ClusterCatalogItem,
  ClusterTemplate,
  ClusterVersion,
  ComputeInstance,
  ComputeInstanceCatalogItem,
  DiskImage,
  ExternalIP,
  ExternalIPAttachment,
  HostType,
  IdentityProvider,
  InstanceType,
  NATGateway,
  Project,
  ProjectMembership,
  ExternalIPPool as PublicExternalIPPool,
  StorageTier as PublicStorageTier,
  Role,
  RoleBinding,
  Secret,
  SecurityGroup,
  Subnet,
  User,
  VirtualNetwork,
  Volume,
} from '@osac/types';
import {
  AddOnOperatorInstallState,
  BareMetalInstanceConditionType,
  BareMetalInstanceRunStrategy,
  BareMetalInstanceState,
  ClusterConditionType,
  ClusterState,
  ClusterVersionState,
  ComputeInstanceConditionType,
  ComputeInstanceRunStrategy,
  ComputeInstanceState,
  ConditionStatus,
  DiskImageLifecycle,
  ExternalIPAttachmentEndpoint,
  ExternalIPAttachmentState,
  ExternalIPState,
  GuestOSFamily,
  InstanceTypeState,
  NATGatewayState,
  ProjectMembershipRole,
  ProjectState,
  Protocol,
  StorageTierState as PublicStorageTierState,
  SecretType,
  SecurityGroupState,
  ServiceTier,
  SubnetState,
  VirtualNetworkState,
  VolumeAccessMode,
  VolumeState,
} from '@osac/types';
import type {
  ExternalIPPool,
  BareMetalInstanceType as PrivateBareMetalInstanceType,
  InstanceType as PrivateInstanceType,
  StorageTier as PrivateStorageTier,
  Tenant as PrivateTenant,
  StorageBackend,
} from '@osac/types/private';
import {
  ExternalIPPoolState,
  IPFamily,
  StorageTierState as PrivateStorageTierState,
  StorageBackendState,
  TenantConditionType,
  TenantState,
} from '@osac/types/private';
import type { UserRole } from '@osac/ui-components/shellTypes';
import type { MockApiFixtures } from '@osac/ui-components/test-utils/createMockConnectTransport';

// ---------------------------------------------------------------------------
// Persona configuration
// ---------------------------------------------------------------------------

export interface PersonaConfig {
  username: string;
  tenantId: string;
}

export const PERSONAS: Record<UserRole, PersonaConfig> = {
  admin: {
    username: 'Cloud Provider Admin',
    tenantId: '',
  },
  'tenant-idp-manager': {
    username: 'Tenant IPD',
    tenantId: 'acme',
  },
  'tenant-admin': {
    username: 'Tenant admin',
    tenantId: 'acme',
  },
  'tenant-user': {
    username: 'Tenant User',
    tenantId: 'acme',
  },
};

/** localStorage key that persists the active persona across page reloads. */
export const MOCK_ROLE_KEY = 'osac.mockRole';

// ---------------------------------------------------------------------------
// Compute
// ---------------------------------------------------------------------------

const instanceTypes: InstanceType[] = [
  {
    id: 'it-small',
    metadata: { name: 'standard-2-4' },
    spec: { cpuCount: 2, vcpus: 2, memoryGib: 4, state: InstanceTypeState.ACTIVE },
  } as unknown as InstanceType,
  {
    id: 'it-large',
    metadata: { name: 'standard-8-32' },
    spec: { cpuCount: 8, vcpus: 8, memoryGib: 32, state: InstanceTypeState.ACTIVE },
  } as unknown as InstanceType,
];

const diskImages: DiskImage[] = [
  {
    id: 'di-rhel',
    metadata: { name: 'rhel-9.4' },
    spec: {
      lifecycle: DiskImageLifecycle.AVAILABLE,
      guestOsFamily: GuestOSFamily.GUEST_OS_FAMILY_LINUX,
    },
  } as unknown as DiskImage,
  {
    id: 'di-fedora',
    metadata: { name: 'fedora-40' },
    spec: {
      lifecycle: DiskImageLifecycle.AVAILABLE,
      guestOsFamily: GuestOSFamily.GUEST_OS_FAMILY_LINUX,
    },
  } as unknown as DiskImage,
];

const computeInstances: ComputeInstance[] = [
  {
    id: 'vm-1',
    metadata: {
      name: 'web-server-01',
      project: 'project-alpha.platform.baremetal',
      creator: 'alice@example.com',
      creationTimestamp: { seconds: BigInt(1717000000), nanos: 0 },
    },
    spec: {
      catalogItem: {
        id: 'ci-small-vm',
        name: 'Small Virtual Machine',
        project: 'project-alpha',
        shared: false,
      },
      instanceType: { id: 'it-small', name: 'standard-2-4' },
      diskImage: { id: 'di-rhel', name: 'rhel-9.4', project: 'project-alpha', shared: true },
      sshKey: { id: 'secret-ssh-1', name: 'alice-laptop-key' },
      bootDisk: { sizeGib: 40, storageTier: { id: 'pst-fast', name: 'fast' } },
      additionalDisks: [
        { sizeGib: 100, storageTier: { id: 'pst-standard', name: 'standard' } },
        { sizeGib: 250, storageTier: { id: 'pst-fast', name: 'fast' } },
      ],
      runStrategy: ComputeInstanceRunStrategy.COMPUTE_INSTANCE_RUN_STRATEGY_ALWAYS,
      userData: `#cloud-config\nhostname: web-server-01\npackage_update: true\npackages:\n  - nginx`,
      networkAttachments: [
        {
          subnet: { id: 'subnet-1', name: 'default-subnet' },
          securityGroups: [
            { id: 'sg-1', name: 'web-frontend-sg' },
            { id: 'sg-2', name: 'db-backend-sg' },
          ],
        },
      ],
      autoExternalIpAttachment: true,
    },
    status: {
      state: ComputeInstanceState.RUNNING,
      internalIpAddress: '10.0.1.10',
      externalIpAddress: '203.0.113.10',
      conditions: [
        {
          type: ComputeInstanceConditionType.PROVISIONED,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717000300), nanos: 0 },
          reason: 'InfrastructureAllocated',
          message: 'Compute and storage resources have been allocated.',
        },
        {
          type: ComputeInstanceConditionType.CONFIGURATION_APPLIED,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717000400), nanos: 0 },
          reason: 'ConfigurationApplied',
          message: 'The requested VM configuration has been applied.',
        },
        {
          type: ComputeInstanceConditionType.READY,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717000500), nanos: 0 },
          reason: 'AsExpected',
          message: 'The virtual machine is reachable.',
        },
      ],
      lastRestartedAt: { seconds: BigInt(1717000600), nanos: 0 },
      stateTransitionTime: { seconds: BigInt(1717000500), nanos: 0 },
      hub: 'hub-east-1',
    },
  } as unknown as ComputeInstance,
  {
    id: 'vm-2',
    metadata: { name: 'db-server-01', project: 'project-beta' },
    spec: {
      instanceType: { id: 'it-large' },
      diskImage: { id: 'di-rhel' },
      virtualNetwork: { id: 'vnet-1' },
    },
    status: { state: ComputeInstanceState.RUNNING, internalIpAddress: '10.0.1.11' },
  } as unknown as ComputeInstance,
  {
    id: 'vm-3',
    metadata: { name: 'test-machine', project: 'project-alpha' },
    spec: {
      instanceType: { id: 'it-small' },
      diskImage: { id: 'di-fedora' },
      virtualNetwork: { id: 'vnet-1' },
    },
    status: { state: ComputeInstanceState.FAILED },
  } as unknown as ComputeInstance,
];

const computeInstanceCatalogItems: ComputeInstanceCatalogItem[] = [
  {
    id: 'ci-small-vm',
    published: true,
    metadata: {
      name: 'Small Virtual Machine',
      annotations: { 'osac.io/rate-hourly': '4.25', 'osac.io/rate-monthly': '2850' },
    },
    spec: { templateId: 'tpl-small' },
    fields: {
      instanceType: {
        behavior: {
          case: 'locked',
          value: { id: 'it-small', name: 'standard-2-4', shared: true },
        },
      },
      bootDisk: {
        sizeGib: {
          behavior: { case: 'locked', value: 40 },
        },
      },
      diskImage: {
        behavior: {
          case: 'locked',
          value: { id: 'di-rhel', name: 'rhel-9.4', shared: true },
        },
      },
    },
  } as unknown as ComputeInstanceCatalogItem,
  {
    id: 'ci-gpu-vm',
    published: true,
    metadata: {
      name: 'GPU-Optimized VM',
      annotations: { 'osac.io/rate-hourly': '8.50', 'osac.io/rate-monthly': '5200' },
    },
    spec: { templateId: 'tpl-gpu' },
    fields: {
      instanceType: {
        behavior: {
          case: 'locked',
          value: { id: 'it-large', name: 'standard-8-32', shared: true },
        },
      },
      bootDisk: {
        sizeGib: {
          behavior: { case: 'locked', value: 80 },
        },
      },
      diskImage: {
        behavior: {
          case: 'locked',
          value: { id: 'di-fedora', name: 'fedora-40', shared: true },
        },
      },
    },
  } as unknown as ComputeInstanceCatalogItem,
];

// ---------------------------------------------------------------------------
// Clusters
// ---------------------------------------------------------------------------

const hostTypes: HostType[] = [
  {
    id: 'ht-general',
    metadata: { name: 'general-purpose' },
    spec: { cpuCount: 16, memoryGib: 64 },
  } as unknown as HostType,
  {
    id: 'ht-compute',
    metadata: { name: 'compute-optimized' },
    spec: { cpuCount: 32, memoryGib: 128 },
  } as unknown as HostType,
];

const clusterVersions: ClusterVersion[] = [
  {
    id: 'cv-4-17',
    metadata: { name: '4.17' },
    spec: { version: '4.17.0', state: ClusterVersionState.ACTIVE, enabled: true },
  } as unknown as ClusterVersion,
  {
    id: 'cv-4-16',
    metadata: { name: '4.16' },
    spec: { version: '4.16.0', state: ClusterVersionState.ACTIVE, enabled: true },
  } as unknown as ClusterVersion,
];

const clusterTemplates: ClusterTemplate[] = [
  {
    id: 'ctpl-standard',
    metadata: { name: 'Standard OCP Cluster' },
    spec: {},
  } as unknown as ClusterTemplate,
];

const clusterCatalogItems: ClusterCatalogItem[] = [
  {
    id: 'cci-standard',
    published: true,
    metadata: {
      name: 'OpenShift Cluster',
      annotations: { 'osac.io/rate-hourly': '12.50', 'osac.io/rate-monthly': '8400' },
    },
    spec: { templateId: 'ctpl-standard' },
    fields: {
      version: {
        behavior: {
          case: 'locked',
          value: { id: 'cv-4-17', name: '4.17', shared: true },
        },
      },
      nodeSets: {
        behavior: {
          case: 'locked',
          value: {
            items: {
              controlPlane: {
                hostType: { id: 'ht-general', name: 'general-purpose', shared: true },
                size: 3,
                baremetalInstanceType: {
                  id: 'bm-type-general',
                  name: 'General purpose bare metal',
                  shared: true,
                },
              },
              workers: {
                hostType: { id: 'ht-compute', name: 'compute-optimized', shared: true },
                size: 4,
                baremetalInstanceType: {
                  id: 'bm-type-gpu',
                  name: 'GPU bare metal',
                  shared: true,
                },
              },
            },
          },
        },
      },
    },
  } as unknown as ClusterCatalogItem,
];

const bareMetalInstanceCatalogItems: BareMetalInstanceCatalogItem[] = [
  {
    id: 'bmci-gpu-server',
    published: true,
    metadata: {
      name: 'GPU Server',
      annotations: { 'osac.io/rate-hourly': '8.50', 'osac.io/rate-monthly': '5200' },
    },
    spec: { templateId: 'tpl-bm-gpu' },
    fields: {
      instanceType: {
        behavior: {
          case: 'locked',
          value: { id: 'bm-type-gpu', name: 'GPU bare metal', shared: true },
        },
      },
      diskImage: {
        behavior: {
          case: 'locked',
          value: { id: 'di-rhel', name: 'rhel-9.4', shared: true },
        },
      },
    },
  } as unknown as BareMetalInstanceCatalogItem,
  {
    id: 'bmci-hpc-node',
    published: true,
    metadata: {
      name: 'HPC Compute Node',
      annotations: { 'osac.io/rate-hourly': '6.75', 'osac.io/rate-monthly': '4500' },
    },
    spec: { templateId: 'tpl-bm-hpc' },
    fields: {
      instanceType: {
        behavior: {
          case: 'locked',
          value: { id: 'bm-type-general', name: 'General purpose bare metal', shared: true },
        },
      },
      diskImage: {
        behavior: {
          case: 'locked',
          value: { id: 'di-rhel', name: 'rhel-9.4', shared: true },
        },
      },
    },
  } as unknown as BareMetalInstanceCatalogItem,
];

const bareMetalInstanceTypes: BareMetalInstanceType[] = [
  {
    id: 'bm-type-gpu',
    metadata: { name: 'GPU bare metal' },
    spec: {
      description: 'High-performance bare metal host for GPU workloads.',
      hardware: {
        cpu: {
          cores: 32,
          architecture: 'x86_64',
          model: 'AMD EPYC 7543P',
          threadsPerCore: 2,
        },
        memory: { totalGb: BigInt(256), type: 'DDR4' },
        disks: [{ type: 'NVMe SSD', capacityGb: BigInt(1920), interface: 'NVMe' }],
        accelerators: [{ type: 'GPU', model: 'A100', vendor: 'NVIDIA', memoryGb: 80 }],
        networkPorts: [
          { name: 'eno1', role: 'fabric', type: 'ethernet', speed: '25Gbps' },
          { name: 'eno2', role: 'management', type: 'ethernet', speed: '1Gbps' },
        ],
        capabilities: { gpu: 'true', sriov: 'true', nvme: 'true' },
      },
      hostLabelSelector: { matchLabels: { 'hardware.gpu': 'a100', 'hardware.arch': 'x86_64' } },
    },
  } as unknown as BareMetalInstanceType,
  {
    id: 'bm-type-general',
    metadata: { name: 'General purpose bare metal' },
    spec: {
      description: 'Balanced bare metal host for general workloads.',
      hardware: {
        cpu: {
          cores: 16,
          architecture: 'x86_64',
          model: 'Intel Xeon Gold 6338',
          threadsPerCore: 2,
        },
        memory: { totalGb: BigInt(128), type: 'DDR4' },
        disks: [
          { type: 'SSD', capacityGb: BigInt(960), interface: 'SATA' },
          { type: 'HDD', capacityGb: BigInt(4000), interface: 'SAS' },
        ],
        accelerators: [],
        networkPorts: [{ name: 'eno1', role: 'fabric', type: 'ethernet', speed: '10Gbps' }],
        capabilities: { sriov: 'true', secureBoot: 'true' },
      },
      hostLabelSelector: {
        matchLabels: { 'hardware.class': 'general', 'hardware.arch': 'x86_64' },
      },
    },
  } as unknown as BareMetalInstanceType,
];

const privateBaremetalInstanceTypes: PrivateBareMetalInstanceType[] =
  bareMetalInstanceTypes as unknown as PrivateBareMetalInstanceType[];

const clusters: Cluster[] = [
  {
    id: 'cluster-1',
    metadata: {
      name: 'acme-prod-cluster',
      project: 'project-alpha.platform',
      creator: 'alice@example.com',
      creationTimestamp: { seconds: BigInt(1717000000), nanos: 0 },
    },
    spec: {
      catalogItem: {
        id: 'cci-standard',
        name: 'OpenShift Cluster',
        project: 'project-alpha',
        shared: false,
      },
      version: { id: 'cv-4-17', name: '4.17' },
      sshPublicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIClusterMockKey cluster@example.com',
      nodeSets: {
        controlPlane: {
          hostType: { id: 'ht-general', name: 'general-purpose' },
          size: 3,
          fabricInterface: 'eno1',
          baremetalInstanceType: { id: 'bm-type-general', name: 'General purpose bare metal' },
        },
        workers: {
          hostType: { id: 'ht-compute', name: 'compute-optimized' },
          size: 4,
          fabricInterface: 'eno1',
          baremetalInstanceType: { id: 'bm-type-gpu', name: 'GPU bare metal' },
        },
      },
      network: { podCidr: '10.128.0.0/14', serviceCidr: '172.30.0.0/16' },
      networkAttachment: {
        subnet: { id: 'subnet-1', name: 'default-subnet' },
        securityGroups: [
          { id: 'sg-1', name: 'web-frontend-sg' },
          { id: 'sg-2', name: 'db-backend-sg' },
        ],
      },
      autoExternalIpAttachment: true,
      pullSecretSecret: { id: 'secret-pull', name: 'openshift-pull-secret' },
      addOnOperators: [
        { name: 'logging', namespace: 'openshift-logging' },
        { name: 'monitoring', namespace: 'openshift-monitoring' },
        { name: 'rhoai', namespace: 'redhat-ods-applications' },
      ],
    },
    status: {
      state: ClusterState.READY,
      conditions: [
        {
          type: ClusterConditionType.READY,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717000500), nanos: 0 },
          reason: 'ClusterReady',
          message: 'The cluster is ready to use.',
        },
        {
          type: ClusterConditionType.FAILED,
          status: ConditionStatus.FALSE,
          lastTransitionTime: { seconds: BigInt(1717000400), nanos: 0 },
          reason: 'NoFailure',
          message: 'No cluster failure has been reported.',
        },
      ],
      apiUrl: 'https://api.acme-prod.example.com:6443',
      consoleUrl: 'https://console.acme-prod.example.com',
      nodeSets: {
        controlPlane: { hostType: { id: 'ht-general', name: 'general-purpose' }, size: 3 },
        workers: { hostType: { id: 'ht-compute', name: 'compute-optimized' }, size: 4 },
      },
      apiEndpoint: '10.0.1.100',
      ingressEndpoint: '10.0.1.101',
      stateTransitionTime: { seconds: BigInt(1717000500), nanos: 0 },
      kubeconfigSecret: { id: 'secret-kubeconfig', name: 'acme-prod-kubeconfig' },
      passwordSecret: { id: 'secret-password', name: 'acme-prod-kubeadmin-password' },
      hub: 'hub-east-1',
      addOnOperators: [
        { name: 'logging', state: AddOnOperatorInstallState.INSTALLED, message: '' },
        { name: 'monitoring', state: AddOnOperatorInstallState.INSTALLED, message: '' },
        { name: 'rhoai', state: AddOnOperatorInstallState.INSTALLED, message: '' },
      ],
    },
  } as unknown as Cluster,
  {
    id: 'cluster-2',
    metadata: {
      name: 'north-summit-staging',
      project: 'platform.staging',
      creator: 'bob@example.com',
      creationTimestamp: { seconds: BigInt(1720000000), nanos: 0 },
    },
    spec: {
      catalogItem: {
        id: 'cci-standard',
        name: 'OpenShift Cluster',
        project: 'platform',
        shared: false,
      },
      version: { id: 'cv-4-16', name: '4.16' },
      nodeSets: {
        controlPlane: {
          hostType: { id: 'ht-general', name: 'general-purpose' },
          size: 3,
          fabricInterface: 'eno1',
          baremetalInstanceType: { id: 'bm-type-general', name: 'General purpose bare metal' },
        },
        workers: {
          hostType: { id: 'ht-compute', name: 'compute-optimized' },
          size: 2,
          fabricInterface: 'eno1',
          baremetalInstanceType: { id: 'bm-type-gpu', name: 'GPU bare metal' },
        },
      },
      network: { podCidr: '10.132.0.0/14', serviceCidr: '172.31.0.0/16' },
    },
    status: {
      state: ClusterState.PROGRESSING,
      conditions: [],
      consoleUrl: 'https://console.north-summit-staging.example.com',
      nodeSets: {
        controlPlane: { hostType: { id: 'ht-general', name: 'general-purpose' }, size: 3 },
        workers: { hostType: { id: 'ht-compute', name: 'compute-optimized' }, size: 2 },
      },
      stateTransitionTime: { seconds: BigInt(1720000300), nanos: 0 },
    },
  } as unknown as Cluster,
  {
    id: 'cluster-3',
    metadata: {
      name: 'research-ocp',
      project: 'research',
      creator: 'carol@example.com',
      creationTimestamp: { seconds: BigInt(1723000000), nanos: 0 },
    },
    spec: {
      catalogItem: {
        id: 'cci-standard',
        name: 'OpenShift Cluster',
        project: 'research',
        shared: false,
      },
      version: { id: 'cv-4-17', name: '4.17' },
      nodeSets: {
        controlPlane: {
          hostType: { id: 'ht-general', name: 'general-purpose' },
          size: 3,
          fabricInterface: 'eno1',
          baremetalInstanceType: { id: 'bm-type-general', name: 'General purpose bare metal' },
        },
        workers: {
          hostType: { id: 'ht-compute', name: 'compute-optimized' },
          size: 6,
          fabricInterface: 'eno1',
          baremetalInstanceType: { id: 'bm-type-gpu', name: 'GPU bare metal' },
        },
      },
      network: { podCidr: '10.136.0.0/14', serviceCidr: '172.32.0.0/16' },
    },
    status: {
      state: ClusterState.FAILED,
      conditions: [
        {
          type: ClusterConditionType.FAILED,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1723000400), nanos: 0 },
          reason: 'ProvisioningFailed',
          message: 'The cluster could not be provisioned.',
        },
      ],
      consoleUrl: 'https://console.research-ocp.example.com',
      nodeSets: {
        controlPlane: { hostType: { id: 'ht-general', name: 'general-purpose' }, size: 3 },
        workers: { hostType: { id: 'ht-compute', name: 'compute-optimized' }, size: 6 },
      },
      stateTransitionTime: { seconds: BigInt(1723000400), nanos: 0 },
    },
  } as unknown as Cluster,
];

// ---------------------------------------------------------------------------
// Bare Metal
// ---------------------------------------------------------------------------

const bareMetalInstances: BareMetalInstance[] = [
  {
    id: 'bm-1',
    metadata: {
      name: 'bm-worker-01',
      creator: 'alice@example.com',
      creationTimestamp: { seconds: BigInt(1717000000), nanos: 0 },
    },
    spec: {
      catalogItem: {
        id: 'bmci-gpu-server',
        name: 'GPU Server',
        project: 'project-alpha',
        shared: false,
      },
      sshPublicKey:
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBareMetalMockKey bm-worker-01@example.com',
      runStrategy: BareMetalInstanceRunStrategy.ALWAYS,
      restartTrigger: BigInt(2),
      networkAttachments: [
        {
          subnet: { id: 'subnet-1', name: 'default-subnet' },
          securityGroups: [
            { id: 'sg-1', name: 'web-frontend-sg' },
            { id: 'sg-2', name: 'db-backend-sg' },
          ],
          interface: 'eno1',
          primary: true,
        },
      ],
      autoExternalIpAttachment: true,
      instanceType: {
        id: 'bm-type-gpu',
        name: 'GPU bare metal',
        project: 'project-alpha',
        shared: false,
      },
      diskImage: {
        id: 'image-rhel9',
        name: 'RHEL 9.4',
        project: 'project-alpha',
        shared: true,
      },
    },
    status: {
      state: BareMetalInstanceState.RUNNING,
      conditions: [
        {
          type: BareMetalInstanceConditionType.PROVISIONED,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717000300), nanos: 0 },
          reason: 'HardwareAllocated',
          message: 'Dedicated hardware has been allocated.',
        },
        {
          type: BareMetalInstanceConditionType.CONFIGURATION_APPLIED,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717000400), nanos: 0 },
          reason: 'ConfigurationApplied',
          message: 'The operating system configuration was applied.',
        },
        {
          type: BareMetalInstanceConditionType.READY,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717000500), nanos: 0 },
          reason: 'InstanceReady',
          message: 'The bare metal instance is ready for use.',
        },
      ],
      restartTrigger: BigInt(2),
      networkAttachmentStatuses: [
        {
          interface: 'eno1',
          subnetRef: 'subnet-1',
          ipAddress: '10.0.1.25',
          primary: true,
        },
      ],
      hardware: {
        nics: [{ mac: 'aa:bb:cc:dd:ee:01' }, { mac: 'aa:bb:cc:dd:ee:02' }],
      },
      hub: 'hub-east-1',
      stateTransitionTime: { seconds: BigInt(1717000600), nanos: 0 },
    },
  } as unknown as BareMetalInstance,
];

// ---------------------------------------------------------------------------
// Networking
// ---------------------------------------------------------------------------

const virtualNetworks: VirtualNetwork[] = [
  {
    id: 'vnet-1',
    metadata: {
      name: 'main-network',
      creator: 'alice@example.com',
      tenant: 'acme-corporation',
      labels: { environment: 'production', region: 'us-east' },
      annotations: { 'osac.io/network-class': 'udn-net' },
      version: 1,
      project: 'project-alpha',
      displayName: 'Main production network',
      description: 'Primary virtual network for production workloads.',
      creationTimestamp: { seconds: BigInt(1717000000), nanos: 0 },
    },
    spec: { ipv4Cidr: '10.0.0.0/16', ipv6Cidr: '' },
    status: { state: VirtualNetworkState.READY, message: 'Network ready for compute instances.' },
  } as unknown as VirtualNetwork,
  ...Array.from({ length: 4 }, (_, index) => {
    const number = index + 2;
    return {
      id: `vnet-${number}`,
      metadata: {
        name: `tenant-network-${String(number).padStart(2, '0')}`,
        creator: number % 2 === 0 ? 'alice@example.com' : 'bob@example.com',
        tenant: number % 2 === 0 ? 'acme-corporation' : 'north-summit-bank',
        labels: {
          environment: number % 3 === 0 ? 'development' : 'production',
          region: number % 2 === 0 ? 'us-east' : 'eu-west',
        },
        annotations: { 'osac.io/network-class': 'udn-net' },
        version: 1,
        project: number % 2 === 0 ? 'project-alpha' : 'project-beta',
        displayName: `Tenant network ${String(number).padStart(2, '0')}`,
        description: `Virtual network for tenant workloads ${String(number).padStart(2, '0')}.`,
        creationTimestamp: { seconds: BigInt(1717000000 + number * 3600), nanos: 0 },
      },
      spec: { ipv4Cidr: `10.${number}.0.0/16`, ipv6Cidr: '' },
      status: { state: VirtualNetworkState.READY, message: 'Network ready for compute instances.' },
    } as unknown as VirtualNetwork;
  }),
];

const subnets: Subnet[] = [
  {
    id: 'subnet-1',
    metadata: { name: 'default-subnet' },
    spec: { ipv4Cidr: '10.0.1.0/24', virtualNetwork: { id: 'vnet-1' } },
    status: { state: SubnetState.READY },
  } as unknown as Subnet,
];

const securityGroups: SecurityGroup[] = [
  {
    id: 'sg-1',
    metadata: { name: 'web-frontend-sg' },
    spec: {
      virtualNetwork: { id: 'vnet-1' },
      ingress: [
        {
          protocol: Protocol.TCP,
          portFrom: 443,
          portTo: 443,
          ipv4Cidr: '0.0.0.0/0',
        },
        {
          protocol: Protocol.TCP,
          portFrom: 80,
          portTo: 80,
          ipv4Cidr: '0.0.0.0/0',
        },
        {
          protocol: Protocol.ICMP,
          ipv4Cidr: '10.0.0.0/8',
        },
      ],
      egress: [
        {
          protocol: Protocol.ALL,
          ipv4Cidr: '0.0.0.0/0',
        },
      ],
    },
    status: { state: SecurityGroupState.READY },
  } as unknown as SecurityGroup,
  {
    id: 'sg-2',
    metadata: { name: 'db-backend-sg' },
    spec: {
      virtualNetwork: { id: 'vnet-1' },
      ingress: [
        {
          protocol: Protocol.TCP,
          portFrom: 5432,
          portTo: 5432,
          ipv4Cidr: '10.0.1.0/24',
        },
        {
          protocol: Protocol.TCP,
          portFrom: 22,
          portTo: 22,
          ipv4Cidr: '10.0.0.0/8',
        },
      ],
      egress: [
        {
          protocol: Protocol.TCP,
          portFrom: 443,
          portTo: 443,
          ipv4Cidr: '0.0.0.0/0',
        },
      ],
    },
    status: { state: SecurityGroupState.READY },
  } as unknown as SecurityGroup,
  {
    id: 'sg-3',
    metadata: { name: 'gpu-workload-sg' },
    spec: {
      virtualNetwork: { id: 'vnet-1' },
      ingress: [
        {
          protocol: Protocol.TCP,
          portFrom: 8080,
          portTo: 8090,
          ipv4Cidr: '192.168.0.0/16',
        },
      ],
      egress: [
        {
          protocol: Protocol.ALL,
          ipv4Cidr: '0.0.0.0/0',
        },
      ],
    },
    status: { state: SecurityGroupState.PENDING },
  } as unknown as SecurityGroup,
];

const externalIpPools: PublicExternalIPPool[] = [
  {
    id: 'eip-pool-1',
    metadata: { name: 'primary-pool' },
    spec: { cidr: '203.0.113.0/24' },
    status: { available: 1n },
  } as unknown as PublicExternalIPPool,
];

const externalIps: ExternalIP[] = [
  {
    id: 'eip-1',
    metadata: { name: 'eip-web-01', tenant: 'acme-corporation' },
    spec: { pool: { id: 'eip-pool-1' } },
    status: {
      state: ExternalIPState.EXTERNAL_IP_STATE_ALLOCATED,
      address: '203.0.113.10',
      attached: true,
    },
  } as unknown as ExternalIP,
  {
    id: 'eip-2',
    metadata: { name: 'eip-spare', tenant: 'north-summit-bank' },
    spec: { pool: { id: 'eip-pool-1' } },
    status: {
      state: ExternalIPState.EXTERNAL_IP_STATE_ALLOCATED,
      address: '203.0.113.11',
      attached: true,
    },
  } as unknown as ExternalIP,
  {
    id: 'eip-3',
    metadata: { name: 'eip-cluster-ingress', tenant: 'atlas-health' },
    spec: { pool: { id: 'eip-pool-1' } },
    status: {
      state: ExternalIPState.EXTERNAL_IP_STATE_ALLOCATED,
      address: '203.0.113.12',
      attached: true,
    },
  } as unknown as ExternalIP,
];

const externalIpAttachments: ExternalIPAttachment[] = [
  {
    id: 'attachment-1',
    spec: {
      externalIp: { id: 'eip-1' },
      target: { case: 'computeInstance', value: { id: 'vm-1' } },
    },
    status: {
      state: ExternalIPAttachmentState.EXTERNAL_IP_ATTACHMENT_STATE_READY,
      externalIpAddress: '203.0.113.10',
    },
  } as unknown as ExternalIPAttachment,
  {
    id: 'attachment-bm-1',
    metadata: {
      name: 'bm-worker-01-external-ip',
      labels: { 'osac.openshift.io/auto-created': 'true' },
    },
    spec: {
      externalIp: { id: 'eip-1' },
      target: { case: 'baremetalInstance', value: { id: 'bm-1' } },
    },
    status: {
      state: ExternalIPAttachmentState.EXTERNAL_IP_ATTACHMENT_STATE_READY,
      externalIpAddress: '203.0.113.10',
    },
  } as unknown as ExternalIPAttachment,
  {
    id: 'attachment-cluster-api',
    metadata: { name: 'acme-prod-cluster-api-external-ip' },
    spec: {
      externalIp: { id: 'eip-2' },
      target: { case: 'cluster', value: { id: 'cluster-1' } },
      targetEndpoint: ExternalIPAttachmentEndpoint.EXTERNAL_IP_ATTACHMENT_ENDPOINT_API,
    },
    status: {
      state: ExternalIPAttachmentState.EXTERNAL_IP_ATTACHMENT_STATE_READY,
      externalIpAddress: '203.0.113.11',
    },
  } as unknown as ExternalIPAttachment,
  {
    id: 'attachment-cluster-ingress',
    metadata: { name: 'acme-prod-cluster-ingress-external-ip' },
    spec: {
      externalIp: { id: 'eip-3' },
      target: { case: 'cluster', value: { id: 'cluster-1' } },
      targetEndpoint: ExternalIPAttachmentEndpoint.EXTERNAL_IP_ATTACHMENT_ENDPOINT_INGRESS,
    },
    status: {
      state: ExternalIPAttachmentState.EXTERNAL_IP_ATTACHMENT_STATE_READY,
      externalIpAddress: '203.0.113.12',
    },
  } as unknown as ExternalIPAttachment,
];

const natGateways: NATGateway[] = [
  {
    id: 'nat-1',
    metadata: { name: 'main-nat' },
    spec: { virtualNetwork: { id: 'vnet-1' }, externalIp: { id: 'eip-1' } },
    status: { state: NATGatewayState.NAT_GATEWAY_STATE_READY },
  } as unknown as NATGateway,
];

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const volumes: Volume[] = [
  {
    id: 'vol-1',
    metadata: {
      name: 'data-volume',
      project: 'project-alpha',
      creationTimestamp: { seconds: BigInt(1717000000), nanos: 0 },
    },
    spec: {
      storageTier: 'fast',
      sizeGib: BigInt(100),
      accessMode: VolumeAccessMode.READ_WRITE_ONCE,
    },
    status: { state: VolumeState.AVAILABLE },
  } as unknown as Volume,
  {
    id: 'vol-2',
    metadata: {
      name: 'backup-volume',
      project: 'project-beta',
      creationTimestamp: { seconds: BigInt(1717100000), nanos: 0 },
    },
    spec: {
      storageTier: 'standard',
      sizeGib: BigInt(500),
      accessMode: VolumeAccessMode.READ_WRITE_ONCE,
    },
    status: { state: VolumeState.AVAILABLE },
  } as unknown as Volume,
];

const publicStorageTiers: PublicStorageTier[] = [
  {
    id: 'st-fast',
    metadata: { name: 'fast' },
    spec: {},
    status: { state: PublicStorageTierState.ACTIVE },
  } as unknown as PublicStorageTier,
  {
    id: 'st-standard',
    metadata: { name: 'standard' },
    spec: {},
    status: { state: PublicStorageTierState.ACTIVE },
  } as unknown as PublicStorageTier,
];

// ---------------------------------------------------------------------------
// IAM / Tenant
// ---------------------------------------------------------------------------

const projects: Project[] = [
  {
    id: 'project-alpha',
    metadata: {
      name: 'project-alpha',
      annotations: {
        'osac.io/services': 'VMaaS, BMaaS, CaaS',
        'osac.io/project-members': '4',
        'osac.io/ip-pool': 'primary-pool',
        'osac.io/instance-quota': '8 / 20 instances',
      },
    },
    spec: { title: 'Project Alpha', description: 'Primary application environment.' },
    status: { state: ProjectState.ACTIVE },
  } as unknown as Project,
  {
    id: 'project-alpha-platform',
    metadata: {
      name: 'project-alpha.platform',
      project: 'project-alpha',
      annotations: {
        'osac.io/services': 'VMaaS, CaaS',
        'osac.io/project-members': '3',
        'osac.io/ip-pool': 'platform-pool',
        'osac.io/instance-quota': '5 / 12 instances',
      },
    },
    spec: { title: 'Platform', description: 'Platform services for Project Alpha.' },
    status: { state: ProjectState.ACTIVE },
  } as unknown as Project,
  {
    id: 'project-alpha-platform-baremetal',
    metadata: {
      name: 'project-alpha.platform.baremetal',
      project: 'project-alpha.platform',
      annotations: {
        'osac.io/services': 'BMaaS',
        'osac.io/project-members': '2',
        'osac.io/ip-pool': 'baremetal-pool',
        'osac.io/instance-quota': '2 / 8 instances',
      },
    },
    spec: { title: 'Bare Metal', description: 'Bare metal workloads for the platform team.' },
    status: { state: ProjectState.ACTIVE },
  } as unknown as Project,
  {
    id: 'project-beta',
    metadata: {
      name: 'project-beta',
      annotations: {
        'osac.io/services': 'VMaaS, CaaS',
        'osac.io/project-members': '6',
        'osac.io/ip-pool': 'secondary-pool',
        'osac.io/instance-quota': '12 / 30 instances',
      },
    },
    spec: { title: 'Project Beta', description: 'Secondary application environment.' },
    status: { state: ProjectState.ACTIVE },
  } as unknown as Project,
  {
    id: 'project-beta-data',
    metadata: {
      name: 'project-beta.data',
      project: 'project-beta',
      annotations: {
        'osac.io/services': 'VMaaS',
        'osac.io/project-members': '3',
        'osac.io/ip-pool': 'data-pool',
        'osac.io/instance-quota': '4 / 10 instances',
      },
    },
    spec: { title: 'Data', description: 'Data services for Project Beta.' },
    status: { state: ProjectState.ACTIVE },
  } as unknown as Project,
  {
    id: 'project-beta-data-analytics',
    metadata: {
      name: 'project-beta.data.analytics',
      project: 'project-beta.data',
      annotations: {
        'osac.io/services': 'VMaaS',
        'osac.io/project-members': '2',
        'osac.io/ip-pool': 'analytics-pool',
        'osac.io/instance-quota': '2 / 6 instances',
      },
    },
    spec: { title: 'Analytics', description: 'Analytics workloads for Project Beta.' },
    status: { state: ProjectState.ACTIVE },
  } as unknown as Project,
];

const projectMemberships: ProjectMembership[] = [
  {
    id: 'pm-1',
    metadata: { name: 'alice-project-membership', project: 'project-alpha' },
    spec: { role: ProjectMembershipRole.MANAGER, users: [{ id: 'user-1' }] },
  } as unknown as ProjectMembership,
  {
    id: 'pm-2',
    metadata: { name: 'bob-project-membership', project: 'project-beta' },
    spec: { role: ProjectMembershipRole.VIEWER, users: [{ id: 'user-2' }] },
  } as unknown as ProjectMembership,
];

const users: User[] = [
  {
    id: 'user-1',
    metadata: { name: 'alice' },
    spec: { username: 'alice', email: 'alice@acme.com' },
  } as unknown as User,
  {
    id: 'user-2',
    metadata: { name: 'bob' },
    spec: { username: 'bob', email: 'bob@acme.com' },
  } as unknown as User,
];

const roles: Role[] = [
  { id: 'role-admin', metadata: { name: 'Tenant Admin' }, spec: {} } as unknown as Role,
  { id: 'role-user', metadata: { name: 'Tenant User' }, spec: {} } as unknown as Role,
];

const roleBindings: RoleBinding[] = [
  {
    id: 'rb-1',
    spec: { user: { id: 'user-1' }, role: { id: 'role-admin' } },
  } as unknown as RoleBinding,
];

const identityProviders: IdentityProvider[] = [
  {
    id: 'idp-1',
    metadata: { name: 'Acme SSO' },
    spec: { issuerUrl: 'https://sso.acme.com', clientId: 'osac-ui' },
  } as unknown as IdentityProvider,
];

const secrets: Secret[] = [
  {
    id: 'secret-1',
    metadata: {
      name: 'registry-credentials',
      project: 'project-alpha',
      creationTimestamp: { seconds: BigInt(1718456400), nanos: 0 },
    },
    data: {
      username: new TextEncoder().encode('acme-registry'),
      password: new TextEncoder().encode('mock-registry-password'),
    },
    type: SecretType.OPAQUE,
  } as unknown as Secret,
  {
    id: 'secret-ssh-1',
    metadata: {
      name: 'alice-laptop-key',
      project: 'project-alpha',
      creationTimestamp: { seconds: BigInt(1718546400), nanos: 0 },
    },
    data: {
      public_key: new TextEncoder().encode(
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIVmMockSshKey alice@example.com',
      ),
    },
    type: SecretType.SSH_PUBLIC_KEY,
  } as unknown as Secret,
  {
    id: 'secret-pull',
    metadata: {
      name: 'openshift-pull-secret',
      project: 'project-alpha.platform',
      creationTimestamp: { seconds: BigInt(1718542800), nanos: 0 },
    },
    data: { '.dockerconfigjson': new Uint8Array([123, 125]) },
    type: SecretType.PULL_SECRET,
  } as unknown as Secret,
  {
    id: 'secret-kubeconfig',
    metadata: {
      name: 'acme-prod-kubeconfig',
      project: 'project-alpha.platform',
      creationTimestamp: { seconds: BigInt(1718629200), nanos: 0 },
    },
    data: {
      kubeconfig: new TextEncoder().encode(
        'apiVersion: v1\nclusters:\n- name: acme-prod-cluster\n',
      ),
    },
    type: SecretType.KUBECONFIG,
  } as unknown as Secret,
  {
    id: 'secret-password',
    metadata: {
      name: 'acme-prod-kubeadmin-password',
      project: 'project-alpha.platform',
      creationTimestamp: { seconds: BigInt(1718715600), nanos: 0 },
    },
    data: { password: new TextEncoder().encode('MockClusterAdmin!2026') },
    type: SecretType.OPAQUE,
  } as unknown as Secret,
];

// ---------------------------------------------------------------------------
// Admin (private)
// ---------------------------------------------------------------------------

const tenants: PrivateTenant[] = [
  {
    id: 'tenant-acme',
    metadata: {
      name: 'Acme Corp',
      creationTimestamp: { seconds: BigInt(1717000000), nanos: 0 },
      creator: 'cloud-provider-admin',
      tenant: '',
      labels: { 'osac.io/segment': 'enterprise', 'osac.io/region': 'us-east' },
      annotations: {
        'osac.io/customer-id': 'acme-001',
        'osac.io/billing-account': 'acme-enterprise-billing',
        'osac.io/billing-account-id': 'acme-001',
        'osac.io/company-logo': '/red-hat-logo.svg',
        'osac.io/company-logo-filename': 'acme-corporation-logo.svg',
      },
      version: 3,
      project: '',
      displayName: 'Acme Corporation',
      description: 'Primary tenant for Acme Corporation workloads.',
      finalizers: [],
    },
    spec: {
      domains: ['acme.example.com', 'acme-corp.example.com'],
      breakGlassCredentialsSecret: {
        id: 'secret-acme-break-glass',
        name: 'acme-break-glass-credentials',
      },
    },
    status: {
      state: TenantState.SYNCED,
      message: 'Tenant synced to the identity provider.',
      idpTenantName: 'acme-corp',
      breakGlassUserId: 'acme-break-glass-admin',
      conditions: [
        {
          type: TenantConditionType.DEFAULT_NETWORKING_READY,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717003600), nanos: 0 },
          reason: 'NetworkingReady',
          message: 'Default networking resources are ready.',
        },
        {
          type: TenantConditionType.VAULT_READY,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717007200), nanos: 0 },
          reason: 'VaultReady',
          message: 'The tenant vault namespace is ready.',
        },
        {
          type: TenantConditionType.COMPUTE_INFRASTRUCTURE_READY,
          status: ConditionStatus.TRUE,
          lastTransitionTime: { seconds: BigInt(1717010800), nanos: 0 },
          reason: 'ComputeInfrastructureReady',
          message: 'Compute infrastructure is ready.',
        },
      ],
    },
  } as unknown as PrivateTenant,
  {
    id: 'tenant-globex',
    metadata: {
      name: 'Globex Inc',
      creationTimestamp: { seconds: BigInt(1717100000), nanos: 0 },
      creator: 'cloud-provider-admin',
      tenant: '',
      labels: { 'osac.io/segment': 'mid-market', 'osac.io/region': 'eu-west' },
      annotations: {
        'osac.io/customer-id': 'globex-002',
        'osac.io/billing-account': 'globex-enterprise-billing',
        'osac.io/billing-account-id': 'globex-002',
      },
      version: 2,
      project: '',
      displayName: 'Globex Incorporated',
      description: 'Tenant for Globex development and production workloads.',
      finalizers: [],
    },
    spec: {
      domains: ['globex.example.com'],
      breakGlassCredentialsSecret: {
        id: 'secret-globex-break-glass',
        name: 'globex-break-glass-credentials',
      },
    },
    status: {
      state: TenantState.PENDING,
      message: 'Waiting for identity provider synchronization.',
      idpTenantName: '',
      breakGlassUserId: '',
      conditions: [
        {
          type: TenantConditionType.DEFAULT_NETWORKING_READY,
          status: ConditionStatus.FALSE,
          lastTransitionTime: { seconds: BigInt(1717103600), nanos: 0 },
          reason: 'NetworkingPending',
          message: 'Default networking resources are still being provisioned.',
        },
        {
          type: TenantConditionType.VAULT_READY,
          status: ConditionStatus.FALSE,
          lastTransitionTime: { seconds: BigInt(1717107200), nanos: 0 },
          reason: 'VaultPending',
          message: 'The tenant vault namespace is waiting for synchronization.',
        },
        {
          type: TenantConditionType.COMPUTE_INFRASTRUCTURE_READY,
          status: ConditionStatus.UNSPECIFIED,
          lastTransitionTime: { seconds: BigInt(1717110800), nanos: 0 },
          reason: 'ComputeInfrastructureUnknown',
          message: 'Compute readiness is not available until tenant synchronization completes.',
        },
      ],
    },
  } as unknown as PrivateTenant,
];

const storageBackends: StorageBackend[] = [
  {
    id: 'sb-1',
    metadata: { name: 'vast-primary' },
    spec: {
      endpoint: 'https://vast.infra.example.com',
      credentials: { username: 'admin', password: '' },
    },
    status: { state: StorageBackendState.READY },
  } as unknown as StorageBackend,
];

const privateStorageTiers: PrivateStorageTier[] = [
  {
    id: 'pst-fast',
    metadata: { name: 'fast' },
    spec: { storageBackend: { id: 'sb-1' } },
    status: { state: PrivateStorageTierState.ACTIVE },
  } as unknown as PrivateStorageTier,
  {
    id: 'pst-standard',
    metadata: { name: 'standard' },
    spec: { storageBackend: { id: 'sb-1' } },
    status: { state: PrivateStorageTierState.ACTIVE },
  } as unknown as PrivateStorageTier,
];

const privateExternalIpPools: ExternalIPPool[] = [
  {
    id: 'eip-pool-priv-1',
    metadata: {
      name: 'primary-pool',
      tenant: 'acme-corporation',
      description: 'Routable address pool for Acme Corporation tenant edge exposure.',
      creationTimestamp: { seconds: BigInt(1786798800), nanos: 0 },
    },
    spec: {
      cidrs: ['198.51.100.64/26'],
      ipFamily: IPFamily.IP_FAMILY_IPV4,
    },
    status: {
      state: ExternalIPPoolState.EXTERNAL_IP_POOL_STATE_READY,
      total: 62n,
      allocated: 2n,
      available: 60n,
      hub: 'hub-east-1',
    },
  } as unknown as ExternalIPPool,
];

const privateInstanceTypes: PrivateInstanceType[] = [
  {
    id: 'it-small',
    metadata: { name: 'standard-2-4' },
    spec: { cpuCount: 2, memoryGib: 4, state: InstanceTypeState.ACTIVE },
  } as unknown as PrivateInstanceType,
  {
    id: 'it-large',
    metadata: { name: 'standard-8-32' },
    spec: { cpuCount: 8, memoryGib: 32, state: InstanceTypeState.ACTIVE },
  } as unknown as PrivateInstanceType,
];

// ---------------------------------------------------------------------------
// Assembled fixtures
// ---------------------------------------------------------------------------

export { computeInstances, bareMetalInstances };

export const mockFixtures: MockApiFixtures = {
  enabledServices: [ServiceTier.VMAAS, ServiceTier.CAAS, ServiceTier.BMAAS, ServiceTier.MAAS],
  computeInstances,
  bareMetalInstances,
  bareMetalInstanceCatalogItems,
  bareMetalInstanceTypes,
  catalogItems: computeInstanceCatalogItems,
  clusters,
  clusterCatalogItems,
  clusterTemplates,
  clusterVersions,
  hostTypes,
  tenants,
  virtualNetworks,
  subnets,
  securityGroups,
  identityProviders,
  instanceTypes,
  diskImages,
  projects,
  projectMemberships,
  privateInstanceTypes,
  privateBaremetalInstanceTypes,
  storageBackends,
  privateExternalIpPools,
  externalIpPools,
  publicStorageTiers,
  storageTiers: privateStorageTiers,
  roles,
  roleBindings,
  secrets,
  users,
  natGateways,
  externalIps,
  externalIpAttachments,
  volumes,
};
