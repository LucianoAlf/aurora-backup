#!/usr/bin/env python3
"""aurora-cerebro: o mesmo cérebro da Aurora (GPT-6 Sol pela assinatura) para as funções de texto da Central.

Mesmo desenho da ponte da Julia (julia-bridge): a edge function do Supabase guarda o token e chama este
serviço pelo túnel; o navegador nunca vê o token. Aqui não roda agente nem ferramenta: só texto → texto,
com instruções que vêm da edge function (fonte única dos prompts: aurora-reescrever/logica.ts).

  GET  /health            → {ok, assinatura}
  POST /texto             → Authorization: Bearer <token>; {instrucoes, entrada, esforco?} → {texto, segundos, modelo}

Não registra conteúdo em log: só tamanhos, tempo e status.
"""
from __future__ import annotations

import hmac
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERMES_AGENT = os.getenv("AURORA_HERMES_AGENT", "/home/aurora/.hermes/hermes-agent")
if HERMES_AGENT not in sys.path:
    sys.path.insert(0, HERMES_AGENT)

HOST = os.getenv("AURORA_CEREBRO_HOST", "127.0.0.1")
PORTA = int(os.getenv("AURORA_CEREBRO_PORT", "8681"))
TOKEN_FILE = os.getenv("AURORA_CEREBRO_TOKEN_FILE", "/home/aurora/.hermes/cerebro.token")
MODELO = os.getenv("AURORA_CEREBRO_MODEL", "gpt-6-sol")
CODEX_URL = "https://chatgpt.com/backend-api/codex/responses"
LIMITE_INSTRUCOES = 6000
LIMITE_ENTRADA = 8000
LIMITE_POR_MINUTO = int(os.getenv("AURORA_CEREBRO_RATE_PER_MIN", "60"))
ESFORCOS = {"low", "medium", "high"}

_janela: list[float] = []
_trava = threading.Lock()


def log(evento: str, **extra) -> None:
    print(json.dumps({"t": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "evento": evento, **extra}), flush=True)


def token_esperado() -> str:
    with open(TOKEN_FILE, encoding="utf-8") as f:
        return f.read().strip()


def autorizado(cabecalho: str) -> bool:
    if not cabecalho.startswith("Bearer "):
        return False
    try:
        esperado = token_esperado()
    except OSError:
        return False
    return bool(esperado) and hmac.compare_digest(cabecalho[7:].strip(), esperado)


def dentro_do_limite() -> bool:
    agora = time.time()
    with _trava:
        while _janela and agora - _janela[0] > 60:
            _janela.pop(0)
        if len(_janela) >= LIMITE_POR_MINUTO:
            return False
        _janela.append(agora)
        return True


def validar(corpo: dict) -> tuple[str, str, str]:
    instrucoes = str(corpo.get("instrucoes") or "").strip()
    entrada = str(corpo.get("entrada") or "").strip()
    esforco = str(corpo.get("esforco") or "medium")
    if not instrucoes or not entrada:
        raise ValueError("instrucoes_e_entrada_obrigatorias")
    if len(instrucoes) > LIMITE_INSTRUCOES or len(entrada) > LIMITE_ENTRADA:
        raise ValueError("texto_grande_demais")
    if esforco not in ESFORCOS:
        raise ValueError("esforco_invalido")
    return instrucoes, entrada, esforco


def gerar(instrucoes: str, entrada: str, esforco: str) -> str:
    """Chama o GPT pela assinatura (mesmo login que o Hermes da Aurora guarda). Só aceita resposta completa."""
    import httpx
    from agent.auxiliary_client import _codex_cloudflare_headers, _read_codex_access_token

    token = _read_codex_access_token()
    if not token:
        raise RuntimeError("assinatura_indisponivel")
    cab = _codex_cloudflare_headers(token)
    cab.update({"Accept": "text/event-stream", "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    payload = {
        "model": MODELO,
        "instructions": instrucoes,
        "input": [{"role": "user", "content": [{"type": "input_text", "text": entrada}]}],
        "reasoning": {"effort": esforco},
        "service_tier": "priority",
        "stream": True,
        "store": False,
    }
    partes: list[str] = []
    fim = None
    with httpx.Client(timeout=httpx.Timeout(40.0, connect=10.0), headers=cab) as cliente:
        with cliente.stream("POST", CODEX_URL, json=payload) as resp:
            if resp.status_code != 200:
                resp.read()
                raise RuntimeError(f"codex_http_{resp.status_code}")
            for linha in resp.iter_lines():
                if not linha.startswith("data:"):
                    continue
                try:
                    ev = json.loads(linha[5:].strip())
                except ValueError:
                    continue
                tipo = ev.get("type")
                if tipo == "response.output_text.delta":
                    partes.append(ev.get("delta", ""))
                elif tipo in ("response.completed", "response.incomplete", "response.failed"):
                    fim = tipo
    if fim != "response.completed":
        raise RuntimeError(f"resposta_incompleta:{fim}")
    texto = "".join(partes).strip()
    if not texto:
        raise RuntimeError("resposta_vazia")
    return texto


class Cerebro(BaseHTTPRequestHandler):
    server_version = "aurora-cerebro/1.0"

    def log_message(self, *_args) -> None:  # sem log padrão (poderia vazar caminho/IP à toa)
        return

    def responder(self, status: int, corpo: dict) -> None:
        dados = json.dumps(corpo, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def do_GET(self) -> None:
        if self.path != "/health":
            return self.responder(404, {"erro": "rota"})
        try:
            from agent.auxiliary_client import _read_codex_access_token
            assinatura = bool(_read_codex_access_token())
        except Exception:
            assinatura = False
        return self.responder(200, {"ok": True, "assinatura": assinatura, "modelo": MODELO})

    def do_POST(self) -> None:
        if self.path != "/texto":
            return self.responder(404, {"erro": "rota"})
        if not autorizado(self.headers.get("Authorization") or ""):
            log("negado")
            return self.responder(401, {"erro": "unauthorized"})
        if not dentro_do_limite():
            log("limite")
            return self.responder(429, {"erro": "rate_limited"})
        try:
            tamanho = int(self.headers.get("Content-Length") or 0)
            if tamanho > 64 * 1024:
                return self.responder(413, {"erro": "grande_demais"})
            corpo = json.loads(self.rfile.read(tamanho) or b"{}")
            instrucoes, entrada, esforco = validar(corpo)
        except (ValueError, json.JSONDecodeError) as e:
            return self.responder(400, {"erro": str(e)})
        t0 = time.time()
        try:
            texto = gerar(instrucoes, entrada, esforco)
        except Exception as e:  # noqa: BLE001
            motivo = str(e)[:80]
            log("falha", motivo=motivo, segundos=round(time.time() - t0, 1))
            status = 429 if "codex_http_429" in motivo else 503 if "indisponivel" in motivo else 502
            return self.responder(status, {"erro": motivo})
        segundos = round(time.time() - t0, 2)
        log("ok", entrada=len(entrada), saida=len(texto), segundos=segundos, esforco=esforco)
        return self.responder(200, {"texto": texto, "segundos": segundos, "modelo": MODELO})


if __name__ == "__main__":
    log("pronto", porta=PORTA, modelo=MODELO)
    ThreadingHTTPServer((HOST, PORTA), Cerebro).serve_forever()
