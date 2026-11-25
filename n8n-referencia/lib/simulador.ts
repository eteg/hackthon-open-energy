/**
 * Simulador honesto — 100% determinístico. O modelo de IA NUNCA calcula valores:
 * ele recebe o resultado daqui e só explica.
 *
 * Regra de ouro: o desconto incide só sobre a parcela de energia (TE),
 * nunca sobre a conta inteira. 25% na energia ≈ 8,1% numa conta com 32,4% de energia.
 */
import { createHash } from "node:crypto";
import type { Alerta, Faixa, Fatura, Oferta, Regras, ResultadoOferta, Simulacao } from "./types";

const r2 = (v: number) => Math.round(v * 100) / 100;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pctTxt = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function subtrairDias(isoData: string, dias: number): string {
  const d = new Date(`${isoData}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/** Desconto médio efetivo sobre a energia no horizonte (em %), para um cenário de tarifa cativa. */
function descontoEfetivoPct(oferta: Oferta, fatura: Fatura, variacaoCativaPct: number, horizonte: number): number {
  switch (oferta.tipo) {
    case "desconto_percentual":
      return oferta.desconto_energia_pct;
    case "indexado": {
      const m = Math.min(oferta.meses_iniciais, horizonte);
      return (m * oferta.desconto_inicial_pct + (horizonte - m) * oferta.desconto_apos_pct) / horizonte;
    }
    case "preco_fixo": {
      const energiaCativa = fatura.componentes.energia_te_rs * (1 + variacaoCativaPct / 100);
      if (energiaCativa === 0) return 0;
      const energiaLivre = fatura.consumo_kwh * oferta.preco_energia_rs_kwh;
      return ((energiaCativa - energiaLivre) / energiaCativa) * 100; // pode ser negativo
    }
  }
}

function simularOferta(fatura: Fatura, oferta: Oferta, regras: Regras, perdaBeneficio: number): ResultadoOferta {
  const { cenarios, horizonte_meses, economia_minima_mensal_rs } = regras.premissas_produto;
  const energia = fatura.componentes.energia_te_rs;

  const bruta = {} as Faixa;
  const liquida = {} as Faixa;
  for (const nome of ["pessimista", "base", "otimista"] as const) {
    const variacao = cenarios[nome];
    const energiaCenario = energia * (1 + variacao / 100);
    const desc = descontoEfetivoPct(oferta, fatura, variacao, horizonte_meses);
    bruta[nome] = r2((energiaCenario * desc) / 100);
    liquida[nome] = r2(bruta[nome] - oferta.taxa_mensal_rs - perdaBeneficio);
  }

  const descBase = descontoEfetivoPct(oferta, fatura, cenarios.base, horizonte_meses);
  const pctConta = fatura.total_rs > 0 ? r2((liquida.base / fatura.total_rs) * 100) : 0;
  const compensa = liquida.base >= economia_minima_mensal_rs && liquida.pessimista > 0;
  const motivo = compensa
    ? null
    : liquida.base < 0
      ? "Economia líquida negativa: taxa ou benefício perdido maior que o desconto."
      : liquida.pessimista <= 0
        ? "No cenário pessimista a troca dá prejuízo."
        : `Abaixo da economia mínima de ${brl(economia_minima_mensal_rs)}/mês (premissa do produto).`;

  const memoria = [
    `Energia (TE) na fatura: ${brl(energia)} de ${brl(fatura.total_rs)} (${pctTxt((energia / fatura.total_rs) * 100)} da conta).`,
    oferta.tipo === "preco_fixo"
      ? `Preço fixo: ${fatura.consumo_kwh} kWh × R$ ${oferta.preco_energia_rs_kwh.toFixed(4)} = ${brl(fatura.consumo_kwh * oferta.preco_energia_rs_kwh)} → desconto equivalente de ${pctTxt(descBase)} na energia.`
      : `Desconto médio sobre a energia em ${horizonte_meses} meses: ${pctTxt(descBase)}.`,
    `Economia bruta (base): ${brl(energia)} × ${pctTxt(descBase)} = ${brl(bruta.base)}/mês.`,
    oferta.taxa_mensal_rs > 0 ? `Taxa mensal da oferta: − ${brl(oferta.taxa_mensal_rs)}.` : "Sem taxa mensal.",
    perdaBeneficio > 0 ? `Benefício perdido ao migrar: − ${brl(perdaBeneficio)}/mês.` : "Sem benefício a perder.",
    `Economia líquida (base): ${brl(liquida.base)}/mês = ${pctTxt(pctConta)} da conta inteira.`,
    `Faixa (tarifa cativa ${cenarios.pessimista}% a +${cenarios.otimista}%): ${brl(liquida.pessimista)} a ${brl(liquida.otimista)}/mês.`,
  ];

  return {
    oferta_id: oferta.id,
    nome: oferta.nome,
    varejista: oferta.varejista,
    tipo: oferta.tipo,
    prazo_meses: oferta.prazo_meses,
    reajuste: oferta.reajuste,
    multa: oferta.multa,
    taxa_mensal_rs: oferta.taxa_mensal_rs,
    desconto_efetivo_energia_pct: r2(descBase),
    economia_bruta_mensal_rs: bruta,
    economia_liquida_mensal_rs: liquida,
    economia_pct_conta_base: pctConta,
    economia_liquida_horizonte_rs: r2(liquida.base * horizonte_meses),
    compensa,
    motivo_nao_compensa: motivo,
    memoria_calculo: memoria,
  };
}

export function simular(fatura: Fatura, ofertas: Oferta[], regras: Regras): Simulacao {
  const alertas: Alerta[] = [];
  const grupoB = fatura.tensao_v < regras.grupo_b_tensao_max_v;
  const dataAbertura = regras.abertura_por_classe[fatura.classe];
  const prazoFormalizacao = subtrairDias(dataAbertura, regras.antecedencia_migracao_dias);

  if (!grupoB) {
    alertas.push({ tipo: "elegibilidade", severidade: "alta", mensagem: "Unidade fora do Grupo B (≥ 2,3 kV): fora do escopo deste fluxo.", fonte: regras.fonte_abertura });
  }
  if (fatura.classe === "residencial" || fatura.classe === "rural") {
    alertas.push({ tipo: "elegibilidade", severidade: "media", mensagem: `Classe ${fatura.classe}: migração só a partir de ${dataAbertura.split("-").reverse().join("/")}.`, fonte: regras.fonte_abertura });
  }

  const perdaBeneficio = fatura.beneficios.length > 0 ? fatura.componentes.desconto_beneficio_rs : 0;
  for (const b of fatura.beneficios) {
    alertas.push({
      tipo: "perda_beneficio",
      severidade: "alta",
      mensagem: `${regras.beneficios_nao_aplicaveis[b]} deixa de valer no mercado livre. Exige ciência prévia do cliente antes da migração.`,
      fonte: regras.fonte_beneficios,
    });
  }

  const resultados = grupoB ? ofertas.map((o) => simularOferta(fatura, o, regras, perdaBeneficio)) : [];
  const elegiveis = resultados.filter((r) => r.compensa);
  const melhor = elegiveis.sort((a, b) => b.economia_liquida_mensal_rs.base - a.economia_liquida_mensal_rs.base)[0] ?? null;

  const base = {
    versao_regras: regras.versao,
    fatura_id: fatura.id,
    elegibilidade: { grupo_b: grupoB, data_abertura: dataAbertura, prazo_formalizacao: prazoFormalizacao, fonte: regras.fonte_abertura },
    parcela_energia_pct: fatura.total_rs > 0 ? r2((fatura.componentes.energia_te_rs / fatura.total_rs) * 100) : 0,
    perda_beneficio_mensal_rs: perdaBeneficio,
    ofertas: resultados.sort((a, b) => b.economia_liquida_mensal_rs.base - a.economia_liquida_mensal_rs.base),
    melhor_oferta_id: melhor?.oferta_id ?? null,
    veredito: (!grupoB ? "fora_do_escopo" : melhor ? "compensa" : "nao_compensa") as Simulacao["veredito"],
    alertas,
    premissas: regras.premissas_produto.textos,
  };

  // Recibo auditável: mesmo input + mesma versão de regras ⇒ mesmo recibo_id.
  const recibo_id = createHash("sha256").update(JSON.stringify({ fatura, ofertas, versao: regras.versao })).digest("hex").slice(0, 16);
  return { recibo_id, gerado_em: new Date().toISOString(), ...base };
}
