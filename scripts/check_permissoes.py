#!/usr/bin/env python3
"""Confere que o resumo de permissões do AGENTS.md acompanha o PERMISSOES.md.

Falha se o PERMISSOES.md mudou e o marcador `permissoes-sha256` do AGENTS.md
não foi atualizado junto, o que indica que a seção 8 pode estar desatualizada.
"""
import hashlib
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
atual = hashlib.sha256((root / "PERMISSOES.md").read_bytes()).hexdigest()
m = re.search(r"permissoes-sha256:\s*([0-9a-f]{64})", (root / "AGENTS.md").read_text())
if not m:
    sys.exit("FALHA: AGENTS.md sem marcador permissoes-sha256")
if m.group(1) != atual:
    sys.exit(f"FALHA: PERMISSOES.md mudou ({atual[:12]}) e o resumo do AGENTS.md aponta {m.group(1)[:12]}. Atualize a seção 8 e o marcador.")
print(f"ok: resumo do AGENTS.md acompanha PERMISSOES.md ({atual[:12]})")
