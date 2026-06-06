import { useState, useEffect } from "react";

const CARDAPIO = [
  { id: 1, categoria: "🍔 Lanches", nome: "X-Burguer", preco: 12.0 },
  { id: 2, categoria: "🍔 Lanches", nome: "X-Salada", preco: 14.0 },
  { id: 3, categoria: "🍔 Lanches", nome: "X-Bacon", preco: 16.0 },
  { id: 4, categoria: "🍔 Lanches", nome: "X-Tudo", preco: 18.0 },
  { id: 5, categoria: "🌭 Cachorros-quentes", nome: "Hot Dog Simples", preco: 8.0 },
  { id: 6, categoria: "🌭 Cachorros-quentes", nome: "Hot Dog Completo", preco: 11.0 },
  { id: 7, categoria: "🍟 Porções", nome: "Fritas Pequena", preco: 9.0 },
  { id: 8, categoria: "🍟 Porções", nome: "Fritas Grande", preco: 14.0 },
  { id: 9, categoria: "🍟 Porções", nome: "Nuggets (8un)", preco: 12.0 },
  { id: 10, categoria: "🥤 Bebidas", nome: "Refrigerante Lata", preco: 5.0 },
  { id: 11, categoria: "🥤 Bebidas", nome: "Suco Natural", preco: 7.0 },
  { id: 12, categoria: "🥤 Bebidas", nome: "Água", preco: 3.0 },
  { id: 13, categoria: "🥤 Bebidas", nome: "Café", preco: 4.0 },
  { id: 14, categoria: "🍨 Sobremesas", nome: "Sorvete Casquinha", preco: 5.0 },
  { id: 15, categoria: "🍨 Sobremesas", nome: "Açaí 300ml", preco: 13.0 },
];

const CORES_CARRO = ["Branco","Prata","Preto","Vermelho","Azul","Cinza","Verde","Amarelo","Laranja","Marrom","Bege","Vinho","Dourado","Rosa","Roxo"];

const categorias = [...new Set(CARDAPIO.map((i) => i.categoria))];

const fmt = (v) => v.toFixed(2).replace(".", ",");

let pedidoIdCounter = 1;

