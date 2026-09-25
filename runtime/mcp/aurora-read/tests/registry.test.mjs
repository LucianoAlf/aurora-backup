import assert from 'node:assert/strict';
import test from 'node:test';

import { TOOL_DEFINITIONS } from '../src/registry.mjs';

test('allowlist tem exatamente as ferramentas aprovadas', () => {
  assert.deepEqual(Object.keys(TOOL_DEFINITIONS).sort(), ['aurora_agenda_do_dia', 'aurora_conferir_crianca', 'aurora_financeiro_familia', 'aurora_hoje', 'aurora_lead', 'aurora_leads_followup', 'aurora_pacote_status', 'aurora_pacotes_atencao', 'aurora_quem_e', 'aurora_sessoes_paciente', 'aurora_simular_recesso']);
});

test('remetente só aceita carimbo AUR1 ou "auto"; número solto é recusado', () => {
  const s = TOOL_DEFINITIONS.aurora_quem_e.inputSchema;
  assert.ok(s.safeParse({ identificador: 'AUR1.whatsapp.dm.5521999998888.0123456789abcdef.1790000000.0123456789abcdef0123456789abcdef' }).success);
  assert.ok(s.safeParse({ identificador: 'auto' }).success);
  assert.ok(!s.safeParse({ identificador: '5521999998888' }).success);
  assert.ok(!s.safeParse({ identificador: '61087554768984@lid' }).success);
  assert.ok(!s.safeParse({ identificador: "1'; drop table x;--" }).success);
  assert.ok(!s.safeParse({ identificador: 'auto', extra: 1 }).success);
});

test('todas as ferramentas são só-leitura', () => {
  for (const d of Object.values(TOOL_DEFINITIONS)) {
    assert.equal(d.annotations.readOnlyHint, true);
    assert.match(d.sql, /^SELECT public\.aurora_[a-z_]+\(/);
  }
});
