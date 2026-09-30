#!/usr/bin/env python3
"""Contexto injetado nos crons de conteúdo da Aurora (Hermes, modo --script).

  conteudo_contexto.py ponte    -> próxima edição da Ponte Sonora + fontes da semana (Tavily)
  conteudo_contexto.py instagram -> meta 3 carrosséis + 1 Reel e fontes da semana (Tavily)
  conteudo_contexto.py lembrete-bianca    -> texto de lembrete se houver pauta parada com a Bianca (senão vazio)
  conteudo_contexto.py lembrete-serjao-selecao -> cobra somente o que faltar da meta 3+1
  conteudo_contexto.py lembrete-serjao-producao -> lista aprovadas ainda não publicadas
  conteudo_contexto.py calendario -> fechamento semanal para Bianca e Serjão

Só leitura. A pesquisa usa o mesmo worker do MCP aurora-pesquisa.
"""
import datetime, json, os, subprocess, sys
from zoneinfo import ZoneInfo

SP = ZoneInfo("America/Sao_Paulo")
RELEASE = os.environ.get("AURORA_PESQUISA_DIR", "/home/aurora/.hermes/aurora-pesquisa-atual")
ENV = {**os.environ, "CONTENT_READERS_ENV": "/home/aurora/.hermes/pesquisa.env",
       "COMPOSIO_BIN": "/home/aurora/.local/bin/composio", "PATH": "/home/aurora/.local/bin:/usr/bin:/bin"}

EDICOES = [  # calendário editorial aprovado em rascunho (Alf, 2026-09-28); série de marcos 0–12
    ("2026-10-05", 2, "Marco não é régua: como ler o desenvolvimento musical", "panorama 0–12"),
    ("2026-10-12", 3, "O primeiro ano: quando o bebê já é musical", "0–12 meses"),
    ("2026-10-19", 4, "Andar, marchar, tocar: a música de 1 a 2 anos", "1–2 anos"),
    ("2026-10-26", 5, "Pulso, turno e imitação: 2 a 4 anos", "2–4 anos"),
    ("2026-11-02", 6, "Canto inteiro, pulso estável: 4 a 6 anos", "4–6 anos"),
    ("2026-11-09", 7, "Afinação, símbolo e grupo: 6 a 8 anos", "6–8 anos"),
    ("2026-11-16", 8, "Do improviso à forma: 8 a 10 anos", "8–10 anos"),
    ("2026-11-23", 9, "Autonomia e pensamento musical: 10 a 12 anos", "10–12 anos"),
    ("2026-11-30", 10, "Do marco ao registro: roteiro de observação em 6 perguntas", "fechamento"),
]
TEMAS_FAMILIAS = ["seletividade e sensibilidade a sons", "rotina e música em casa", "fala e linguagem na primeira infância",
                  "regulação emocional e crises", "brincar junto e atenção compartilhada", "sono e música",
                  "inclusão na escola", "o que é musicoterapia e como funciona o acolhimento"]


def rodar(*args):
    r = subprocess.run([sys.executable, *args], capture_output=True, text=True, timeout=240, env=ENV)
    return json.loads(r.stdout or "{}")


def pesquisa(consulta):
    d = rodar(f"{RELEASE}/scripts/pesquisa.py", "web", consulta, "--max", "5")
    return [f"- {f['titulo']} — {f['url']}\n  {f['trecho'][:300]}" for f in d.get("fontes", [])] or ["(pesquisa indisponível agora)"]


def ponte():
    hoje = datetime.datetime.now(SP).date()
    prox = next((e for e in EDICOES if datetime.date.fromisoformat(e[0]) > hoje), None)
    if not prox:
        print("A série de marcos terminou. Proponha à Bianca 3 pautas da série Neurodivergências.")
        return
    data, n, titulo, faixa = prox
    print(f"PRÓXIMA EDIÇÃO: Ponte Sonora nº {n}, envio {data[8:10]}/{data[5:7]}. Tema do calendário: \"{titulo}\" (faixa {faixa}).")
    print("Base: e-book do Gleisson Oliveira, Marcos do Desenvolvimento Infantil (resumir com crédito, sem copiar tabela).")
    print("FONTES DA SEMANA (Tavily):")
    print("\n".join(pesquisa(f"desenvolvimento musical infantil {faixa} marcos musicoterapia estudo")))


def instagram():
    semana = datetime.datetime.now(SP).isocalendar().week
    tema = TEMAS_FAMILIAS[semana % len(TEMAS_FAMILIAS)]
    print("META DA SEMANA: 3 carrosséis + 1 Reel. Sugira 5 opções de carrossel e 2 opções de Reel para o Serjão escolher 3+1.")
    print("CALENDÁRIO-BASE AJUSTÁVEL PELOS INSIGHTS: carrosséis terça, quinta e sábado; Reel sexta.")
    print(f"TEMA SUGERIDO DA SEMANA (famílias atípicas): {tema}.")
    print("FONTES (Tavily):")
    print("\n".join(pesquisa(f"{tema} crianças autismo neurodivergência orientação famílias estudo")))