export default function PDV() {
  const [tela, setTela] = useState("novo"); // novo | pedido | painel
  const [tipoCliente, setTipoCliente] = useState("mesa");
  const [nomeMesa, setNomeMesa] = useState("");
  const [carro, setCarro] = useState({ cor: "", placa: "" });
  const [categoriaAtiva, setCategoriaAtiva] = useState(categorias[0]);
  const [carrinho, setCarrinho] = useState([]);
  const [obs, setObs] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [pedidoAtivo, setPedidoAtivo] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const clienteLabel = () => {
    if (tipoCliente === "mesa") return nomeMesa.trim() || "—";
    const p = carro.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return carro.cor && p ? `${carro.cor} · ${p}` : "—";
  };

  const addItem = (item) => {
    setCarrinho((prev) => {
      const ex = prev.find((x) => x.id === item.id);
      if (ex) return prev.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeItem = (id) => {
    setCarrinho((prev) => {
      const ex = prev.find((x) => x.id === id);
      if (!ex) return prev;
      if (ex.qty === 1) return prev.filter((x) => x.id !== id);
      return prev.map((x) => x.id === id ? { ...x, qty: x.qty - 1 } : x);
    });
  };

  const total = carrinho.reduce((s, x) => s + x.preco * x.qty, 0);

  const clienteValido = () => {
    if (tipoCliente === "mesa") return nomeMesa.trim().length > 0;
    const p = carro.placa.replace(/[^A-Za-z0-9]/g, "");
    return carro.cor && p.length >= 7;
  };

  const confirmarPedido = () => {
    if (!clienteValido()) { showToast("Preencha os dados do cliente!"); return; }
    if (carrinho.length === 0) { showToast("Carrinho vazio!"); return; }
    const novoPedido = {
      id: pedidoIdCounter++,
      tipo: tipoCliente,
      cliente: clienteLabel(),
      itens: [...carrinho],
      obs,
      total,
      status: "aberto",
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    setPedidos((prev) => [novoPedido, ...prev]);
    setCarrinho([]);
    setNomeMesa("");
    setCarro({ cor: "", placa: "" });
    setObs("");
    showToast(`✅ Pedido #${novoPedido.id} registrado!`);
    setTela("painel");
  };

  const mudarStatus = (id, status) => {
    setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  };

  const qtyNoCarrinho = (id) => carrinho.find((x) => x.id === id)?.qty || 0;

  const statusCor = { aberto: "#f59e0b", preparo: "#3b82f6", pronto: "#10b981", entregue: "#6b7280" };
  const statusLabel = { aberto: "Aberto", preparo: "Em preparo", pronto: "Pronto!", entregue: "Entregue" };

  return (
    <div style={{ fontFamily: "'Syne', sans-serif", minHeight: "100vh", background: "#0f0f0f", color: "#f5f0e8" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{ background: "#1a1a1a", borderBottom: "2px solid #e8a020", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍔</span>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1, color: "#e8a020" }}>LANCHONETE PDV</span>
        </div>
        <nav style={{ display: "flex", gap: 6 }}>
          {[["novo","＋ Pedido"],["painel","📋 Painel"]].map(([k,l]) => (
            <button key={k} onClick={() => setTela(k)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: tela === k ? "#e8a020" : "#2a2a2a", color: tela === k ? "#0f0f0f" : "#aaa", transition: "all .2s" }}>{l}</button>
          ))}
        </nav>
      </header>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: 68, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", border: "1px solid #e8a020", color: "#f5f0e8", padding: "10px 22px", borderRadius: 8, fontWeight: 700, zIndex: 999, fontSize: 14, boxShadow: "0 4px 20px #0006" }}>{toast}</div>
      )}

      {/* TELA: NOVO PEDIDO */}
      {tela === "novo" && (
        <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>

          {/* ESQUERDA: CARDÁPIO */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #2a2a2a" }}>
            {/* Categorias */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2a2a2a", overflowX: "auto" }}>
              {categorias.map((c) => (
                <button key={c} onClick={() => setCategoriaAtiva(c)} style={{ padding: "12px 16px", background: categoriaAtiva === c ? "#e8a020" : "transparent", color: categoriaAtiva === c ? "#0f0f0f" : "#888", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", borderBottom: categoriaAtiva === c ? "none" : "2px solid transparent", transition: "all .15s" }}>{c}</button>
              ))}
            </div>

            {/* Itens */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, alignContent: "start" }}>
              {CARDAPIO.filter((i) => i.categoria === categoriaAtiva).map((item) => {
                const qty = qtyNoCarrinho(item.id);
                return (
                  <div key={item.id} onClick={() => addItem(item)} style={{ background: qty > 0 ? "#1e1a0f" : "#1a1a1a", border: `1.5px solid ${qty > 0 ? "#e8a020" : "#2a2a2a"}`, borderRadius: 10, padding: "14px 12px", cursor: "pointer", transition: "all .15s", position: "relative" }}>
                    {qty > 0 && <span style={{ position: "absolute", top: 8, right: 8, background: "#e8a020", color: "#0f0f0f", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{qty}</span>}
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.nome}</div>
                    <div style={{ color: "#e8a020", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 15 }}>R$ {fmt(item.preco)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DIREITA: CLIENTE + CARRINHO */}
          <div style={{ width: 320, display: "flex", flexDirection: "column", background: "#141414" }}>
            {/* Tipo de cliente */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>CLIENTE</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[["mesa","🍽 Mesa"],["carro","🚗 Carro"]].map(([k,l]) => (
                  <button key={k} onClick={() => setTipoCliente(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: tipoCliente === k ? "#e8a020" : "#2a2a2a", color: tipoCliente === k ? "#0f0f0f" : "#aaa" }}>{l}</button>
                ))}
              </div>

              {tipoCliente === "mesa" ? (
                <input value={nomeMesa} onChange={(e) => setNomeMesa(e.target.value)} placeholder="Nome / Mesa ex: João, Mesa 3..." style={{ width: "100%", background: "#1a1a1a", border: "1.5px solid #333", borderRadius: 7, color: "#f5f0e8", padding: "9px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <select value={carro.cor} onChange={(e) => setCarro({ ...carro, cor: e.target.value })} style={{ background: "#1a1a1a", border: "1.5px solid #333", borderRadius: 7, color: carro.cor ? "#f5f0e8" : "#666", padding: "9px 12px", fontSize: 14, fontFamily: "inherit" }}>
                    <option value="">Cor do carro...</option>
                    {CORES_CARRO.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={carro.placa} onChange={(e) => setCarro({ ...carro, placa: e.target.value.toUpperCase() })} placeholder="Placa ex: ABC1D23" maxLength={8} style={{ background: "#1a1a1a", border: "1.5px solid #333", borderRadius: 7, color: "#f5f0e8", padding: "9px 12px", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 2 }} />
                </div>
              )}
            </div>

            {/* Carrinho */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>ITENS DO PEDIDO</div>
              {carrinho.length === 0 ? (
                <div style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 30 }}>Toque nos itens para adicionar</div>
              ) : carrinho.map((x) => (
                <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, fontSize: 13 }}>{x.nome}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => removeItem(x.id)} style={{ width: 24, height: 24, borderRadius: "50%", background: "#2a2a2a", border: "none", color: "#f5f0e8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ width: 20, textAlign: "center", fontWeight: 700, fontSize: 14 }}>{x.qty}</span>
                    <button onClick={() => addItem(x)} style={{ width: 24, height: 24, borderRadius: "50%", background: "#2a2a2a", border: "none", color: "#f5f0e8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#e8a020", minWidth: 60, textAlign: "right" }}>R$ {fmt(x.preco * x.qty)}</div>
                </div>
              ))}
            </div>

            {/* Obs + Total + Confirmar */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2a2a" }}>
              <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações (sem cebola, bem passado...)" rows={2} style={{ width: "100%", background: "#1a1a1a", border: "1.5px solid #333", borderRadius: 7, color: "#f5f0e8", padding: "9px 12px", fontSize: 13, fontFamily: "inherit", resize: "none", boxSizing: "border-box", marginBottom: 12 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "#888", fontWeight: 700 }}>TOTAL</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: "#e8a020" }}>R$ {fmt(total)}</span>
              </div>
              <button onClick={confirmarPedido} style={{ width: "100%", padding: "13px 0", background: "#e8a020", color: "#0f0f0f", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1 }}>REGISTRAR PEDIDO</button>
            </div>
          </div>
        </div>
      )}

      {/* TELA: PAINEL DE PEDIDOS */}
      {tela === "painel" && (
        <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#e8a020" }}>📋 PEDIDOS EM ABERTO</h2>
            <span style={{ fontSize: 13, color: "#666" }}>{pedidos.filter(p => p.status !== "entregue").length} ativos</span>
          </div>

          {pedidos.length === 0 && (
            <div style={{ textAlign: "center", color: "#444", marginTop: 60, fontSize: 15 }}>Nenhum pedido ainda.<br />Crie um novo pedido para começar.</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {pedidos.map((p) => (
              <div key={p.id} style={{ background: "#1a1a1a", border: `1.5px solid ${statusCor[p.status]}40`, borderRadius: 12, padding: 16, opacity: p.status === "entregue" ? 0.5 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#f5f0e8" }}>
                      {p.tipo === "carro" ? "🚗" : "🍽"} {p.cliente}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", fontFamily: "'IBM Plex Mono', monospace" }}>#{p.id} · {p.hora}</div>
                  </div>
                  <span style={{ background: `${statusCor[p.status]}22`, color: statusCor[p.status], border: `1px solid ${statusCor[p.status]}`, borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>{statusLabel[p.status]}</span>
                </div>

                <div style={{ marginBottom: 10, fontSize: 13 }}>
                  {p.itens.map((x) => (
                    <div key={x.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #222" }}>
                      <span>{x.qty}× {x.nome}</span>
                      <span style={{ color: "#e8a020", fontFamily: "'IBM Plex Mono', monospace" }}>R$ {fmt(x.preco * x.qty)}</span>
                    </div>
                  ))}
                </div>

                {p.obs && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 10, background: "#111", padding: "6px 10px", borderRadius: 6 }}>📝 {p.obs}</div>}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "#888", fontWeight: 700 }}>TOTAL</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#e8a020" }}>R$ {fmt(p.total)}</span>
                </div>

                {/* Botões de status */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["aberto","preparo","pronto","entregue"].map((s) => (
                    <button key={s} onClick={() => mudarStatus(p.id, s)} style={{ flex: 1, padding: "7px 4px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 11, background: p.status === s ? statusCor[s] : "#2a2a2a", color: p.status === s ? "#0f0f0f" : "#777", transition: "all .15s", minWidth: 60 }}>{statusLabel[s]}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
