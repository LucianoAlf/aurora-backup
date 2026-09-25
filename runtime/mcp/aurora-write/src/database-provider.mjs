import pg from 'pg';

import { AdapterError, normalizeError } from './errors.mjs';

const { Pool } = pg;

// O crachá não pode ter superpoderes, herança nem acesso direto às tabelas sensíveis.
const PREFLIGHT_SQL = `
SELECT r.rolname, r.rolsuper, r.rolinherit, r.rolcreaterole, r.rolcreatedb, r.rolcanlogin,
       r.rolreplication, r.rolbypassrls,
       (SELECT count(*) FROM pg_auth_members m WHERE m.member = r.oid)::integer AS memberships,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relname IN ('pacientes','responsaveis','paciente_responsavel','sessoes','cobrancas','leads',
                             'evolucoes','anamneses','aurora_equipe','aurora_identificadores','wa_mensagens','aurora_avisos_atendimento')
           AND (has_table_privilege(current_user, c.oid, 'SELECT') OR has_table_privilege(current_user, c.oid, 'INSERT')
             OR has_table_privilege(current_user, c.oid, 'UPDATE') OR has_table_privilege(current_user, c.oid, 'DELETE'))
       )::integer AS table_grants
FROM pg_roles r WHERE r.rolname = session_user AND session_user = current_user
`;

function assertBadge(row, config) {
  if (
    !row || row.rolname !== config.expectedLoginRole || row.rolsuper || row.rolinherit || row.rolcreaterole ||
    row.rolcreatedb || !row.rolcanlogin || row.rolreplication || row.rolbypassrls ||
    row.memberships !== 0 || row.table_grants !== 0
  ) {
    throw new AdapterError('CREDENTIAL_SCOPE_INVALID', 'O crachá da Aurora não está restrito à escrita de aviso por RPC.');
  }
}

export function createDatabaseProvider(config, options = {}) {
  const PoolClass = options.PoolClass || Pool;
  const pool = new PoolClass({
    connectionString: config.databaseUrl,
    application_name: 'aurora-write',
    max: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: config.timeoutMs,
    query_timeout: config.timeoutMs,
    statement_timeout: config.timeoutMs,
    allowExitOnIdle: true,
  });

  return Object.freeze({
    async call(definition, args) {
      const client = await pool.connect();
      let open = false;
      try {
        await client.query('BEGIN');
        open = true;
        const pre = await client.query(PREFLIGHT_SQL);
        assertBadge(pre.rows[0], config);
        const response = await client.query({ text: definition.sql, values: definition.values(args), query_timeout: config.timeoutMs });
        if (response.rowCount !== 1 || !response.rows[0]?.result) {
          throw new AdapterError('INVALID_RESPONSE', 'A fachada retornou uma resposta inválida.');
        }
        await client.query('COMMIT');
        open = false;
        return response.rows[0].result;
      } catch (error) {
        if (open) {
          try { await client.query('ROLLBACK'); } catch { /* a falha original prevalece */ }
        }
        throw normalizeError(error);
      } finally {
        client.release();
      }
    },
    async close() { await pool.end(); },
  });
}