def lembrete_bianca():
    d = rodar(f"{RELEASE}/scripts/pautas.py", "listar", "{}")
    paradas = [p for p in d.get("pautas", []) if p.get("status") in ("com_bianca", "ajustes")]
    if not paradas:
        return  # silêncio: nada parado
    linhas = [f"• [{p.get('formato') or ('newsletter' if p.get('canal') == 'newsletter' else 'carrossel')}] {p['titulo']}" for p in paradas[:8]]
    print("Oi, Bianca! 💜 Passando só pra lembrar do que está esperando você por aqui:\n" + "\n".join(linhas) +
          "\n\nQuando puder, me diz se aprova, ajusta ou escolhe outra. Pode ser por áudio.")


def pautas_instagram_semana():
    d = rodar(f"{RELEASE}/scripts/pautas.py", "listar", json.dumps({"canal": "instagram"}))
    chave = datetime.datetime.now(SP).strftime("%G-W%V")
    inicio = datetime.datetime.now(SP).date() - datetime.timedelta(days=datetime.datetime.now(SP).weekday())
    fim = inicio + datetime.timedelta(days=6)
    out = []
    for p in d.get("pautas", []):
        if p.get("semana") == chave:
            out.append(p); continue
        try:
            criada = datetime.datetime.strptime(p.get("criada_em", "")[:10], "%d/%m/%Y").date()
        except ValueError:
            continue
        if inicio <= criada <= fim:
            out.append(p)
    return out


def formato(p):
    return p.get("formato") or "carrossel"


def lembrete_serjao_selecao():
    ps = [p for p in pautas_instagram_semana() if p.get("status") not in ("sugerida", "reprovada")]
    c = sum(formato(p) == "carrossel" for p in ps)
    r = sum(formato(p) == "reel" for p in ps)
    falta_c, falta_r = max(0, 3 - c), max(0, 1 - r)
    if not (falta_c or falta_r):
        return
    faltas = []
    if falta_c: faltas.append(f"{falta_c} " + ("carrosséis" if falta_c > 1 else "carrossel"))
    if falta_r: faltas.append(f"{falta_r} Reel")
    print("Serjão, pra fechar a semana com o Marketing ainda falta escolher " + " e ".join(faltas) +
          ". A meta é 3 carrosséis + 1 Reel. Me diga os escolhidos e, se os Insights pedirem, ajustamos os dias.")


def lembrete_serjao_producao():
    ps = [p for p in pautas_instagram_semana() if p.get("status") in ("aprovada", "com_serjao")]
    if not ps:
        return
    linhas = [f"• [{formato(p)}] {p['titulo']} — {p.get('data_publicacao') or 'data a definir'}" for p in ps[:8]]
    print("Serjão, estas peças já passaram pela Bianca e precisam ser fechadas com o Marketing:\n" + "\n".join(linhas) +
          "\n\nQuando cada uma for publicada, me avisa pra eu fechar o calendário.")


def calendario():
    ps = [p for p in pautas_instagram_semana() if p.get("status") != "reprovada"]
    carrosseis = [p for p in ps if formato(p) == "carrossel"][:3]
    reels = [p for p in ps if formato(p) == "reel"][:1]
    linhas = []
    for rotulo, lista, meta in (("Carrossel", carrosseis, 3), ("Reel", reels, 1)):
        for p in lista:
            linhas.append(f"• {rotulo}: {p['titulo']} — {p.get('status') or 'sugerida'} — {p.get('data_publicacao') or 'data a definir'}")
        if len(lista) < meta:
            linhas.append(f"• {rotulo}: faltam {meta - len(lista)} pauta(s)")
    print("Fechamento do calendário do Instagram — meta 3 carrosséis + 1 Reel:\n" + "\n".join(linhas) +
          "\n\nBianca fecha tema e texto; Serjão fecha arte, vídeo e publicação com o Marketing.")


if __name__ == "__main__":
    # O Hermes chama o script sem argumentos: o modo vem do nome do link (conteudo_ponte.py etc.).
    modo = sys.argv[1] if len(sys.argv) > 1 else os.path.basename(sys.argv[0]).removeprefix("conteudo_").removesuffix(".py")
    {"ponte": ponte, "instagram": instagram, "lembrete-bianca": lembrete_bianca, "lembrete_bianca": lembrete_bianca,
     "lembrete-serjao-selecao": lembrete_serjao_selecao, "lembrete_serjao_selecao": lembrete_serjao_selecao,
     "lembrete-serjao-producao": lembrete_serjao_producao, "lembrete_serjao_producao": lembrete_serjao_producao,
     "calendario": calendario}[modo]()
