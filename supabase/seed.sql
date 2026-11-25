-- Casos de exemplo do console do fornecedor (os mesmos das fixtures do modo demonstração).
-- Gerado a partir de src/lib/demo-api/fixtures.json. Idempotente: não sobrescreve casos já existentes.
insert into public.casos (id, cliente, segmento, uf, etapa, criado_em, economia_liquida_mensal_rs, oferta_id, risco_desistencia, motivo_risco, proxima_acao, alerta_beneficio, ciencia, aprovado_por, recibo_id) values
  ('caso-001', 'Padaria Trigo Bom (fictício)', 'Padaria', 'SP', 'simulado', '2026-11-03', 60, 'of-alfa', 'baixo', null, 'Enviar recibo de economia e convidar para a ciência de riscos', false, null, null, null),
  ('caso-002', 'Farmácia Saúde Já (fictício)', 'Farmácia', 'SP', 'ciencia_pendente', '2026-11-04', 97, 'of-beta', 'medio', 'Cliente comparou com oferta concorrente', 'Lembrar o cliente de concluir a ciência de riscos', false, null, null, null),
  ('caso-003', 'Lavanderia Bolha Azul (fictício)', 'Lavanderia', 'RJ', 'aguardando_aprovacao', '2026-11-05', 134, 'of-gama', 'alto', 'Sem resposta há 12 dias', 'Operador revisar e aprovar a migração', false, null, null, null),
  ('caso-004', 'Pizzaria Forno a Lenha (fictício)', 'Restaurante', 'MG', 'documentacao', '2026-11-06', 171, 'of-alfa', 'baixo', null, 'Coletar procuração e documentos da unidade', false, null, null, null),
  ('caso-005', 'Academia Corpo Ativo (fictício)', 'Academia', 'PR', 'formalizado', '2026-11-07', 208, 'of-beta', 'alto', 'Achou que o desconto era na conta inteira', 'Acompanhar pedido na distribuidora', false, null, null, null),
  ('caso-006', 'Marcenaria Pinho Real (fictício)', 'Pequena indústria', 'SC', 'ciencia_pendente', '2026-11-08', 245, 'of-gama', 'medio', 'Fatura subiu no último mês', 'Lembrar o cliente de concluir a ciência de riscos', false, null, null, null),
  ('caso-007', 'Açougue Boi Gordo (fictício)', 'Açougue', 'GO', 'aguardando_aprovacao', '2026-11-09', 282, 'of-alfa', 'baixo', null, 'Operador revisar e aprovar a migração', false, null, null, null),
  ('caso-008', 'Sorveteria Polar (fictício)', 'Sorveteria', 'BA', 'documentacao', '2026-11-10', 319, 'of-beta', 'medio', 'Cliente comparou com oferta concorrente', 'Coletar procuração e documentos da unidade', true, null, null, null),
  ('caso-009', 'Gráfica Tinta Viva (fictício)', 'Gráfica', 'RS', 'formalizado', '2026-11-11', 356, 'of-gama', 'alto', 'Sem resposta há 12 dias', 'Acompanhar pedido na distribuidora', false, null, null, null),
  ('caso-010', 'Hotel Pousada Sol (fictício)', 'Pousada', 'CE', 'simulado', '2026-11-12', 93, 'of-alfa', 'baixo', null, 'Enviar recibo de economia e convidar para a ciência de riscos', false, null, null, null),
  ('caso-011', 'Mercado Bom Preço (fictício)', 'Supermercado', 'PE', 'escalado_humano', '2026-11-13', 130, 'of-beta', 'alto', 'Achou que o desconto era na conta inteira', 'Atendente humano retomar o caso (pergunta jurídica sobre multa)', false, null, null, null),
  ('caso-012', 'Clínica Sorriso (fictício)', 'Clínica', 'SP', 'aguardando_aprovacao', '2026-11-14', 167, 'of-gama', 'medio', 'Fatura subiu no último mês', 'Operador revisar e aprovar a migração', false, null, null, null),
  ('caso-013', 'Confecção Fio de Ouro (fictício)', 'Pequena indústria', 'SC', 'documentacao', '2026-11-15', 204, 'of-alfa', 'baixo', null, 'Coletar procuração e documentos da unidade', false, null, null, null),
  ('caso-014', 'Lanchonete Esquina (fictício)', 'Lanchonete', 'DF', 'ciencia_pendente', '2026-11-16', 241, 'of-beta', 'medio', 'Cliente comparou com oferta concorrente', 'Lembrar o cliente de concluir a ciência de riscos', false, null, null, null),
  ('caso-015', 'Pet Shop Patas (fictício)', 'Pet shop', 'MG', 'simulado', '2026-11-17', 278, 'of-gama', 'alto', 'Sem resposta há 12 dias', 'Enviar recibo de economia e convidar para a ciência de riscos', true, null, null, null),
  ('caso-016', 'Serralheria Aço Forte (fictício)', 'Pequena indústria', 'ES', 'formalizado', '2026-11-18', 315, 'of-alfa', 'baixo', null, 'Acompanhar pedido na distribuidora', false, null, null, null),
  ('caso-017', 'Restaurante Sabor Caseiro (fictício)', 'Restaurante', 'RJ', 'aguardando_aprovacao', '2026-11-19', 352, 'of-beta', 'alto', 'Achou que o desconto era na conta inteira', 'Operador revisar e aprovar a migração', false, null, null, null),
  ('caso-018', 'Auto Peças Avenida (fictício)', 'Comércio', 'PR', 'documentacao', '2026-11-20', 89, 'of-gama', 'medio', 'Fatura subiu no último mês', 'Coletar procuração e documentos da unidade', false, null, null, null)
on conflict (id) do nothing;

-- Próximo caso criado pelo app continua a numeração (caso-019).
select setval('public.casos_numero_seq', greatest((select coalesce(max(substring(id from 6)::int), 0) from public.casos where id ~ '^caso-[0-9]+$'), 18));
