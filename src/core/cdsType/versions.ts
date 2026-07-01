import type { IAbapConnection, IObjectVersion } from '@mcp-abap-adt/interfaces';
import { encodeSapObjectName } from '../../utils/internalUtils';
import { getTimeout } from '../../utils/timeouts';
import { parseVersionsFeed, throwVersionsError } from '../shared/versions';
import type { ICdsTypeConfig } from './types';

const ACCEPT_VERSION_FEED = 'application/atom+xml;type=feed';

// candidate URI — probe-verify on trial
export async function getCdsTypeVersions(
  connection: IAbapConnection,
  config: Partial<ICdsTypeConfig>,
): Promise<IObjectVersion[]> {
  if (!config.name) throw new Error('name is required');
  const encodedName = encodeSapObjectName(config.name).toLowerCase();
  const url = `/sap/bc/adt/ddic/drty/sources/${encodedName}/source/main/versions`;
  try {
    const res = await connection.makeAdtRequest({
      url,
      method: 'GET',
      timeout: getTimeout('default'),
      headers: { Accept: ACCEPT_VERSION_FEED },
    });
    return parseVersionsFeed(String(res.data));
  } catch (e) {
    throwVersionsError(e, `cds type ${config.name}`);
  }
}

export async function getCdsTypeVersionSource(
  connection: IAbapConnection,
  contentUri: string,
): Promise<string> {
  try {
    const res = await connection.makeAdtRequest({
      url: contentUri,
      method: 'GET',
      timeout: getTimeout('default'),
      headers: { Accept: 'text/plain' },
    });
    return String(res.data);
  } catch (e) {
    throwVersionsError(e, 'version content');
  }
}
