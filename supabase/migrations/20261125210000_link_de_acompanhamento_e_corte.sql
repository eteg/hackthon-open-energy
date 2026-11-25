-- Link de acompanhamento do consumidor e corte de escopo do hackathon.
--
-- acompanhamento_id: segredo do link /caso/<id>. Gerado pelo servidor (22 caracteres aleatórios) ao criar o caso.
-- Nunca é selecionado nas listas do console: só na criação (devolvido a quem criou) e na consulta pública por ele.
alter table public.casos add column if not exists acompanhamento_id text unique check (acompanhamento_id is null or length(acompanhamento_id) >= 16);

-- Idempotente: pode ser colada no SQL Editor do painel e depois registrada/aplicada de novo pelo CLI sem falhar.
-- O cadastro da comercializadora (/varejista/cadastro) saiu do escopo.
drop table if exists public.varejista;
