const express    = require("express");
const cors       = require("cors");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || "troque_no_render";

// ── Middlewares ───────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ erro: "Não autorizado" });
  try { req.usuario = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ erro: "Token inválido" }); }
}

function soAdmin(req, res, next) {
  if (req.usuario.perfil !== "admin") return res.status(403).json({ erro: "Sem permissão" });
  next();
}

// Middleware para pedidos de clientes autenticados via Supabase Auth
async function authCliente(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ erro: "Não autorizado" });
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ erro: "Token inválido" });
    req.clienteId = user.id;
    req.clienteEmail = user.email;
    next();
  } catch { res.status(401).json({ erro: "Erro de autenticação" }); }
}

// ════════════════════════════════════════════════════════════
// AUTH — STAFF (garçom, caixa, cozinha, admin)
// ════════════════════════════════════════════════════════════
app.post("/auth/login", async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ erro: "Dados incompletos" });
  const { data, error } = await supabase.from("usuarios").select("*").eq("usuario", usuario).single();
  if (error || !data) return res.status(401).json({ erro: "Usuário não encontrado" });
  const ok = await bcrypt.compare(senha, data.senha_hash);
  if (!ok) return res.status(401).json({ erro: "Senha incorreta" });
  const token = jwt.sign(
    { id: data.id, usuario: data.usuario, perfil: data.perfil, nome: data.nome },
    JWT_SECRET, { expiresIn: "12h" }
  );
  res.json({ token, perfil: data.perfil, nome: data.nome });
});

// ════════════════════════════════════════════════════════════
// AUTH — CLIENTE (Supabase Auth magic link)
// ════════════════════════════════════════════════════════════

// POST /auth/cliente/magiclink — envia magic link para o e-mail
app.post("/auth/cliente/magiclink", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: "E-mail obrigatório" });
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: process.env.CLIENT_URL || "https://pdv.bento.host/cliente.html" }
  });
  if (error) return res.status(500).json({ erro: error.message });
  res.json({ ok: true });
});

