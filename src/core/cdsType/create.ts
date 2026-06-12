/**
 * CDS Type create operations - Low-level functions
 */

import type {
  IAdtResponse as AxiosResponse,
  HttpError,
  IAbapConnection,
} from '@mcp-abap-adt/interfaces';
import { CT_CDS_TYPE } from '../../constants/contentTypes';
import { limitDescription } from '../../utils/internalUtils';
import { getTimeout } from '../../utils/timeouts';
import type { ICdsTypeCreateParams } from './types';

/**
 * Create a new CDS type
 *
 * Endpoint: POST /sap/bc/adt/ddic/drty/sources
 *
 * @param connection - ABAP connection instance
 * @param params - Creation parameters
 * @returns Axios response with created object metadata
 *
 * @example
 * ```typescript
 * const response = await create(connection, {
 *   name: 'Z_MY_TYPE',
 *   description: 'My CDS Type',
 *   package: 'Z_PACKAGE'
 * });
 *
 * // Extract source URI
 * const sourceUri = response.data.match(/abapsource:sourceUri="([^"]+)"/)?.[1];
 * ```
 */
export async function create(
  connection: IAbapConnection,
  params: ICdsTypeCreateParams,
): Promise<AxiosResponse> {
  try {
    const language = params.language || 'EN';

    const masterSystem = params.masterSystem || '';
    const responsible = params.responsible || '';

    // Description is limited to 60 characters in SAP ADT
    const description = limitDescription(params.description);
    const masterSystemAttr = masterSystem
      ? ` adtcore:masterSystem="${masterSystem}"`
      : '';
    const responsibleAttr = responsible
      ? ` adtcore:responsible="${responsible}"`
      : '';

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><blue:blueSource xmlns:blue="http://www.sap.com/wbobj/blue" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${params.name}" adtcore:type="DRTY/STY" adtcore:masterLanguage="${language}" adtcore:abapLanguageVersion="cloudDevelopment"${masterSystemAttr}${responsibleAttr}>
    <adtcore:packageRef adtcore:name="${params.package}"/>
</blue:blueSource>`;

    const headers = {
      Accept: CT_CDS_TYPE,
      'Content-Type': CT_CDS_TYPE,
    };

    const url = `/sap/bc/adt/ddic/drty/sources${params.transportRequest ? `?corrNr=${params.transportRequest}` : ''}`;

    const response = await connection.makeAdtRequest({
      url,
      method: 'POST',
      timeout: getTimeout('default'),
      data: xmlBody,
      headers,
    });

    return response;
  } catch (error: unknown) {
    const e = error as HttpError;
    throw new Error(`Failed to create CDS type ${params.name}: ${e.message}`);
  }
}
