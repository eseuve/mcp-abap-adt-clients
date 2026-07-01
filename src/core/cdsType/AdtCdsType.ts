/**
 * AdtCdsType - High-level CRUD operations for CDS Type objects
 *
 * Implements IAdtObject interface with automatic operation chains,
 * error handling, and resource cleanup.
 *
 * Uses low-level functions directly (not Builder classes).
 *
 * Session management:
 * - stateful: only when doing lock/update/unlock operations
 * - stateless: obligatory after unlock
 * - If no lock/unlock, no stateful needed
 * - activate uses same session/cookies (no stateful needed)
 *
 * Operation chains:
 * - Create: create
 * - Update: lock → check(inactive) → update → unlock → check → activate
 * - Delete: check(deletion) → delete
 */

import type {
  HttpError,
  IAbapConnection,
  IAdtObject,
  IAdtOperationOptions,
  ILogger,
} from '@mcp-abap-adt/interfaces';
import type { IAdtSystemContext } from '../../clients/AdtClient';
import { safeErrorMessage } from '../../utils/internalUtils';
import type { IReadOptions } from '../shared/types';
import { activate } from './activation';
import { check as checkCdsType } from './check';
import { create as createCdsType } from './create';
import { checkDeletion, deleteCdsType } from './delete';
import { lock } from './lock';
import { getCdsTypeTransport, read as readCdsType, readSource } from './read';
import type { ICdsTypeConfig, ICdsTypeState } from './types';
import { unlock } from './unlock';
import { update } from './update';
import { getCdsTypeVersionSource, getCdsTypeVersions } from './versions';

export class AdtCdsType implements IAdtObject<ICdsTypeConfig, ICdsTypeState> {
  private readonly connection: IAbapConnection;
  private readonly logger?: ILogger;
  private readonly systemContext: IAdtSystemContext;
  public readonly objectType: string = 'CdsType';

  constructor(
    connection: IAbapConnection,
    logger?: ILogger,
    systemContext?: IAdtSystemContext,
  ) {
    this.connection = connection;
    this.logger = logger;
    this.systemContext = systemContext ?? {};
  }

