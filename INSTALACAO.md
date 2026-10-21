# Bento PDV — pacote inicial da nova experiência pública

## Arquivos
- `index.html`: novo cardápio público com dois modos (GPS e estacionado).
- `login/index.html`: entrada da equipe, redireciona para `/painel.html`.
- `publico-routes.js`: API de pedidos anônimos, cálculo de preço no servidor e atualização GPS.
- `supabase.sql`: tabela isolada para pedidos públicos.

## Instalação no repositório
1. **Faça backup** do `index.html` atual, renomeando-o para `painel.html` (preserva login e painel atuais).
2. Coloque os arquivos deste pacote no repositório, mantendo `login/index.html` dentro da pasta `login`.
3. No Supabase, execute `supabase.sql` no SQL Editor.
4. No Render, configure `PUBLIC_ORDER_SECRET` com uma string aleatória longa e segura (não publique no GitHub).
5. Em `server.js`, logo depois de `function auth(...)` (após o fechamento da função), adicione:
   `require('./publico-routes')(app, supabase, auth);`
6. Faça o deploy do frontend no GitHub Pages e do backend no Render.

## Limitações importantes
- **Pix Sicredi NÃO está integrado**. Não existe geração de cobrança real nem confirmação automática até obtenção das credenciais e implementação segura de OAuth2/mTLS e webhooks validados.
- Por segurança, pedidos públicos ficam em `aguardando_pix`; não são liberados para a cozinha.
- O painel atual (`painel.html`) ainda não mostra a nova tabela `publico_pedidos`. A rota protegida `/publico/equipe` está pronta para a próxima etapa.
- Distância e tempo de chegada exigem coordenadas da lanchonete e serviço de rotas; não estão calculados neste pacote.
- A localização só atualiza enquanto o navegador permitir e a página estiver ativa.
- Para produção, adicionar proteção contra abuso/rate limiting, validação mais estrita e gestão de privacidade/retenção do GPS.
- A rota `/login/` exige que o hosting sirva diretórios com `index.html` (GitHub Pages suporta).
- Teste primeiro em branch ou ambiente de homologação.

## Cardápio de demonstração
- `index.html` contém 10 produtos locais de exemplo. Se a API estiver inacessível ou vazia, mostra esses produtos, mas bloqueia pedidos e Pix.
- `cardapio_demo.sql` cadastra os mesmos produtos no Supabase sem duplicar nomes. Execute no SQL Editor do projeto correto.
- Se ainda aparecer erro após executar o SQL, confira se `https://bento-pdv.onrender.com/cardapio` responde com uma lista JSON e se o Render está online.

## GPS e botão Cheguei
- O aviso aparece ao solicitar GPS. O navegador pode suspender GPS em segundo plano.
- O botão CHEGUEI só aparece após o backend retornar estado `pago`, `preparo` ou `pronto` para pedido GPS.
- O botão registra `chegou_em` no Supabase. A Cozinha e o Garçom deverão exibir esse campo em seus painéis (a interface deles ainda não foi implementada neste pacote).
- Não há como simular confirmação de Pix em produção: o pagamento Sicredi ainda exige integração real.
- O botão é ocultado quando o pedido é entregue ou cancelado.

## Menu expansível
As categorias Lanches, Combos e Bebidas agora funcionam como acordeão: somente uma aberta por vez; clicar novamente fecha. A alteração é apenas no `index.html`.

## Nova tela de escolha (GPS / Estacionado)
- Dois botões grandes; GPS solicita permissão e abre cardápio somente após obter posição.
- Estacionado mostra carro, cor e final da placa; o botão Ver cardápio valida os campos.
- O carrinho é salvo em localStorage antes de pagar e só é apagado quando a API reporta status pago/preparo/pronto/entregue.
- ATENÇÃO: o backend deste pacote ainda grava uma intenção `aguardando_pix` na tabela `publico_pedidos` antes do pagamento. Para a exigência de nenhuma persistência antes da confirmação, é preciso refatorar o backend e criar armazenamento temporário da cobrança no provedor Pix. O pacote não afirma cumprir essa exigência.
- O pagamento real Sicredi segue pendente.
