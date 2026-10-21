-- Execute no SQL Editor do Supabase usado pelo backend Bento-PDV.
-- Insere somente quando ainda não existe produto com o mesmo nome.
-- Se a tabela cardapio não existir, configure primeiro o esquema original.
WITH itens(nome,categoria,preco,descricao) AS (VALUES
('X-Burger','Lanches',18.90,'Hambúrguer, queijo e pão'),
('X-Salada','Lanches',22.90,'Hambúrguer, queijo, alface e tomate'),
('X-Bacon','Lanches',27.90,'Hambúrguer, queijo e bacon'),
('X-Tudo','Lanches',32.90,'Hambúrguer, queijo, bacon, ovo e salada'),
('Combo X-Burger + Refrigerante Lata','Combos',24.90,'X-Burger e refrigerante lata 350 ml'),
('Combo X-Bacon + Refrigerante Lata','Combos',33.90,'X-Bacon e refrigerante lata 350 ml'),
('Combo Duplo + Refrigerante Lata','Combos',39.90,'Hambúrguer duplo e refrigerante lata 350 ml'),
('Refrigerante Cola Lata 350 ml','Bebidas',7.00,'Refrigerante em lata'),
('Refrigerante Guaraná Lata 350 ml','Bebidas',7.00,'Refrigerante em lata'),
('Refrigerante Laranja Lata 350 ml','Bebidas',7.00,'Refrigerante em lata')
)
INSERT INTO public.cardapio(nome,categoria,preco,descricao,ativo)
SELECT i.nome,i.categoria,i.preco,i.descricao,true FROM itens i
WHERE NOT EXISTS(SELECT 1 FROM public.cardapio c WHERE c.nome=i.nome);
