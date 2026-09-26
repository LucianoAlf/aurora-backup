"""python3 tests/test_cerebro.py — regras de acesso e validação, sem chamar o modelo."""
import importlib.util, os, pathlib, sys, tempfile

aqui = pathlib.Path(__file__).resolve().parent.parent
tok = tempfile.NamedTemporaryFile("w", delete=False); tok.write("segredo-de-teste\n"); tok.close()
os.environ["AURORA_CEREBRO_TOKEN_FILE"] = tok.name
os.environ["AURORA_CEREBRO_RATE_PER_MIN"] = "3"
spec = importlib.util.spec_from_file_location("cerebro", aqui / "cerebro.py")
c = importlib.util.module_from_spec(spec); spec.loader.exec_module(c)


def test_token():
    assert c.autorizado("Bearer segredo-de-teste")
    assert not c.autorizado("Bearer errado")
    assert not c.autorizado("segredo-de-teste")
    assert not c.autorizado("")


def test_validacao():
    assert c.validar({"instrucoes": "a", "entrada": "b"}) == ("a", "b", "medium")
    for ruim in ({"instrucoes": "", "entrada": "b"}, {"instrucoes": "a", "entrada": "b", "esforco": "max"},
                 {"instrucoes": "a" * 7000, "entrada": "b"}, {"instrucoes": "a", "entrada": "b" * 9000}):
        try:
            c.validar(ruim); assert False, ruim
        except ValueError:
            pass


def test_limite_por_minuto():
    c._janela.clear()
    assert [c.dentro_do_limite() for _ in range(4)] == [True, True, True, False]


if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"):
            f(); print("ok", n)
    os.unlink(tok.name)
