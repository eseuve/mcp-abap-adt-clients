/**
 * CDS Type read operations
 */

import type {
  IAdtResponse as AxiosResponse,
  IAbapConnection,
  ILogger,
} from '@mcp-abap-adt/interfaces';
import {
  ACCEPT_SOURCE,
  ACCEPT_TRANSPORT,
  CT_CDS_TYPE,
} from '../../constants/contentTypes';
import { makeAdtRequestWithAcceptNegotiation } from '../../utils/acceptNegotiation';
import { encodeSapObjectName } from '../../utils/internalUtils';
import { getTimeout } from '../../utils/timeouts';
import type { IReadOptions } from '../shared/types';

/**
 * Read CDS type metadata
 *
 * Endpoint: GET /sap/bc/adt/ddic/drty/sources/{name}?version=inactive
 *
 * @param connection - ABAP connection instance
 * @param name - CDS type name
 * @param sessionId - Session ID for request tracking
 * @param version - Version to read (default: inactive)
 * @returns Axios response with CDS type metadata (XML)
 *
 * @example
 * ```typescript
 * const response = await read(connection, 'Z_MY_TYPE', sessionId);
 * // Response contains metadata in blue:blueSource XML format
 * ```
 */
export async function read(
  connection: IAbapConnection,
  name: string,
  _sessionId: string,
  version: string = 'inactive',
  options?: IReadOptions,
  logger?: ILogger,
): Promise<AxiosResponse> {
  const query = options?.withLongPolling ? `&withLongPolling=true` : '';
  const url = `/sap/bc/adt/ddic/drty/sources/${encodeSapObjectName(name).toLowerCase()}?version=${version}${query}`;

  const headers = {
    Accept: options?.accept ?? CT_CDS_TYPE,
  };

  return makeAdtRequestWithAcceptNegotiation(
    connection,
    {
      url,
      method: 'GET',
      timeout: getTimeout('default'),
      headers,
    },
    { logger },
  );
}

/**
 * Read CDS type source code
 *
 * Endpoint: GET /sap/bc/adt/ddic/drty/sources/{name}/source/main
 *
 * @param connection - ABAP connection instance
 * @param name - CDS type name
 * @param sessionId - Session ID for request tracking
 * @param version - Version to read (default: inactive)
 * @returns Axios response with source code (plain text)
 *
 * @example
 * ```typescript
 * const response = await readSource(connection, 'Z_MY_TYPE', sessionId);
 * const sourceCode = response.data; // CDS type source code
 * ```
 */
export async function readSource(
  connection: IAbapConnection,
  name: string,
  version: string = 'inactive',
  options?: IReadOptions,
  logger?: ILogger,
): Promise<AxiosResponse> {
  const query = options?.withLongPolling ? `&withLongPolling=true` : '';
  const url = `/sap/bc/adt/ddic/drty/sources/${encodeSapObjectName(name).toLowerCase()}/source/main?version=${version}${query}`;

  const headers = {
    Accept: options?.accept ?? ACCEPT_SOURCE,
  };

  return makeAdtRequestWithAcceptNegotiation(
    connection,
    {
      url,
      method: 'GET',
      timeout: getTimeout('default'),
      headers,
    },
    { logger },
  );
}

/**
 * Get transport request for ABAP CDS type
 * @param connection - SAP connection
 * @param name - CDS type name
 * @returns Transport request information
 */
export async function getCdsTypeTransport(
  connection: IAbapConnection,
  name: string,
  options?: IReadOptions,
): Promise<AxiosResponse> {
  const query = options?.withLongPolling ? '?withLongPolling=true' : '';
  const url = `/sap/bc/adt/ddic/drty/sources/${encodeSapObjectName(name).toLowerCase()}/transport${query}`;

  const headers = {
    Accept: options?.accept ?? ACCEPT_TRANSPORT,
  };

  return connection.makeAdtRequest({
    url,
    method: 'GET',
    timeout: getTimeout('default'),
    headers,
  });
}