// POST /auth/cliente/perfil — cria/atualiza perfil após login
app.post("/auth/cliente/perfil", authCliente, async (req, res) => {
  const { nome, telefone } = req.body;
  const { data, error } = await supabase.from("clientes").upsert({
    id: req.clienteId,
    email: req.clienteEmail,
    nome: nome || "",
    telefone: telefone || "",
  }, { onConflict: "id" }).select().single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /auth/cliente/perfil
app.get("/auth/cliente/perfil", authCliente, async (req, res) => {
  const { data, error } = await supabase.from("clientes").select("*").eq("id", req.clienteId).single();
  if (error) return res.status(404).json({ erro: "Perfil não encontrado" });
  res.json(data);
});

// ════════════════════════════════════════════════════════════
// USUÁRIOS (admin)
// ════════════════════════════════════════════════════════════
app.get("/usuarios", auth, soAdmin, async (req, res) => {
  const { data, error } = await supabase.from("usuarios").select("id,usuario,nome,perfil,criado_em").order("criado_em");
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

app.post("/usuarios", auth, soAdmin, async (req, res) => {
  const { usuario, senha, nome, perfil } = req.body;
  if (!usuario || !senha || !nome || !perfil) return res.status(400).json({ erro: "Dados incompletos" });
  const senha_hash = await bcrypt.hash(senha, 10);
  const { data, error } = await supabase.from("usuarios").insert({ usuario, senha_hash, nome, perfil }).select("id,usuario,nome,perfil").single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

app.delete("/usuarios/:id", auth, soAdmin, async (req, res) => {
  const { error } = await supabase.from("usuarios").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
// CARDÁPIO
// ════════════════════════════════════════════════════════════
app.get("/cardapio", async (req, res) => {
  // Cardápio é público — clientes também acessam
  const { data, error } = await supabase.from("cardapio").select("*").eq("ativo", true).order("categoria").order("nome");
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

app.post("/cardapio", auth, soAdmin, async (req, res) => {
  const { nome, categoria, preco, descricao } = req.body;
  if (!nome || !categoria || !preco) return res.status(400).json({ erro: "Dados incompletos" });
  const { data, error } = await supabase.from("cardapio").insert({ nome, categoria, preco, descricao: descricao || "" }).select().single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

app.put("/cardapio/:id", auth, soAdmin, async (req, res) => {
  const { nome, categoria, preco, descricao, ativo } = req.body;
  const { data, error } = await supabase.from("cardapio").update({ nome, categoria, preco, descricao, ativo }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

app.delete("/cardapio/:id", auth, soAdmin, async (req, res) => {
  const { error } = await supabase.from("cardapio").update({ ativo: false }).eq("id", req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
// PEDIDOS — STAFF
// ════════════════════════════════════════════════════════════
app.get("/pedidos", auth, async (req, res) => {
  const inicio = req.query.inicio || new Date().toISOString().split("T")[0] + "T00:00:00";
  const fim    = req.query.fim    || new Date().toISOString().split("T")[0] + "T23:59:59";
  const { data, error } = await supabase.from("pedidos")
    .select("*, itens_pedido(*, cardapio(nome,preco))")
    .gte("criado_em", inicio).lte("criado_em", fim)
    .order("criado_em", { ascending: false });
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

app.post("/pedidos", auth, async (req, res) => {
  const { tipo_cliente, cliente, itens, obs, modalidade, endereco } = req.body;
  if (!tipo_cliente || !cliente || !itens?.length) return res.status(400).json({ erro: "Dados incompletos" });
  const total = itens.reduce((s, x) => s + x.preco * x.qty, 0);
  const { data: pedido, error: errPedido } = await supabase.from("pedidos")
    .insert({ tipo_cliente, cliente, obs: obs||"", total, status:"aberto",
              modalidade: modalidade||"mesa", endereco: endereco||"",
              origem:"pdv", criado_por: req.usuario.id })
    .select().single();
  if (errPedido) return res.status(500).json({ erro: errPedido.message });
  const linhas = itens.map(x => ({ pedido_id:pedido.id, cardapio_id:x.id, nome_snap:x.nome, preco_snap:x.preco, qty:x.qty }));
  const { error: errItens } = await supabase.from("itens_pedido").insert(linhas);
  if (errItens) return res.status(500).json({ erro: errItens.message });
  res.status(201).json(pedido);
});

app.patch("/pedidos/:id/status", auth, async (req, res) => {
  const { status } = req.body;
  const validos = ["aberto","preparo","pronto","entregue","cancelado"];
  if (!validos.includes(status)) return res.status(400).json({ erro: "Status inválido" });
  const { data, error } = await supabase.from("pedidos").update({ status }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

app.delete("/pedidos/:id", auth, soAdmin, async (req, res) => {
  await supabase.from("itens_pedido").delete().eq("pedido_id", req.params.id);
  const { error } = await supabase.from("pedidos").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
// PEDIDOS — CLIENTE APP
// ════════════════════════════════════════════════════════════
app.post("/app/pedidos", authCliente, async (req, res) => {
  const { itens, obs, modalidade, endereco, cliente } = req.body;
  if (!itens?.length || !modalidade) return res.status(400).json({ erro: "Dados incompletos" });
  if (modalidade === "entrega" && !endereco?.trim()) return res.status(400).json({ erro: "Endereço obrigatório para entrega" });

  // Busca perfil do cliente para usar como identificador
  const { data: perfil } = await supabase.from("clientes").select("nome,email").eq("id", req.clienteId).single();
  const nomeCliente = perfil?.nome || perfil?.email || req.clienteEmail;

  const total = itens.reduce((s, x) => s + x.preco * x.qty, 0);

  const { data: pedido, error: errPedido } = await supabase.from("pedidos").insert({
    tipo_cliente: modalidade === "carro" ? "carro" : "mesa",
    cliente: modalidade === "entrega" ? `🛵 ${nomeCliente}` :
             modalidade === "retirada" ? `🏃 ${nomeCliente}` :
             cliente || nomeCliente,
    obs: obs || "",
    total,
    status: "aberto",
    modalidade,
    endereco: endereco || "",
    origem: "app",
    cliente_auth_id: req.clienteId,
  }).select().single();

  if (errPedido) return res.status(500).json({ erro: errPedido.message });

  const linhas = itens.map(x => ({ pedido_id:pedido.id, cardapio_id:x.id, nome_snap:x.nome, preco_snap:x.preco, qty:x.qty }));
  const { error: errItens } = await supabase.from("itens_pedido").insert(linhas);
  if (errItens) return res.status(500).json({ erro: errItens.message });

  res.status(201).json(pedido);
});

// GET /app/pedidos — histórico do cliente
app.get("/app/pedidos", authCliente, async (req, res) => {
  const { data, error } = await supabase.from("pedidos")
    .select("*, itens_pedido(nome_snap, qty, preco_snap)")
    .eq("cliente_auth_id", req.clienteId)
    .order("criado_em", { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// ════════════════════════════════════════════════════════════
// RELATÓRIOS
// ════════════════════════════════════════════════════════════
app.get("/relatorios/dia", auth, soAdmin, async (req, res) => {
  const data = req.query.data || new Date().toISOString().split("T")[0];
  const { data: pedidos, error } = await supabase.from("pedidos")
    .select("total,status,tipo_cliente,modalidade,origem,itens_pedido(nome_snap,qty,preco_snap)")
    .gte("criado_em", data+"T00:00:00").lte("criado_em", data+"T23:59:59")
    .neq("status","cancelado");
  if (error) return res.status(500).json({ erro: error.message });
  const totalDia   = pedidos.reduce((s,p) => s+Number(p.total), 0);
  const qtdPedidos = pedidos.length;
  const ticketMedio = qtdPedidos ? totalDia/qtdPedidos : 0;
  const porOrigem  = { pdv: pedidos.filter(p=>p.origem==="pdv").length, app: pedidos.filter(p=>p.origem==="app").length };
  const contagem   = {};
  pedidos.forEach(p => p.itens_pedido.forEach(i => { contagem[i.nome_snap] = (contagem[i.nome_snap]||0)+i.qty; }));
  const maisVendidos = Object.entries(contagem).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([nome,qty])=>({nome,qty}));
  res.json({ data, totalDia, qtdPedidos, ticketMedio, porOrigem, maisVendidos });
});

app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PDV API rodando na porta ${PORT}`));
