import assert from 'node:assert/strict';
import test from 'node:test';

import { TOOL_DEFINITIONS } from '../src/registry.mjs';

test('allowlist de escrita: aviso e as três de lead', () => {
  assert.deepEqual(Object.keys(TOOL_DEFINITIONS), [
    'aurora_avisar_atendimento', 'aurora_lead_registrar', 'aurora_lead_mover_etapa', 'aurora_lead_followup_feito',
  ]);
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

test('lead nunca vai para agendado ou ativo e perdido exige motivo', () => {
  const s = TOOL_DEFINITIONS.aurora_lead_mover_etapa.inputSchema;
  assert.ok(s.safeParse({ numero: '5521999998888', etapa: 'triagem' }).success);
  assert.ok(s.safeParse({ numero: '5521999998888', etapa: 'perdido', motivo_perda: 'sem_interesse' }).success);
  assert.ok(!s.safeParse({ numero: '5521999998888', etapa: 'perdido' }).success);
  assert.ok(!s.safeParse({ numero: '5521999998888', etapa: 'agendado' }).success);
  assert.ok(!s.safeParse({ numero: '5521999998888', etapa: 'ativo' }).success);
});

test('registrar lead recusa origem fora do enum e campo de diagnóstico', () => {
  const s = TOOL_DEFINITIONS.aurora_lead_registrar.inputSchema;
  const ok = { numero: '5521999998888', origem: 'instagram', responsavel_nome: 'Mãe Teste' };
  assert.ok(s.safeParse(ok).success);
  assert.ok(!s.safeParse({ ...ok, origem: 'tiktok' }).success);
  assert.ok(!s.safeParse({ ...ok, diagnostico_suspeita: 'x' }).success);
});

test('toda SQL de escrita chama só função aurora_ concedida', () => {
  for (const d of Object.values(TOOL_DEFINITIONS)) {
    assert.match(d.sql, /^SELECT public\.aurora_(registrar_aviso_v2|lead_registrar|lead_mover_etapa|lead_followup_registrar)\(/);
  }
});
