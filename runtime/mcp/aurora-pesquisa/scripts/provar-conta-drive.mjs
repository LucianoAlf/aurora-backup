#!/usr/bin/env node
// Prova uma conta Google do Composio ANTES de trocar a conexão do Drive da Aurora (só leitura, nada é alterado).
// Uso (como aurora): node provar-conta-drive.mjs <conta-composio> [raiz-id]
//   - confirma que a conta enxerga a raiz da SonoraMente e monta a árvore com os mesmos bloqueios da ferramenta;
//   - lista as pastas de primeiro nível e confirma que Pacientes, Financeiro e Planilhas continuam fora.
// Passou: trocar AURORA_DRIVE_COMPOSIO_ACCOUNT (e AURORA_DRIVE_RAIZ, se a raiz mudar) no config.yaml e reiniciar o gateway.
import os from 'node:os';
import path from 'node:path';
import { composioLeitura } from '../src/composio.mjs';
import { createArvore, EXCLUIDAS, RAIZ_SONORAMENTE } from '../src/leitura.mjs';

const [conta, raiz = RAIZ_SONORAMENTE] = process.argv.slice(2);
if (!conta) { console.error('uso: provar-conta-drive.mjs <conta-composio> [raiz-id]'); process.exit(2); }
const composio = composioLeitura({ bin: process.env.COMPOSIO_BIN || 'composio', conta });
const saida = { conta, raiz };
try {
  const m = await composio.execute('GOOGLEDRIVE_GET_FILE_METADATA', { fileId: raiz, fields: 'id,name,mimeType', supportsAllDrives: true });
  saida.raiz_nome = m?.name ?? null;
  const arvore = createArvore({ composio, raiz, cacheFile: path.join(os.tmpdir(), `prova-arvore-${process.pid}.json`) });
  const { pastas } = await arvore.carregar({ forcar: true });
  saida.pastas_na_arvore = pastas.size;
  saida.primeiro_nivel = [...pastas.values()].filter((p) => p.pai === raiz).map((p) => p.nome).sort();
  saida.bloqueadas_fora = [...EXCLUIDAS.keys()].every((id) => !pastas.has(id));
  saida.ok = Boolean(saida.raiz_nome) && pastas.size > 1 && saida.bloqueadas_fora;
} catch (e) {
  saida.ok = false; saida.erro = e?.message || 'falhou';
}
console.log(JSON.stringify(saida, null, 2));
process.exit(saida.ok ? 0 : 1);
