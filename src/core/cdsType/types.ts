import type { IAdtResponse as AxiosResponse } from '@mcp-abap-adt/interfaces';

/**
 * Validation result
 */
export interface IValidationResult {
  severity: 'OK' | 'ERROR' | 'WARNING';
  shortText?: string;
  longText?: string;
}

/**
 * Parameters for creating a CDS type
 */
export interface ICdsTypeCreateParams {
  /** Name of the CDS type */
  name: string;
  /** Description */
  description: string;
  /** Package name */
  package: string;
  /** Language (default: EN) */
  language?: string;
  /** Responsible user */
  responsible?: string;
  /** Master system */
  masterSystem?: string;
  /** Transport request number */
  transportRequest?: string;
}

/**
 * Parameters for updating a CDS type
 */
export interface IUpdateCdsTypeParams {
  /** Name of the CDS type */
  name: string;
  /** Source code */
  sourceCode: string;
  /** Lock handle from lock operation */
  lockHandle: string;
  /** Optional transport request number */
  transportRequest?: string;
}

/**
 * Lock result containing lock handle
 */
export interface ILockResult {
  lockHandle: string;
  corrnr?: string;
  corruser?: string;
  corrtext?: string;
  isLocal?: boolean;
  isLinkUp?: boolean;
}

/**
 * Check reporter type
 */
export type CheckReporter = 'bdefImplementationCheck' | 'abapCheckRun';

/**
 * Check message from validation
 */
export interface ICheckMessage {
  uri: string;
  type: 'E' | 'W' | 'I' | 'S';
  shortText: string;
  code: string;
}

/**
 * Check run result
 */
export interface ICheckRunResult {
  reporter: CheckReporter;
  triggeringUri: string;
  status: string;
  statusText: string;
  messages?: ICheckMessage[];
}

// Builder configuration (camelCase)
// Note: packageName, description are required for create operations (validated in builder methods)
export interface ICdsTypeConfig {
  name: string; // Required
  packageName?: string; // Required for create operations, optional for others
  transportRequest?: string; // Only optional parameter
  description?: string; // Required for create operations, optional for others
  sourceCode?: string;
  onLock?: (lockHandle: string) => void;
}

import type { IAdtObjectState } from '@mcp-abap-adt/interfaces';

/**
 * State maintained by the CDS Type Builder
 */
export interface ICdsTypeState extends IAdtObjectState {
  /** Name of the CDS type */
  name?: string;
  /** Lock result */
  lockResult?: AxiosResponse<unknown>;
  /** Update source result (separate from updateResult) */
  updateSourceResult?: AxiosResponse<unknown>;
  /** Check results (array for multiple checks) */
  checkResults?: AxiosResponse<unknown>[];
  /** Delete check result */
  deleteCheckResult?: AxiosResponse<unknown>;
  /** Validation result */
  validationResult?: AxiosResponse<unknown>;
  // All operation results are in IAdtObjectState:
  // validationResponse, createResult, lockHandle, updateResult, checkResult,
  // unlockResult, activateResult, deleteResult, readResult, transportResult, errors
}
