
/* Bento-PDV: complemento da página inicial existente, sem alterar seu layout. */
(()=>{
'use strict';
const endpoint='https://cyrugoukyhitaiamwgzu.supabase.co/functions/v1/';
async function call(name,body){const r=await fetch(endpoint+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.erro||'Erro');return d}
function el(id){return document.getElementById(id)}
async function carregarMenu(){
try{const d=await call('pdv-admin',{action:'cardapio_publico'});if(!d.items?.length)throw Error('Cardápio vazio');
catalogo=d.items;demo=false;desenhar();resumo();el('pedir').disabled=false;
const a=document.getElementById('aviso-migracao');if(a)a.remove();
}catch(e){el('msg').textContent='Não foi possível carregar o cardápio: '+e.message;setTimeout(carregarMenu,10000)}
}
function setup(){
const pedir=el('pedir');if(!pedir)return;
pedir.textContent='Pagamento teste';
const label=document.createElement('label');label.textContent='Retirar em: ';label.style.display='block';label.style.margin='12px 0';
const select=document.createElement('select');select.id='minutos-teste';select.style.cssText='padding:10px;border-radius:8px;margin-left:8px';
for(const n of [15,30,45]){const opt=document.createElement('option');opt.value=n;opt.textContent=n+' minutos';select.append(opt)}label.append(select);pedir.before(label);
const aviso=document.createElement('p');aviso.id='aviso-migracao';aviso.textContent='🧪 AMBIENTE DE TESTE — nenhum Pix será cobrado.';aviso.style.color='#ffc15a';pedir.after(aviso);
pedir.addEventListener('click',async e=>{
e.stopImmediatePropagation();e.preventDefault();
if(!modo)return el('msg').textContent='Escolha GPS ou Estacionado.';
const nome=el('nome').value.trim();if(!nome)return el('msg').textContent='Informe nome ou apelido.';
const itens=Object.entries(carrinho).filter(([,q])=>q>0).map(([id,qty])=>({id:Number(id),qty}));
if(!itens.length)return el('msg').textContent='Escolha pelo menos um produto.';
if(modo==='gps'&&!gps)return el('msg').textContent='Ative o GPS.';
const veiculo={modelo:el('modelo').value.trim(),cor:el('cor').value.trim(),placa:el('placa').value.trim()};
if(modo==='estacionado'&&(!veiculo.modelo||!veiculo.cor||!veiculo.placa))return el('msg').textContent='Informe modelo, cor e placa.';
pedir.disabled=true;
try{const d=await call('pdv-pedidos',{action:'criar_teste',nome,tipo:modo,veiculo,gps,itens,minutos:Number(select.value)});
pedido=d.id;access=d.token;window.bentoPedidoTeste={id:pedido,token:access};
el('msg').textContent='🧪 Pedido TESTE #'+pedido+' confirmado. Sem cobrança Pix. Retirada em '+select.value+' minutos.';
el('cobranca').textContent='Pagamento simulado — não foi realizado Pix.';
carrinho={};resumo();el('chegada').classList.toggle('hidden',modo!=='gps');
}catch(err){el('msg').textContent=err.message}finally{pedir.disabled=false}
},true);
el('chegueibtn').addEventListener('click',async e=>{
e.stopImmediatePropagation();e.preventDefault();if(!window.bentoPedidoTeste)return;
try{await call('pdv-pedidos',{action:'cheguei',...window.bentoPedidoTeste});el('chegada').classList.add('hidden');el('chegueistatus').textContent='Chegada registrada.'}catch(err){el('chegueistatus').textContent=err.message}
},true);
carregarMenu();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
