#!/usr/bin/env python3
"""Pesquisa pública da Aurora: web (Tavily), página (Firecrawl), Instagram e YouTube (leitores Gemini).

  pesquisa.py web "consulta" [--max 5]
  pesquisa.py ler URL
  pesquisa.py instagram URL
  pesquisa.py youtube URL

Só conteúdo público. Saída: um JSON curto no stdout. Erro: {"ok": false, "erro": codigo}.
"""
import argparse, json, os, subprocess, sys, tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
COMPOSIO = os.environ.get("COMPOSIO_BIN", "/home/aurora/.local/bin/composio")
PYTHON = sys.executable or "/usr/bin/python3"
TRABALHO = Path(os.environ.get("PESQUISA_DIR", "/home/aurora/.hermes/pesquisa"))
MAX_TEXTO = 12000


class Falha(Exception):
    pass


def composio(slug, payload, timeout=150):
    try:
        r = subprocess.run([COMPOSIO, "execute", slug, "-d", json.dumps(payload, ensure_ascii=False)],
                           capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise Falha("tempo_esgotado")
    if r.returncode:
        raise Falha("composio_falhou")
    out = json.loads(r.stdout)
    if isinstance(out, dict) and out.get("outputFilePath"):
        with open(out["outputFilePath"], encoding="utf-8") as f:
            out = json.load(f)
    if not out.get("successful", True):
        raise Falha("ferramenta_recusou")
    return out.get("data", out)


def corta(t, n):
    t = str(t or "").strip()
    return t if len(t) <= n else t[: n - 1] + "…"


def web(consulta, maximo):
    d = composio("TAVILY_SEARCH", {"query": consulta, "max_results": max(1, min(maximo, 8)),
                                   "search_depth": "advanced", "include_answer": True})
    d = d.get("response_data", d)
    fontes = [{"titulo": r.get("title"), "url": r.get("url"), "data": r.get("published_date"),
               "trecho": corta(r.get("content"), 700)} for r in d.get("results", [])]
    return {"ok": True, "consulta": consulta, "resumo_da_busca": corta(d.get("answer"), 1200), "fontes": fontes}


def ler(url):
    d = composio("FIRECRAWL_SCRAPE", {"url": url, "formats": ["markdown"], "onlyMainContent": True})
    d = d.get("data", d)
    meta = d.get("metadata") or {}
    texto = d.get("markdown") or ""
    return {"ok": True, "url": meta.get("sourceURL") or url, "titulo": meta.get("title"),
            "texto": corta(texto, MAX_TEXTO), "cortado": len(texto) > MAX_TEXTO}


def rodar(args, timeout, aceitos=(0,)):
    env = {**os.environ, "PATH": f"{Path(COMPOSIO).parent}:{os.environ.get('PATH', '/usr/bin:/bin')}"}
    try:
        r = subprocess.run([PYTHON, *args], capture_output=True, text=True, timeout=timeout, env=env)
    except subprocess.TimeoutExpired:
        raise Falha("tempo_esgotado")
    if r.returncode not in aceitos:
        raise Falha("leitor_falhou")


def instagram(url):
    TRABALHO.mkdir(parents=True, exist_ok=True, mode=0o700)
    pasta = Path(tempfile.mkdtemp(prefix="ig-", dir=TRABALHO))
    leitor = str(AQUI / "instagram_reader.py")
    rodar([leitor, "fetch", url, "--out", str(pasta / "coleta"), "--allow-paid"], 120)
    rodar([leitor, "read", str(pasta / "coleta" / "manifest.json"), "--out", str(pasta / "percepcao"), "--allow-paid"], 150)
    p = json.loads((pasta / "percepcao" / "perception.json").read_text(encoding="utf-8"))
    midias = []
    for m in p.get("media", []):
        v, a = m.get("visual") or {}, m.get("audio") or {}
        midias.append({"n": m.get("index"), "tipo": m.get("kind"), "status": m.get("status"),
                       "o_que_se_ve": corta(v.get("summary"), 500), "texto_na_tela": v.get("screen_text", [])[:12],
                       "fala": a.get("speech", [])[:40], "audio": corta(a.get("summary"), 400)})
    return {"ok": p.get("status") == "processed", "url": url, "legenda": corta(p.get("caption"), 2500),
            "midias_esperadas": p.get("expected_media"), "midias_lidas": p.get("processed_media"), "midias": midias}


def youtube(url):
    TRABALHO.mkdir(parents=True, exist_ok=True, mode=0o700)
    pasta = Path(tempfile.mkdtemp(prefix="yt-", dir=TRABALHO))
    # O leitor exige pasta ainda inexistente.
    rodar([str(AQUI / "youtube_reader.py"), "read", url, "--out", str(pasta / "leitura"), "--no-fallback"], 270, aceitos=(0, 3, 4))
    r = json.loads((pasta / "leitura" / "perception.json").read_text(encoding="utf-8"))
    if r.get("status") == "limit_reached_ask_alf":
        raise Falha("limite_semanal_ou_video_longo_pedir_ao_alf")
    if r.get("status") == "quota_exhausted_stop_and_notify_alf":
        raise Falha("cota_esgotada_avisar_o_alf")
    leitura = json.dumps(r.get("perception") or {}, ensure_ascii=False)
    return {"ok": r.get("status") == "processed", "url": r.get("url", url), "titulo": (r.get("oembed") or {}).get("title"),
            "leitura": corta(leitura, MAX_TEXTO)}


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("web"); w.add_argument("consulta"); w.add_argument("--max", type=int, default=5)
    for nome in ("ler", "instagram", "youtube"):
        sub.add_parser(nome).add_argument("url")
    a = ap.parse_args()
    try:
        if a.cmd == "web":
            out = web(a.consulta, a.max)
        else:
            out = {"ler": ler, "instagram": instagram, "youtube": youtube}[a.cmd](a.url)
    except Falha as e:
        out = {"ok": False, "erro": str(e)}
    except Exception as e:  # noqa: BLE001
        out = {"ok": False, "erro": "inesperado", "tipo": type(e).__name__}
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
