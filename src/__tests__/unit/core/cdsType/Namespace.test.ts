import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
import { lock } from '../../../../core/cdsType/lock';
import { unlock } from '../../../../core/cdsType/unlock';
import { update } from '../../../../core/cdsType/update';

const LOCK_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?><asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0"><asx:values><DATA><LOCK_HANDLE>LH1</LOCK_HANDLE><CORRNR/></DATA></asx:values></asx:abap>`;

function conn(data = '') {
  return {
    makeAdtRequest: jest.fn().mockResolvedValue({ status: 200, data }),
  } as unknown as IAbapConnection;
}
const firstUrl = (c: IAbapConnection) =>
  (c.makeAdtRequest as jest.Mock).mock.calls[0][0].url;

const NS = '/NSP/MYTYPE';
const ENC = 'drty/sources/%2fnsp%2fmytype';
const RAW = 'drty/sources//nsp';

describe('cds type namespace URL encoding', () => {
  it('lock() encodes the namespaced name', async () => {
    const c = conn(LOCK_RESPONSE);
    await lock(c, NS);
    expect(firstUrl(c)).toContain(ENC);
    expect(firstUrl(c)).not.toContain(RAW);
  });
  it('update() encodes the namespaced name', async () => {
    const c = conn();
    await update(c, {
      name: NS,
      sourceCode: 'define type X : abap.char(1);',
      lockHandle: 'LH1',
    });
    expect(firstUrl(c)).toContain(ENC);
  });
  it('unlock() encodes the namespaced name', async () => {
    const c = conn();
    await unlock(c, NS, 'LH1');
    expect(firstUrl(c)).toContain(ENC);
  });
});
