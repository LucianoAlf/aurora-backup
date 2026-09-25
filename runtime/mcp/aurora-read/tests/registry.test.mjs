import assert from 'node:assert/strict';
import test from 'node:test';

import { TOOL_DEFINITIONS } from '../src/registry.mjs';

test('allowlist tem exatamente as ferramentas aprovadas', () => {
  assert.deepEqual(Object.keys(TOOL_DEFINITIONS).sort(), ['aurora_agenda_do_dia', 'aurora_conferir_crianca', 'aurora_financeiro_familia', 'aurora_hoje', 'aurora_lead', 'aurora_leads_followup', 'aurora_pacote_status', 'aurora_pacotes_atencao', 'aurora_quem_e', 'aurora_sessoes_paciente', 'aurora_simular_recesso']);
});

test('aurora_quem_e aceita número e LID e recusa SQL ou texto livre', () => {
  const s = TOOL_DEFINITIONS.aurora_quem_e.inputSchema;
  assert.ok(s.safeParse({ identificador: '5521999998888' }).success);
  assert.ok(s.safeParse({ identificador: '61087554768984@lid' }).success);
  assert.ok(!s.safeParse({ identificador: "1'; drop table x;--" }).success);
  assert.ok(!s.safeParse({ identificador: '5521999998888', extra: 1 }).success);
});

test('todas as ferramentas são só-leitura', () => {
  for (const d of Object.values(TOOL_DEFINITIONS)) {
    assert.equal(d.annotations.readOnlyHint, true);
    assert.match(d.sql, /^SELECT public\.aurora_[a-z_]+\(/);
  }
});
