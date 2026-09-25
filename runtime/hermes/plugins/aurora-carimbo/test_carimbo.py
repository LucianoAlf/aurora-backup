"""python3 -m pytest -q (ou python3 test_carimbo.py) — regras do carimbo sem Hermes."""
import hashlib, hmac, importlib.util, pathlib, sys

spec = importlib.util.spec_from_file_location("carimbo", pathlib.Path(__file__).with_name("__init__.py"))
c = importlib.util.module_from_spec(spec); spec.loader.exec_module(c)
K = b"k" * 64


def test_mapa_de_ferramentas():
    assert c._ferramenta("mcp__aurora-read__aurora_lead") == "aurora_lead"
    assert c._ferramenta("mcp_aurora_read_aurora_leads_followup") == "aurora_leads_followup"
    assert c._ferramenta("mcp__aurora-write__aurora_lead_registrar") == "aurora_lead_registrar"
    assert c._ferramenta("terminal") is None


def test_carimbo_assinado_e_formato():
    x = c.carimbar("whatsapp", "5521999998888@s.whatsapp.net", "5521999998888@s.whatsapp.net", "dm", K, agora=1790000000)
    base, sig = x.rsplit(".", 1)
    assert base.startswith("AUR1.whatsapp.dm.5521999998888.")
    assert sig == hmac.new(K, base.encode(), hashlib.sha256).hexdigest()[:32]
    g = c.carimbar("whatsapp", "150401315827754@lid", "1203630@g.us", "group", K)
    assert ".group.150401315827754@lid." in g


def test_sem_remetente_nao_carimba():
    assert c.carimbar("telegram", "123456789", "123", "dm", K) is None
    assert c.carimbar("whatsapp", "", "x", "dm", K) is None
    assert c.carimbar("whatsapp", "5521999998888", "", "dm", K) is None


def test_hook_bloqueia_sem_sessao(monkeypatch=None):
    c._sessao = lambda: {"PLATFORM": "", "USER_ID": "", "CHAT_ID": "", "CHAT_TYPE": ""}
    c.KEY_PATH = pathlib.Path(__file__)  # qualquer arquivo legível
    assert c._on_pre_tool_call("mcp__aurora-read__aurora_quem_e", {"identificador": "5521981278047"})["action"] == "block"
    assert c._on_pre_tool_call("mcp__aurora-read__aurora_hoje", {}) is None
    assert c._on_pre_tool_call("mcp__aurora-write__aurora_nova_sem_regra", {})["action"] == "block"
    assert c._on_pre_tool_call("terminal", {}) is None


def test_hook_sobrescreve_o_que_o_modelo_mandou():
    c._sessao = lambda: {"PLATFORM": "whatsapp", "USER_ID": "5521900000001@s.whatsapp.net", "CHAT_ID": "5521900000001@s.whatsapp.net", "CHAT_TYPE": "dm"}
    r = c._on_pre_tool_call("mcp__aurora-write__aurora_lead_registrar", {"numero": "5521981278047", "origem": "instagram"})
    assert r["action"] == "modify" and r["args"]["numero"].startswith("AUR1.whatsapp.dm.5521900000001.")


if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"):
            f(); print("ok", n)
