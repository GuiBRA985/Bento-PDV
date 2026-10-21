// Módulo adicional para server.js. Necessita tabela publico_pedidos do SQL incluso.
// IMPORTANTE: não confirma Pix por conta própria; somente integração Sicredi validada pode fazê-lo.
const crypto = require('crypto');
module.exports = function instalarRotasPublicas(app, supabase, auth) {
 const segredo=process.env.PUBLIC_ORDER_SECRET;
 if(!segredo) throw new Error('Configure PUBLIC_ORDER_SECRET (valor aleatório forte).');
 const assinar=id=>crypto.createHmac('sha256',segredo).update(id).digest('hex');
 const validar=(id,token)=>typeof token==='string'&&token.length===64&&crypto.timingSafeEqual(Buffer.from(assinar(id)),Buffer.from(token));
 app.post('/publico/pedidos',async(req,res)=>{
  try {
   const {nome,tipo,veiculo,gps,itens}=req.body||{};
   if(!['gps','estacionado'].includes(tipo)||!Array.isArray(itens)||!itens.length||itens.length>30)return res.status(400).json({erro:'Pedido inválido'});
   if(tipo==='gps'&&(!Number.isFinite(gps?.lat)||!Number.isFinite(gps?.lng)))return res.status(400).json({erro:'GPS obrigatório'});
   if(tipo==='estacionado'&&(!veiculo?.modelo||!veiculo?.cor||!veiculo?.placa))return res.status(400).json({erro:'Identifique o veículo'});
   const ids=[...new Set(itens.map(x=>x.id))];
   const {data:produtos,error:e}=await supabase.from('cardapio').select('id,nome,preco,ativo').in('id',ids).eq('ativo',true);
   if(e)throw e;
   if(produtos.length!==ids.length)return res.status(400).json({erro:'Produto inválido'});
   const byId=new Map(produtos.map(x=>[String(x.id),x]));
   let total=0;const linhas=[];
   for(const x of itens){const p=byId.get(String(x.id));if(!p||!Number.isInteger(x.qty)||x.qty<1||x.qty>50)return res.status(400).json({erro:'Quantidade inválida'});total+=Math.round(Number(p.preco)*100)*x.qty;linhas.push({id:p.id,qty:x.qty,nome:p.nome,preco:p.preco})}
   if(total<=0||total>10000000)return res.status(400).json({erro:'Valor inválido'});
   const {data,error}=await supabase.from('publico_pedidos').insert({nome:String(nome||'Cliente').slice(0,70),tipo,veiculo:tipo==='estacionado'?veiculo:null,lat:tipo==='gps'?gps.lat:null,lng:tipo==='gps'?gps.lng:null,itens:linhas,total_centavos:total,status:'aguardando_pix'}).select('id').single();
   if(error)throw error;
   res.status(201).json({id:data.id,token:assinar(data.id),status:'aguardando_pix',pixCopiaCola:null});
  }catch(e){res.status(500).json({erro:'Não foi possível registrar pedido'})}
 });
 app.post('/publico/pedidos/:id/gps',async(req,res)=>{
  const {id}=req.params,token=req.get('X-Pedido-Token')||'';
  if(!/^[0-9a-f-]{36}$/i.test(id)||!validar(id,token))return res.status(403).json({erro:'Não autorizado'});
  const {lat,lng}=req.body||{};
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({erro:'Coordenadas inválidas'});
  const {data,error}=await supabase.from('publico_pedidos').update({lat,lng,gps_atualizado_em:new Date().toISOString()}).eq('id',id).eq('tipo','gps').neq('status','entregue').select('id').maybeSingle();
  if(error)return res.status(500).json({erro:'Falha GPS'});
  res.json({ok:!!data});
 });
 app.get('/publico/equipe',auth,async(req,res)=>{
  if(!['admin','cozinha','garcom'].includes(req.usuario.perfil))return res.status(403).json({erro:'Sem permissão'});
  const {data,error}=await supabase.from('publico_pedidos').select('id,nome,tipo,veiculo,itens,status,lat,lng,gps_atualizado_em,criado_em').eq('status','pago').order('criado_em',{ascending:true});
  if(error)return res.status(500).json({erro:'Falha na consulta'});
  res.json(data);
 });
 // Pagamento: implementar OAuth2/mTLS Sicredi, txid e webhook autenticado, e
 // verificar liquidação junto ao banco antes de transicionar status para 'pago'.
 // Não há endpoint público que permita forçar o status 'pago'.
};
