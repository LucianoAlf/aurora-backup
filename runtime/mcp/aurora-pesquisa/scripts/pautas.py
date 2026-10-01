#!/usr/bin/env python3
"""Planilha "Pautas de Conteúdo — SonoraMente": registrar, atualizar e listar pautas.

  pautas.py registrar '{"canal":..., "titulo":..., "ideia":..., "publico":..., "fontes":..., "pedido_por":...}'
  pautas.py atualizar '{"id":..., "status":..., "texto":..., "ajustes":...}'
  pautas.py listar '{"status": opcional, "canal": opcional}'

Saída: um JSON no stdout.
"""
import datetime, fcntl, json, os, subprocess, sys
from zoneinfo import ZoneInfo

SHEET = os.environ.get("PAUTAS_SHEET_ID", "18g6gI0S7VMX4ezZoyRSZH3VivG2e1ySDlrrrzzHcNeU")
COMPOSIO = os.environ.get("COMPOSIO_BIN", "/home/aurora/.local/bin/composio")
LOCK = os.environ.get("PAUTAS_LOCK", "/home/aurora/.hermes/pautas.lock")
API = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET}/values"
SP = ZoneInfo("America/Sao_Paulo")
COLS = ["id", "criada_em", "canal", "titulo", "ideia", "publico", "fontes", "pedido_por", "status", "texto", "ajustes",
        "atualizado_em", "formato", "semana", "data_publicacao", "responsavel_producao"]


class Falha(Exception):
    pass


def proxy(url, metodo="GET", corpo=None):
    cmd = [COMPOSIO, "proxy", url, "-t", "googledrive"]
    if metodo != "GET":
        cmd += ["-X", metodo, "-H", "Content-Type: application/json"]
    if corpo is not None:
        cmd += ["-d", json.dumps(corpo, ensure_ascii=False)]
    for _ in range(3):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        except subprocess.TimeoutExpired:
            continue
        if r.returncode == 0:
            return json.loads(r.stdout or "{}")
    raise Falha("planilha_indisponivel")


def agora():
    return datetime.datetime.now(SP).strftime("%d/%m/%Y %H:%M")


def linhas():
    # O proxy às vezes devolve corpo vazio; sem "range" a leitura não valeu e é refeita.
    for _ in range(3):
        resp = proxy(f"{API}/Pautas!A2:P")
        if "range" in resp:
            break
    else:
        raise Falha("planilha_indisponivel")
    vals = resp.get("values", [])
    return [dict(zip(COLS, v + [""] * (len(COLS) - len(v))), linha=i + 2) for i, v in enumerate(vals)]


def registrar(a):
    for campo in ("canal", "titulo", "ideia", "pedido_por"):
        if not str(a.get(campo) or "").strip():
            raise Falha(f"falta_{campo}")
    pid = "P-" + datetime.datetime.now(SP).strftime("%y%m%d-%H%M%S")
    formato = a.get("formato") or ("newsletter" if a["canal"] == "newsletter" else "carrossel")
    if formato not in ("carrossel", "reel", "newsletter"):
        raise Falha("formato_invalido")
    semana = a.get("semana") or datetime.datetime.now(SP).strftime("%G-W%V")
    responsavel = a.get("responsavel_producao") or ("Alfredo" if a["canal"] == "newsletter" else "Serjão + Marketing")
    row = [pid, agora(), a["canal"], a["titulo"], a["ideia"], a.get("publico", ""), a.get("fontes", ""),
           a["pedido_por"], "sugerida", "", "", agora(), formato, semana, a.get("data_publicacao", ""), responsavel]
    proxy(f"{API}/Pautas!A:P:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", "POST", {"values": [row]})
    return {"ok": True, "id": pid, "status": "sugerida", "formato": formato, "semana": semana}


def atualizar(a):
    alvo = next((l for l in linhas() if l["id"] == a.get("id")), None)
    if not alvo:
        raise Falha("pauta_nao_encontrada")
    novo = {"status": a.get("status") or alvo["status"], "texto": a.get("texto", alvo["texto"]),
            "ajustes": a.get("ajustes", alvo["ajustes"]),
            "formato": a.get("formato", alvo["formato"]), "semana": a.get("semana", alvo["semana"]),
            "data_publicacao": a.get("data_publicacao", alvo["data_publicacao"]),
            "responsavel_producao": a.get("responsavel_producao", alvo["responsavel_producao"])}
    if a.get("ajustes") and alvo["ajustes"]:
        novo["ajustes"] = alvo["ajustes"] + "\n— " + a["ajustes"]
    # O Alfredo monta a página a partir da coluna Texto: newsletter não é aprovada sem o texto final.
    if novo["status"] == "aprovada" and alvo["canal"] == "newsletter" and not str(novo["texto"]).strip():
        raise Falha("falta_texto_final")
    proxy(f"{API}/Pautas!I{alvo['linha']}:P{alvo['linha']}?valueInputOption=RAW", "PUT",
          {"values": [[novo["status"], novo["texto"], novo["ajustes"], agora(), novo["formato"], novo["semana"],
                       novo["data_publicacao"], novo["responsavel_producao"]]]})
    return {"ok": True, "id": alvo["id"], "canal": alvo["canal"], "titulo": alvo["titulo"], "status": novo["status"],
            "status_anterior": alvo["status"], "formato": novo["formato"], "data_publicacao": novo["data_publicacao"]}


def listar(a):
    out = []
    for l in linhas():
        if a.get("status") and l["status"] != a["status"]:
            continue
        if a.get("canal") and l["canal"] != a["canal"]:
            continue
        out.append({k: (l[k][:600] if isinstance(l[k], str) else l[k]) for k in COLS})
    return {"ok": True, "pautas": out[-30:]}


def main():
    cmd, dados = sys.argv[1], json.loads(sys.argv[2] if len(sys.argv) > 2 else "{}")
    try:
        with open(LOCK, "a") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            out = {"registrar": registrar, "atualizar": atualizar, "listar": listar}[cmd](dados)
    except Falha as e:
        out = {"ok": False, "erro": str(e)}
    except Exception as e:  # noqa: BLE001
        out = {"ok": False, "erro": "inesperado", "tipo": type(e).__name__}
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
