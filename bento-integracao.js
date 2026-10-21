/* Bento PDV — integração de teste sem Render. Substitui bento-integracao.js */
(()=>{
'use strict';
const BASE='https://cyrugoukyhitaiamwgzu.supabase.co/functions/v1/';
const $=id=>document.getElementById(id);
async function api(funcao,body){
 const r=await fetch(BASE+funcao,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.erro||'Falha na comunicação com Supabase ('+r.status+')');
 return data;
}
let catalogoPronto=false,ocupado=false;
function aviso(msg){$('msg').textContent=msg}
async function cardapio(){
 try{
  const d=await api('pdv-admin',{action:'cardapio_publico'});
  if(!Array.isArray(d.items)||!d.items.length)throw Error('Nenhum produto ativo');
  catalogo=d.items;demo=false;catalogoPronto=true;
  // O código antigo pode ter inserido produtos demonstrativos. Recriar usando IDs reais.
  carrinho={};desenhar();resumo();
  $('pedir').disabled=false;
  document.querySelectorAll('#produtos p').forEach(x=>{if(x.textContent.includes('Modo demonstração:'))x.remove()});
  aviso('🧪 Pagamento teste disponível. Nenhum Pix será cobrado.');
 }catch(e){
  catalogoPronto=false;$('pedir').disabled=true;
  aviso('Cardápio indisponível no Supabase: '+e.message);
 }
}
function iniciar(){
 const botao=$('pedir');
 if(!botao)return;
 botao.textContent='Pagamento teste';
 botao.type='button';
 const lbl=document.createElement('label');
 lbl.textContent='Retirada em ';
 lbl.style.cssText='display:block;margin:12px 0';
 const select=document.createElement('select');
 select.style.cssText='margin-left:8px;padding:10px;border-radius:8px';
 for(const n of [15,30,45]){const o=document.createElement('option');o.value=n;o.textContent=n+' minutos';select.append(o)}
 lbl.append(select);botao.before(lbl);
 const alerta=document.createElement('p');
 alerta.textContent='🧪 MODO TESTE — pagamento simulado, sem transferência de dinheiro.';
 alerta.style.color='#ffcf78';botao.after(alerta);
 // O script legado desativa o botão quando Render falha.
 // O observer só o reabilita após confirmar que o catálogo do Supabase carregou.
 new MutationObserver(()=>{
  if(catalogoPronto&&!ocupado&&botao.disabled)botao.disabled=false;
 }).observe(botao,{attributes:true,attributeFilter:['disabled']});
 // Captura antes do onclick legado, impedindo qualquer chamada de cobrança ao Render.
 botao.addEventListener('click',async ev=>{
  ev.preventDefault();ev.stopImmediatePropagation();
  if(ocupado)return;
  if(!catalogoPronto)return aviso('Aguarde o carregamento do cardápio do Supabase.');
  if(!modo)return aviso('Escolha GPS ou Estacionado.');
  const nome=$('nome').value.trim();
  if(!nome)return aviso('Informe seu nome ou apelido.');
  const itens=Object.entries(carrinho).filter(([,q])=>q>0).map(([id,qty])=>({id:Number(id),qty:Number(qty)}));
  if(!itens.length)return aviso('Adicione pelo menos um produto.');
  if(modo==='gps'&&!gps)return aviso('Autorize a localização GPS.');
  const veiculo={modelo:$('modelo').value.trim(),cor:$('cor').value.trim(),placa:$('placa').value.trim()};
  if(modo==='estacionado'&&(!veiculo.modelo||!veiculo.cor||!veiculo.placa))return aviso('Informe modelo, cor e final da placa.');
  ocupado=true;botao.disabled=true;aviso('Registrando pedido teste...');
  try{
   const d=await api('pdv-pedidos',{action:'criar_teste',nome,tipo:modo,veiculo,gps,itens,minutos:Number(select.value)});
   pedido=d.id;access=d.token;
   window.bentoPedidoTeste={id:d.id,token:d.token};
   carrinho={};resumo();
   aviso('🧪 Pedido #'+d.id+' confirmado como TESTE. Retirada em '+select.value+' minutos.');
   $('cobranca').textContent='Pagamento simulado com sucesso. Nenhum Pix foi cobrado.';
   $('chegada').classList.toggle('hidden',modo!=='gps');
  }catch(e){aviso('Não foi possível registrar o pedido: '+e.message)}
  finally{ocupado=false;botao.disabled=false}
 },true);
 $('chegueibtn').addEventListener('click',async ev=>{
  ev.preventDefault();ev.stopImmediatePropagation();
  if(!window.bentoPedidoTeste)return;
  try{await api('pdv-pedidos',{action:'cheguei',...window.bentoPedidoTeste});$('chegada').classList.add('hidden');$('chegueistatus').textContent='Chegada registrada na cozinha.'}
  catch(e){$('chegueistatus').textContent=e.message}
 },true);
 // O script legado tenta buscar o Render em paralelo; aguardamos a falha
 // antes de aplicar definitivamente o catálogo real.
 setTimeout(cardapio,1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
