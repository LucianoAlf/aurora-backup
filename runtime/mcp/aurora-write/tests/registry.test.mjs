import assert from 'node:assert/strict';
import test from 'node:test';

import { TOOL_DEFINITIONS } from '../src/registry.mjs';

test('allowlist de escrita tem só o aviso', () => {
  assert.deepEqual(Object.keys(TOOL_DEFINITIONS), ['aurora_avisar_atendimento']);
});

test('aviso recusa tipo fora do contrato e campo extra', () => {
  const s = TOOL_DEFINITIONS.aurora_avisar_atendimento.inputSchema;
  const ok = { remetente: '5521999998888', tipo: 'falta_avisada', crianca: 'Maria', resumo: 'não vai hoje' };
  assert.ok(s.safeParse(ok).success);
  assert.ok(!s.safeParse({ ...ok, tipo: 'cancelar_sessao' }).success);
  assert.ok(!s.safeParse({ ...ok, sessao_id: 'x' }).success);
});

test('a SQL chama só a função de aviso', () => {
  assert.match(TOOL_DEFINITIONS.aurora_avisar_atendimento.sql, /^SELECT public\.aurora_registrar_aviso_v2\(/);
});
