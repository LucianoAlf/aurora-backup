import { spawn } from 'node:child_process';
import fs from 'node:fs';

// Drive só para leitura: buscar, metadados e baixar (exportando Docs/Planilhas/Apresentações).
// Nada de subir, compartilhar, mover ou apagar.
export const SLUGS = new Set(['GOOGLEDRIVE_FIND_FILE', 'GOOGLEDRIVE_GET_FILE_METADATA', 'GOOGLEDRIVE_DOWNLOAD_FILE']);

function lerSaida(out) {
  const d = JSON.parse(out);
  if (d && d.outputFilePath) return JSON.parse(fs.readFileSync(d.outputFilePath, 'utf8'));
  return d;
}

function rodar(bin, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('tempo_esgotado')); }, timeoutMs);
    child.stdout.on('data', (b) => { out += b; if (out.length > 4_000_000) child.kill('SIGKILL'); });
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', () => { clearTimeout(timer); try { resolve(lerSaida(out)); } catch { reject(new Error('composio_resposta_invalida')); } });
  });
}

export function composioLeitura({ bin, conta, timeoutMs = 90000, rodarCmd = rodar }) {
  return {
    async execute(slug, data) {
      if (!SLUGS.has(slug)) throw new Error('slug_nao_permitido');
      const args = ['execute', slug, ...(conta ? ['--account', conta] : []), '-d', JSON.stringify(data)];
      const d = await rodarCmd(bin, args, timeoutMs);
      if (!d?.successful) throw new Error('composio_falhou');
      return d.data;
    },
  };
}
