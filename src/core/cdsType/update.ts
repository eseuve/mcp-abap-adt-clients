/**
 * CDS Type update operations
 */

import type {
  IAdtResponse as AxiosResponse,
  IAbapConnection,
} from '@mcp-abap-adt/interfaces';
import { ACCEPT_SOURCE, CT_SOURCE } from '../../constants/contentTypes';
import { encodeSapObjectName } from '../../utils/internalUtils';
import { getTimeout } from '../../utils/timeouts';
import type { IUpdateCdsTypeParams } from './types';

/**
 * Update CDS type source code
 *
 * Endpoint: PUT /sap/bc/adt/ddic/drty/sources/{name}/source/main?lockHandle={handle}
 *
 * Requires CDS type to be locked first
 *
 * @param connection - ABAP connection instance
 * @param params - Update parameters
 * @returns Axios response with updated source code
 *
 * @example
 * ```typescript
 * const source = `managed implementation in class zbp_my_bdef unique;
 * strict ( 2 );
 *
 * define behavior for Z_MY_ENTITY
 * persistent table z_my_table
 * lock master
 * authorization master ( instance )
 * {
 *   create;
 *   update;
 *   delete;
 * }`;
 *
 * const lockHandle = await lock(connection, 'Z_MY_BDEF', sessionId);
 * await update(connection, {
 *   name: 'Z_MY_BDEF',
 *   sourceCode: source,
 *   lockHandle,
 *   transportRequest: 'E19K905635'
 * });
 * await unlock(connection, 'Z_MY_BDEF', lockHandle, sessionId);
 * ```
 */
export async function update(
  connection: IAbapConnection,
  params: IUpdateCdsTypeParams,
): Promise<AxiosResponse> {
  if (!params.sourceCode) {
    throw new Error('sourceCode is required');
  }

  if (!params.lockHandle) {
    throw new Error('lockHandle is required');
  }

  let url = `/sap/bc/adt/ddic/drty/sources/${encodeSapObjectName(params.name).toLowerCase()}/source/main?lockHandle=${encodeURIComponent(params.lockHandle)}`;
  if (params.transportRequest) {
    url += `&corrNr=${params.transportRequest}`;
  }

  const headers = {
    'Content-Type': CT_SOURCE,
    Accept: ACCEPT_SOURCE,
  };

  return await connection.makeAdtRequest({
    url,
    method: 'PUT',
    timeout: getTimeout('default'),
    data: params.sourceCode,
    headers,
  });
}
