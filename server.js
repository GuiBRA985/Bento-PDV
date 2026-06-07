const express    = require("express");
const cors       = require("cors");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// ── Supabase (variáveis de ambiente configuradas no Render) ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // service_role key (só no servidor!)
);

const JWT_SECRET = process.env.JWT_SECRET || "troque_este_segredo_no_render";

// ── Middleware de autenticação ──────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ erro: "Não autorizado" });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erro: "Token inválido" });
  }
}

function soAdmin(req, res, next) {
  if (req.usuario.perfil !== "admin") return res.status(403).json({ erro: "Sem permissão" });
  next();
}

// ════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ erro: "Dados incompletos" });

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("usuario", usuario)
    .single();

  if (error || !data) return res.status(401).json({ erro: "Usuário não encontrado" });

  const ok = await bcrypt.compare(senha, data.senha_hash);
  if (!ok) return res.status(401).json({ erro: "Senha incorreta" });

  const token = jwt.sign(
    { id: data.id, usuario: data.usuario, perfil: data.perfil, nome: data.nome },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, perfil: data.perfil, nome: data.nome });
});

// ════════════════════════════════════════════════════════════
// USUÁRIOS (só admin)
// ════════════════════════════════════════════════════════════

// GET /usuarios
app.get("/usuarios", auth, soAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, usuario, nome, perfil, criado_em")
    .order("criado_em");
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// POST /usuarios
app.post("/usuarios", auth, soAdmin, async (req, res) => {
  const { usuario, senha, nome, perfil } = req.body;
  if (!usuario || !senha || !nome || !perfil)
    return res.status(400).json({ erro: "Dados incompletos" });

  const senha_hash = await bcrypt.hash(senha, 10);
  const { data, error } = await supabase
    .from("usuarios")
    .insert({ usuario, senha_hash, nome, perfil })
    .select("id, usuario, nome, perfil")
    .single();

  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

// DELETE /usuarios/:id
app.delete("/usuarios/:id", auth, soAdmin, async (req, res) => {
  const { error } = await supabase.from("usuarios").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
// CARDÁPIO
// ════════════════════════════════════════════════════════════

// GET /cardapio
app.get("/cardapio", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("cardapio")
    .select("*")
    .eq("ativo", true)
    .order("categoria")
    .order("nome");
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// POST /cardapio (admin)
app.post("/cardapio", auth, soAdmin, async (req, res) => {
  const { nome, categoria, preco, descricao } = req.body;
  if (!nome || !categoria || !preco)
    return res.status(400).json({ erro: "Dados incompletos" });

  const { data, error } = await supabase
    .from("cardapio")
    .insert({ nome, categoria, preco, descricao: descricao || "" })
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /cardapio/:id (admin)
app.put("/cardapio/:id", auth, soAdmin, async (req, res) => {
  const { nome, categoria, preco, descricao, ativo } = req.body;
  const { data, error } = await supabase
    .from("cardapio")
    .update({ nome, categoria, preco, descricao, ativo })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// DELETE /cardapio/:id (admin) — soft delete
app.delete("/cardapio/:id", auth, soAdmin, async (req, res) => {
  const { error } = await supabase
    .from("cardapio")
    .update({ ativo: false })
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
// PEDIDOS
// ════════════════════════════════════════════════════════════

// GET /pedidos  (filtra por data; padrão = hoje)
app.get("/pedidos", auth, async (req, res) => {
  const inicio = req.query.inicio || new Date().toISOString().split("T")[0] + "T00:00:00";
  const fim    = req.query.fim    || new Date().toISOString().split("T")[0] + "T23:59:59";

  const { data, error } = await supabase
    .from("pedidos")
    .select(`*, itens_pedido(*, cardapio(nome, preco))`)
    .gte("criado_em", inicio)
    .lte("criado_em", fim)
    .order("criado_em", { ascending: false });

  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// POST /pedidos
app.post("/pedidos", auth, async (req, res) => {
  const { tipo_cliente, cliente, itens, obs } = req.body;
  if (!tipo_cliente || !cliente || !itens?.length)
    return res.status(400).json({ erro: "Dados incompletos" });

  const total = itens.reduce((s, x) => s + x.preco * x.qty, 0);

  const { data: pedido, error: errPedido } = await supabase
    .from("pedidos")
    .insert({ tipo_cliente, cliente, obs: obs || "", total, status: "aberto", criado_por: req.usuario.id })
    .select()
    .single();

  if (errPedido) return res.status(500).json({ erro: errPedido.message });

  const linhas = itens.map(x => ({
    pedido_id:   pedido.id,
    cardapio_id: x.id,
    nome_snap:   x.nome,
    preco_snap:  x.preco,
    qty:         x.qty,
  }));

  const { error: errItens } = await supabase.from("itens_pedido").insert(linhas);
  if (errItens) return res.status(500).json({ erro: errItens.message });

  res.status(201).json(pedido);
});

// PATCH /pedidos/:id/status
app.patch("/pedidos/:id/status", auth, async (req, res) => {
  const { status } = req.body;
  const validos = ["aberto", "preparo", "pronto", "entregue"];
  if (!validos.includes(status)) return res.status(400).json({ erro: "Status inválido" });

  const { data, error } = await supabase
    .from("pedidos")
    .update({ status })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// DELETE /pedidos/:id (admin)
app.delete("/pedidos/:id", auth, soAdmin, async (req, res) => {
  await supabase.from("itens_pedido").delete().eq("pedido_id", req.params.id);
  const { error } = await supabase.from("pedidos").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
// RELATÓRIOS (admin)
// ════════════════════════════════════════════════════════════

// GET /relatorios/dia?data=2024-01-15
app.get("/relatorios/dia", auth, soAdmin, async (req, res) => {
  const data = req.query.data || new Date().toISOString().split("T")[0];

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select(`total, status, tipo_cliente, itens_pedido(nome_snap, qty, preco_snap)`)
    .gte("criado_em", data + "T00:00:00")
    .lte("criado_em", data + "T23:59:59")
    .neq("status", "cancelado");

  if (error) return res.status(500).json({ erro: error.message });

  const totalDia    = pedidos.reduce((s, p) => s + Number(p.total), 0);
  const qtdPedidos  = pedidos.length;
  const ticketMedio = qtdPedidos ? totalDia / qtdPedidos : 0;

  // itens mais vendidos
  const contagem = {};
  pedidos.forEach(p => p.itens_pedido.forEach(i => {
    contagem[i.nome_snap] = (contagem[i.nome_snap] || 0) + i.qty;
  }));
  const maisVendidos = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nome, qty]) => ({ nome, qty }));

  res.json({ data, totalDia, qtdPedidos, ticketMedio, maisVendidos });
});

// ════════════════════════════════════════════════════════════
app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PDV API rodando na porta ${PORT}`));
