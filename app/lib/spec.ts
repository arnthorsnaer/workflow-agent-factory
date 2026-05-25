export type DependencyItem = {
  name?: string;
  path?: string;
  url?: string;
  command?: string;
  purpose: string;
  required?: boolean;
  verify?: string;
  containsSecrets?: boolean;
  gitPolicy?: string;
  notes?: string;
};

export type InternalTool = {
  name: string;
  command: string;
  purpose: string;
  verify?: string;
};

export type ProcessingSpec = {
  projectRoot?: string;
  archiveRoot?: string;
  filesBeingProcessed: {
    location: 'internal' | 'external' | 'mixed';
    internalStages?: string[];
    externalPaths?: string[];
    neverCommit: boolean;
  };
  evidence?: {
    enabled: boolean;
    commitPolicy?: string;
    files?: string[];
    archiveAfterCompletion?: boolean;
  };
  cleanup?: {
    afterPublish?: boolean;
    removeOrTrashProcessingFiles?: boolean;
    preserveEvidenceOnly?: boolean;
  };
};

export type CopySpec = { from: string; to: string };

export type WorkflowAgentSpec = {
  name: string;
  description: string;
  mission?: string[];
  dependencies: {
    externalTools?: DependencyItem[];
    internalTools?: InternalTool[];
    services?: DependencyItem[];
    localConfig?: DependencyItem[];
    environmentVariables?: DependencyItem[];
    filesystemPaths?: DependencyItem[];
    trackedAssets?: DependencyItem[];
    generatedArtifacts?: DependencyItem[];
  };
  processing: ProcessingSpec;
  hardBoundaries?: string[];
  standardWorkflow?: string[];
  fallbackWorkflow?: string[];
  safetyRules?: string[];
  knownLimitations?: string[];
  git?: {
    visibility?: 'public' | 'private';
    extraIgnore?: string[];
  };
  scaffold?: {
    copy?: CopySpec[];
    createDirs?: string[];
  };
};

export function requireSpec(value: unknown): WorkflowAgentSpec {
  if (!value || typeof value !== 'object') throw new Error('spec must be an object');
  const spec = value as WorkflowAgentSpec;
  if (!spec.name) throw new Error('spec.name is required');
  if (!spec.description) throw new Error('spec.description is required');
  if (!spec.dependencies) throw new Error('spec.dependencies is required');
  if (!spec.processing) throw new Error('spec.processing is required');
  if (!spec.processing.filesBeingProcessed) throw new Error('spec.processing.filesBeingProcessed is required');
  return spec;
}