  /**
   * Validate CDS type configuration before creation.
   *
   * DRTY/STY has no dedicated ADT validation endpoint, so this performs
   * local presence checks only and returns state without an HTTP round-trip.
   */
  async validate(config: Partial<ICdsTypeConfig>): Promise<ICdsTypeState> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      const error = new Error('CDS type name is required for validation');
      state.errors.push({ method: 'validate', error, timestamp: new Date() });
      throw error;
    }
    if (!config.packageName) {
      const error = new Error('Package name is required for validation');
      state.errors.push({ method: 'validate', error, timestamp: new Date() });
      throw error;
    }
    return state;
  }

  /**
   * Create CDS type with full operation chain
   */
  async create(
    config: ICdsTypeConfig,
    options?: IAdtOperationOptions,
  ): Promise<ICdsTypeState> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      throw new Error('CDS type name is required');
    }
    if (!config.packageName) {
      throw new Error('Package name is required');
    }
    if (!config.description) {
      throw new Error('Description is required');
    }

    let objectCreated = false;

    try {
      // Create CDS type
      this.logger?.info?.('Creating CDS type');
      const createResponse = await createCdsType(this.connection, {
        name: config.name,
        package: config.packageName,
        description: config.description,
        transportRequest: config.transportRequest,
        masterSystem: this.systemContext.masterSystem,
        responsible: this.systemContext.responsible,
      });
      state.createResult = createResponse;
      objectCreated = true;
      this.logger?.info?.('CDS type created');

      return state;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.errors.push({
        method: 'create',
        error: err,
        timestamp: new Date(),
      });

      // Cleanup on error - ensure stateless
      this.connection.setSessionType('stateless');

      if (objectCreated && options?.deleteOnFailure) {
        try {
          this.logger?.warn?.('Deleting CDS type after failure');
          // No stateful needed - delete doesn't use lock/unlock
          await deleteCdsType(
            this.connection,
            config.name,
            config.transportRequest,
          );
        } catch (deleteError) {
          this.logger?.warn?.(
            'Failed to delete CDS type after failure:',
            safeErrorMessage(deleteError),
          );
        }
      }

      this.logger?.error('Create failed:', safeErrorMessage(err));
      throw err;
    }
  }

  /**
   * Read CDS type
   */
  async read(
    config: Partial<ICdsTypeConfig>,
    version?: 'active' | 'inactive',
    options?: IReadOptions,
  ): Promise<ICdsTypeState | undefined> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      const error = new Error('CDS type name is required');
      state.errors.push({ method: 'read', error, timestamp: new Date() });
      throw error;
    }

    try {
      const response = await readSource(
        this.connection,
        config.name,
        version,
        options,
        this.logger,
      );
      state.readResult = response;
      return state;
    } catch (error: unknown) {
      const e = error as HttpError;
      if (e.response?.status === 404) {
        return undefined;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      state.errors.push({ method: 'read', error: err, timestamp: new Date() });
      this.logger?.error('Read failed:', safeErrorMessage(err));
      throw err;
    }
  }

  /**
   * Read CDS type metadata (object characteristics: package, responsible, description, etc.)
   */
  async readMetadata(
    config: Partial<ICdsTypeConfig>,
    options?: IReadOptions,
  ): Promise<ICdsTypeState> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      const error = new Error('CDS type name is required');
      state.errors.push({
        method: 'readMetadata',
        error,
        timestamp: new Date(),
      });
      throw error;
    }
    try {
      // Use empty sessionId for metadata read
      const response = await readCdsType(
        this.connection,
        config.name,
        '',
        'inactive',
        options,
        this.logger,
      );
      state.metadataResult = response;
      this.logger?.info?.('CDS type metadata read successfully');
      return state;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.errors.push({
        method: 'readMetadata',
        error: err,
        timestamp: new Date(),
      });
      this.logger?.error('Read metadata failed:', safeErrorMessage(err));
      throw err;
    }
  }

  /**
   * Read transport request information for the CDS type
   */
  async readTransport(
    config: Partial<ICdsTypeConfig>,
    options?: { withLongPolling?: boolean },
  ): Promise<ICdsTypeState> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      const error = new Error('CDS type name is required');
      state.errors.push({
        method: 'readTransport',
        error,
        timestamp: new Date(),
      });
      throw error;
    }
    try {
      const response = await getCdsTypeTransport(
        this.connection,
        config.name,
        options?.withLongPolling !== undefined
          ? { withLongPolling: options.withLongPolling }
          : undefined,
      );
      state.transportResult = response;
      this.logger?.info?.('CDS type transport request read successfully');
      return state;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.errors.push({
        method: 'readTransport',
        error: err,
        timestamp: new Date(),
      });
      this.logger?.error('Read transport failed:', safeErrorMessage(err));
      throw err;
    }
  }

  /**
   * Update CDS type with full operation chain
   * Always starts with lock
   * If options.lockHandle is provided, performs only low-level update without lock/check/unlock chain
   */
  async update(
    config: Partial<ICdsTypeConfig>,
    options?: IAdtOperationOptions,
  ): Promise<ICdsTypeState> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      const error = new Error('CDS type name is required');
      state.errors.push({ method: 'update', error, timestamp: new Date() });
      throw error;
    }

    // Low-level mode: if lockHandle is provided, perform only update operation
    if (options?.lockHandle) {
      const codeToUpdate = options?.sourceCode || config.sourceCode;
      if (!codeToUpdate) {
        throw new Error('Source code is required for update');
      }

      this.logger?.info?.(
        'Low-level update: performing update only (lockHandle provided)',
      );
      const updateResponse = await update(this.connection, {
        name: config.name,
        sourceCode: codeToUpdate,
        lockHandle: options.lockHandle,
        transportRequest: config.transportRequest,
      });
      this.logger?.info?.('CDS type updated (low-level)');
      return {
        updateResult: updateResponse,
        errors: [],
      };
    }

    let lockHandle: string | undefined;

    try {
      // 1. Lock (update always starts with lock, stateful ONLY before lock)
      this.logger?.info?.('Step 1: Locking CDS type');
      this.connection.setSessionType('stateful');
      lockHandle = await lock(this.connection, config.name);
      this.connection.setSessionType('stateless');
      state.lockHandle = lockHandle;
      this.logger?.info?.('CDS type locked, handle:', lockHandle);

      // 2. Check inactive with code for update (from options or config)
      const codeToCheck = options?.sourceCode || config.sourceCode;
      if (codeToCheck) {
        this.logger?.info?.(
          'Step 2: Checking inactive version with update content',
        );
        const checkInactiveResponse = await checkCdsType(
          this.connection,
          config.name,
          'abapCheckRun',
          '',
          'inactive',
          codeToCheck,
        );
        state.checkResult = checkInactiveResponse;
        this.logger?.info?.('Check inactive with update content passed');
      }

      // 3. Update
      if (codeToCheck && lockHandle) {
        this.logger?.info?.('Step 3: Updating CDS type');
        const updateResponse = await update(this.connection, {
          name: config.name,
          sourceCode: codeToCheck,
          lockHandle,
          transportRequest: config.transportRequest,
        });
        state.updateResult = updateResponse;
        this.logger?.info?.('CDS type updated');

        // 3.5. Read with long polling (wait for object to be ready after update)
        this.logger?.info?.('read (wait for object ready after update)');
        try {
          await this.read({ name: config.name }, 'active', {
            withLongPolling: true,
          });
          this.logger?.info?.('object is ready after update');
        } catch (readError) {
          this.logger?.warn?.(
            'read with long polling failed (object may not be ready yet):',
            safeErrorMessage(readError),
          );
          // Continue anyway - unlock might still work
        }
      }

      // 4. Unlock (obligatory stateless after unlock)
      if (lockHandle) {
        this.logger?.info?.('Step 4: Unlocking CDS type');
        this.connection.setSessionType('stateful');
        const unlockResponse = await unlock(
          this.connection,
          config.name,
          lockHandle,
        );
        state.unlockResult = unlockResponse;
        this.connection.setSessionType('stateless');
        lockHandle = undefined;
        this.logger?.info?.('CDS type unlocked');
      }

      // 5. Final check (no stateful needed)
      this.logger?.info?.('Step 5: Final check');
      const finalCheckResponse = await checkCdsType(
        this.connection,
        config.name,
        'bdefImplementationCheck',
        '',
        'inactive',
      );
      state.checkResult = finalCheckResponse;
      this.logger?.info?.('Final check passed');

      // 6. Activate (if requested, no stateful needed - uses same session/cookies)
      if (options?.activateOnUpdate) {
        this.logger?.info?.('Step 6: Activating CDS type');
        const activateResponse = await activate(this.connection, config.name);
        state.activateResult = activateResponse;
        this.logger?.info?.(
          'CDS type activated, status:',
          activateResponse.status,
        );

        // 6.5. Read with long polling (wait for object to be ready after activation)
        this.logger?.info?.('read (wait for object ready after activation)');
        try {
          await this.read({ name: config.name }, 'active', {
            withLongPolling: true,
          });
          this.logger?.info?.('object is ready after activation');
        } catch (readError) {
          this.logger?.warn?.(
            'read with long polling failed (object may not be ready yet):',
            safeErrorMessage(readError),
          );
          // Continue anyway - return state with activation result
        }

        return state;
      }

      // Read and return result (no stateful needed)
      const readResponse = await readSource(
        this.connection,
        config.name,
        'inactive',
        undefined,
        this.logger,
      );
      state.readResult = readResponse;

      return state;
    } catch (error: unknown) {
      // Cleanup on error - unlock if locked (lockHandle saved for force unlock)
      if (lockHandle) {
        try {
          this.logger?.warn?.('Unlocking CDS type during error cleanup');
          this.connection.setSessionType('stateful');
          await unlock(this.connection, config.name, lockHandle);
          this.connection.setSessionType('stateless');
        } catch (unlockError) {
          this.logger?.warn?.(
            'Failed to unlock during cleanup:',
            safeErrorMessage(unlockError),
          );
        }
      } else {
        // Ensure stateless if lock failed
        this.connection.setSessionType('stateless');
      }

      if (options?.deleteOnFailure) {
        try {
          this.logger?.warn?.('Deleting CDS type after failure');
          // No stateful needed - delete doesn't use lock/unlock
          await deleteCdsType(
            this.connection,
            config.name,
            config.transportRequest,
          );
        } catch (deleteError) {
          this.logger?.warn?.(
            'Failed to delete CDS type after failure:',
            safeErrorMessage(deleteError),
          );
        }
      }

      this.logger?.error('Update failed:', safeErrorMessage(error));
      throw error;
    }
  }

  /**
   * Delete CDS type
   */
  async delete(config: Partial<ICdsTypeConfig>): Promise<ICdsTypeState> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      const error = new Error('CDS type name is required');
      state.errors.push({ method: 'delete', error, timestamp: new Date() });
      throw error;
    }

    try {
      // Check for deletion (no stateful needed)
      this.logger?.info?.('Checking CDS type for deletion');
      await checkDeletion(this.connection, config.name);
      this.logger?.info?.('Deletion check passed');

      // Delete (no stateful needed - no lock/unlock)
      this.logger?.info?.('Deleting CDS type');
      const result = await deleteCdsType(
        this.connection,
        config.name,
        config.transportRequest,
      );
      state.deleteResult = result;
      this.logger?.info?.('CDS type deleted');

      return state;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.errors.push({
        method: 'delete',
        error: err,
        timestamp: new Date(),
      });
      this.logger?.error('Delete failed:', safeErrorMessage(err));
      throw err;
    }
  }

  /**
   * Activate CDS type
   * No stateful needed - uses same session/cookies
   */
  async activate(config: Partial<ICdsTypeConfig>): Promise<ICdsTypeState> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      const error = new Error('CDS type name is required');
      state.errors.push({ method: 'activate', error, timestamp: new Date() });
      throw error;
    }

    try {
      const result = await activate(this.connection, config.name);
      state.activateResult = result;
      return state;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.errors.push({
        method: 'activate',
        error: err,
        timestamp: new Date(),
      });
      this.logger?.error('Activate failed:', safeErrorMessage(err));
      throw err;
    }
  }

  /**
   * Check CDS type
   */
  async check(
    config: Partial<ICdsTypeConfig>,
    status?: string,
  ): Promise<ICdsTypeState> {
    const state: ICdsTypeState = { errors: [] };
    if (!config.name) {
      const error = new Error('CDS type name is required');
      state.errors.push({ method: 'check', error, timestamp: new Date() });
      throw error;
    }

    try {
      // Map status to version
      const version: string = status === 'active' ? 'active' : 'inactive';
      const response = await checkCdsType(
        this.connection,
        config.name,
        'bdefImplementationCheck',
        '',
        version,
      );
      state.checkResult = response;
      return state;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.errors.push({ method: 'check', error: err, timestamp: new Date() });
      this.logger?.error('Check failed:', safeErrorMessage(err));
      throw err;
    }
  }

  /**
   * Lock CDS type for modification
   */
  async lock(config: Partial<ICdsTypeConfig>): Promise<string> {
    if (!config.name) {
      throw new Error('CDS type name is required');
    }

    this.connection.setSessionType('stateful');
    const lockHandle = await lock(this.connection, config.name);
    this.connection.setSessionType('stateless');
    return lockHandle;
  }

  /**
   * Unlock CDS type
   */
  async unlock(
    config: Partial<ICdsTypeConfig>,
    lockHandle: string,
  ): Promise<ICdsTypeState> {
    if (!config.name) {
      throw new Error('CDS type name is required');
    }

    this.connection.setSessionType('stateful');
    const result = await unlock(this.connection, config.name, lockHandle);
    this.connection.setSessionType('stateless');
    return {
      unlockResult: result,
      errors: [],
    };
  }

  getVersions(config: Partial<ICdsTypeConfig>) {
    return getCdsTypeVersions(this.connection, config);
  }

  getVersionSource(contentUri: string) {
    return getCdsTypeVersionSource(this.connection, contentUri);
  }
}
