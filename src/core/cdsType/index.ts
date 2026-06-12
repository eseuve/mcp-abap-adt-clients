/**
 * CDS Type operations - exports
 */

import type { IAdtObject } from '@mcp-abap-adt/interfaces';
import type { ICdsTypeConfig, ICdsTypeState } from './types';

export { AdtCdsType } from './AdtCdsType';
export * from './types';

// Type alias for AdtCdsType
export type AdtCdsTypeType = IAdtObject<ICdsTypeConfig, ICdsTypeState>;
