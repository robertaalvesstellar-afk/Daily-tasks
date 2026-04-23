import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  CronogramaRow,
  GoogleTask,
  RelatorioMes,
  ItemRelatorio,
  ResumoExecutivo,
  MetaResponsavel,
  ReuniaoProposta,
} from '@/types'
import {
  filtrarPorMes,
  filtrarConcluidos,
  filtrarPendentes,
  filtrarAtrasados,
  agruparPor,
  parsarData,
} from '../google/sheets'

// ===== GERADOR PRINCIPAL =====

export function gerarRelatorio(params: {
  cronograma: CronogramaRow[]
  tarefas: GoogleTask[]
  reunioesSugeridas: ReuniaoProposta[]
  dataReferencia?: Date
}): RelatorioMes {
  const { cronograma, tarefas, reunioesSugeridas } = params
  const hoje = params.dataReferencia || new Date()

  const mesAtual = hoje
  const mesAnterior = subMonths(hoje, 1)

  const anoAtual = mesAtual.getFullYear()
  const mesAtualNum = mesAtual.getMonth() + 1
  const anoAnterior = mesAnterior.getFullYear()
  const mesAnteriorNum = mesAnterior.getMonth() + 1

  // Itens do mês anterior
  const itensMesAnterior = filtrarPorMes(cronograma, anoAnterior, mesAnteriorNum)
  const concluidosMesAnterior = filtrarConcluidos(itensMesAnterior)

  // Itens do mês atual
  const itensMesAtual = filtrarPorMes(cronograma, anoAtual, mesAtualNum)
  const pendentesMesAtual = filtrarPendentes(itensMesAtual)
  const atrasadosGeral = filtrarAtrasados(cronograma, hoje)

  // Converter para ItemRelatorio
  const toItem = (row: CronogramaRow, mesRef: number, anoRef: number): ItemRelatorio => {
    const data = parsarData(row.dataFim)
    const dataIni = parsarData(row.dataInicio)
    const dataMesAnteriorFim = endOfMonth(subMonths(hoje, 1))
    return {
      atividade: row.atividade || row.etapa || '',
      frente: row.frente || '',
      etapa: row.etapa || '',
      responsavel: row.responsavel || 'Não atribuído',
      dataFim: row.dataFim || '',
      status: row.status || '',
      prioridade: row.prioridade || '',
      atrasado: !!(data && data < hoje && !ehConcluido(row.status)),
      migrado: !!(data && data <= dataMesAnteriorFim && !ehConcluido(row.status)),
    }
  }

  const concluidosItens = concluidosMesAnterior.map((r) => toItem(r, mesAnteriorNum, anoAnterior))
  const pendentesItens = pendentesMesAtual.map((r) => toItem(r, mesAtualNum, anoAtual))
  const atrasadosItens = atrasadosGeral.map((r) => toItem(r, mesAtualNum, anoAtual))

  // Todos os itens relevantes para agrupamento
  const todosRelevantes = [
    ...cronograma.filter((r) => {
      const d = parsarData(r.dataFim)
      return d && d >= startOfMonth(mesAnterior) && d <= endOfMonth(mesAtual)
    }),
    ...atrasadosGeral,
  ]
  // Deduplicar
  const vistos = new Set<string>()
  const todosUnicos = todosRelevantes.filter((r) => {
    const chave = `${r.atividade}|${r.responsavel}|${r.dataFim}`
    if (vistos.has(chave)) return false
    vistos.add(chave)
    return true
  })

  const todosItens = todosUnicos.map((r) => toItem(r, mesAtualNum, anoAtual))

  // Agrupamentos
  const porResponsavelRaw = agruparPor(todosUnicos, 'responsavel')
  const porEtapaRaw = agruparPor(todosUnicos, 'etapa')
  const porFrenteRaw = agruparPor(todosUnicos, 'frente')
  const porStatusRaw = agruparPor(todosUnicos, 'status')

  const porResponsavel = Object.fromEntries(
    Object.entries(porResponsavelRaw).map(([k, v]) => [k, v.map((r) => toItem(r, mesAtualNum, anoAtual))])
  )
  const porEtapa = Object.fromEntries(
    Object.entries(porEtapaRaw).map(([k, v]) => [k, v.map((r) => toItem(r, mesAtualNum, anoAtual))])
  )
  const porFrente = Object.fromEntries(
    Object.entries(porFrenteRaw).map(([k, v]) => [k, v.map((r) => toItem(r, mesAtualNum, anoAtual))])
  )
  const porStatus = Object.fromEntries(
    Object.entries(porStatusRaw).map(([k, v]) => [k, v.map((r) => toItem(r, mesAtualNum, anoAtual))])
  )

  // Resumo executivo
  const resumoExecutivo = gerarResumoExecutivo({
    concluidosItens,
    pendentesItens,
    atrasadosItens,
    porResponsavel,
    porFrente,
    tarefas,
  })

  // Meta por responsável
  const responsaveis = Array.from(new Set(todosUnicos.map((r) => r.responsavel).filter(Boolean)))
  const metaPorResponsavel: Record<string, MetaResponsavel> = {}
  responsaveis.forEach((resp) => {
    const itensResp = (porResponsavel[resp] || []).filter((i) => !ehConcluido(i.status))
    const reunioesResp = reunioesSugeridas.filter((r) =>
      r.participantes.some((p) => p.toLowerCase().includes(resp.toLowerCase()))
    )

    metaPorResponsavel[resp] = {
      responsavel: resp,
      metaPrincipal: inferirMetaPrincipal(itensResp),
      entregasEsperadas: itensResp.slice(0, 5).map((i) => `${i.atividade} (${i.dataFim})`),
      reunioesChave: reunioesResp.slice(0, 3).map((r) => `${r.titulo} — ${formatarData(r.data)}`),
      riscos: identificarRiscos(itensResp),
    }
  })

  return {
    mesAnterior: format(mesAnterior, 'MMMM yyyy', { locale: ptBR }),
    mesAtual: format(mesAtual, 'MMMM yyyy', { locale: ptBR }),
    geradoEm: new Date().toISOString(),
    resumoExecutivo,
    porResponsavel,
    porEtapa,
    porFrente,
    porStatus,
    metaPorResponsavel,
    sugestaoAgenda: reunioesSugeridas,
  }
}

function gerarResumoExecutivo(params: {
  concluidosItens: ItemRelatorio[]
  pendentesItens: ItemRelatorio[]
  atrasadosItens: ItemRelatorio[]
  porResponsavel: Record<string, ItemRelatorio[]>
  porFrente: Record<string, ItemRelatorio[]>
  tarefas: GoogleTask[]
}): ResumoExecutivo {
  const { concluidosItens, pendentesItens, atrasadosItens, porResponsavel, porFrente } = params

  const responsaveisComMaisPendencias = Object.entries(porResponsavel)
    .map(([nome, itens]) => ({
      nome,
      total: itens.filter((i) => !ehConcluido(i.status)).length,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const frentesMaisCriticas = Object.entries(porFrente)
    .map(([nome, itens]) => ({
      nome,
      total: itens.filter((i) => i.atrasado || i.prioridade?.toLowerCase().includes('alta')).length,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const pontosAtencao: string[] = []
  if (atrasadosItens.length > 0) {
    pontosAtencao.push(`${atrasadosItens.length} itens com prazo vencido precisam de atenção imediata`)
  }
  if (responsaveisComMaisPendencias[0]?.total > 5) {
    pontosAtencao.push(
      `${responsaveisComMaisPendencias[0].nome} possui ${responsaveisComMaisPendencias[0].total} pendências — possível gargalo`
    )
  }
  if (frentesMaisCriticas[0]?.total > 3) {
    pontosAtencao.push(`Frente "${frentesMaisCriticas[0].nome}" é a mais crítica do período`)
  }

  return {
    entregasConcluidas: concluidosItens.slice(0, 10).map((i) => `${i.atividade} — ${i.responsavel}`),
    prioridades: pendentesItens
      .filter((i) => i.prioridade?.toLowerCase().includes('alta') || i.prioridade?.toLowerCase().includes('crítica'))
      .slice(0, 10)
      .map((i) => `${i.atividade} — ${i.responsavel} (${i.dataFim})`),
    itensAtrasados: atrasadosItens.slice(0, 10),
    responsaveisComMaisPendencias,
    frentesMaisCriticas,
    pontosAtencao,
  }
}

function ehConcluido(status: string): boolean {
  return ['concluído', 'concluido', 'finalizado', 'done', 'feito', 'ok'].includes(
    (status || '').toLowerCase().trim()
  )
}

function inferirMetaPrincipal(itens: ItemRelatorio[]): string {
  if (itens.length === 0) return 'Sem metas pendentes identificadas'
  const criticos = itens.filter(
    (i) => i.prioridade?.toLowerCase().includes('alta') || i.prioridade?.toLowerCase().includes('crítica')
  )
  if (criticos.length > 0) {
    return `Concluir ${criticos.length} itens de alta prioridade`
  }
  return `Avançar nas ${itens.length} atividades pendentes`
}

function identificarRiscos(itens: ItemRelatorio[]): string[] {
  const riscos: string[] = []
  const vencidos = itens.filter((i) => i.atrasado)
  if (vencidos.length > 0) {
    riscos.push(`${vencidos.length} item(s) com prazo vencido`)
  }
  const criticos = itens.filter((i) =>
    i.prioridade?.toLowerCase().includes('alta') || i.prioridade?.toLowerCase().includes('crítica')
  )
  if (criticos.length > 2) {
    riscos.push(`${criticos.length} itens de alta prioridade em aberto`)
  }
  return riscos.slice(0, 3)
}

function formatarData(dataStr: string): string {
  try {
    return format(new Date(dataStr + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return dataStr
  }
}

// ===== GERADOR DE HTML =====

export function gerarHTML(relatorio: RelatorioMes): string {
  const { resumoExecutivo: re, metaPorResponsavel: meta } = relatorio

  const formatarLista = (itens: string[], classe = '') =>
    itens.length > 0
      ? `<ul class="lista ${classe}">${itens.map((i) => `<li>${i}</li>`).join('')}</ul>`
      : '<p class="vazio">Nenhum item encontrado.</p>'

  const tabelaItens = (itens: ItemRelatorio[]) => {
    if (!itens.length) return '<p class="vazio">Nenhum item.</p>'
    return `
      <table class="tabela">
        <thead>
          <tr>
            <th>Atividade</th><th>Responsável</th><th>Status</th><th>Prazo</th><th>Prioridade</th>
          </tr>
        </thead>
        <tbody>
          ${itens
            .map(
              (i) => `
            <tr class="${i.atrasado ? 'atrasado' : i.migrado ? 'migrado' : ''}">
              <td>${i.atividade}</td>
              <td>${i.responsavel}</td>
              <td><span class="badge status-${normalizarStatus(i.status)}">${i.status}</span></td>
              <td>${i.dataFim}</td>
              <td>${i.prioridade}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
  }

  const secaoResponsaveis = Object.entries(relatorio.porResponsavel)
    .map(
      ([resp, itens]) => `
      <div class="sub-secao">
        <h3>${resp}</h3>
        ${tabelaItens(itens)}
      </div>
    `
    )
    .join('')

  const secaoEtapas = Object.entries(relatorio.porEtapa)
    .map(
      ([etapa, itens]) => `
      <div class="sub-secao">
        <h3>${etapa}</h3>
        ${tabelaItens(itens)}
      </div>
    `
    )
    .join('')

  const secaoFrentes = Object.entries(relatorio.porFrente)
    .map(
      ([frente, itens]) => `
      <div class="sub-secao">
        <h3>${frente}</h3>
        ${tabelaItens(itens)}
      </div>
    `
    )
    .join('')

  const secaoStatus = Object.entries(relatorio.porStatus)
    .map(
      ([status, itens]) => `
      <div class="sub-secao">
        <h3>${status}</h3>
        ${tabelaItens(itens)}
      </div>
    `
    )
    .join('')

  const secaoMetas = Object.entries(meta)
    .map(
      ([resp, m]) => `
      <div class="meta-card">
        <h3>${resp}</h3>
        <div class="meta-grid">
          <div>
            <strong>Meta Principal</strong>
            <p>${m.metaPrincipal}</p>
          </div>
          <div>
            <strong>Entregas Esperadas</strong>
            ${formatarLista(m.entregasEsperadas)}
          </div>
          <div>
            <strong>Reuniões Chave</strong>
            ${formatarLista(m.reunioesChave)}
          </div>
          <div>
            <strong>Riscos</strong>
            ${m.riscos.length > 0 ? formatarLista(m.riscos, 'lista-risco') : '<p class="vazio">Sem riscos identificados.</p>'}
          </div>
        </div>
      </div>
    `
    )
    .join('')

  const tabelaAgenda = relatorio.sugestaoAgenda.length > 0
    ? `
      <table class="tabela">
        <thead>
          <tr>
            <th>Data</th><th>Horário</th><th>Reunião</th><th>Participantes</th><th>Status</th><th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          ${relatorio.sugestaoAgenda
            .map(
              (r) => `
            <tr>
              <td>${formatarData(r.data)}</td>
              <td>${r.horario}</td>
              <td>${r.titulo}</td>
              <td>${r.participantes.join(', ')}</td>
              <td><span class="badge status-${r.status}">${r.status}</span></td>
              <td>${r.motivo}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : '<p class="vazio">Nenhuma reunião sugerida.</p>'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório Stellar — ${relatorio.mesAtual}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --azul: #1a4af5;
      --azul-escuro: #172a8e;
      --ouro: #e8b820;
      --cinza-bg: #f8f9fc;
      --cinza-borda: #e2e8f0;
      --verde: #16a34a;
      --vermelho: #dc2626;
      --laranja: #ea580c;
      --texto: #1e293b;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: var(--texto);
      background: white;
      padding: 40px;
      line-height: 1.6;
    }

    .header {
      background: linear-gradient(135deg, var(--azul-escuro) 0%, var(--azul) 100%);
      color: white;
      padding: 32px 40px;
      border-radius: 12px;
      margin-bottom: 32px;
    }

    .header h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
    .header .sub { font-size: 14px; opacity: 0.8; }
    .header .gerado { font-size: 11px; opacity: 0.6; margin-top: 12px; }

    .secao {
      margin-bottom: 36px;
      page-break-inside: avoid;
    }

    .secao h2 {
      font-size: 16px;
      font-weight: 700;
      color: var(--azul-escuro);
      border-bottom: 2px solid var(--azul);
      padding-bottom: 8px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sub-secao { margin-bottom: 20px; }
    .sub-secao h3 {
      font-size: 13px;
      font-weight: 600;
      color: var(--azul);
      margin-bottom: 8px;
      background: var(--cinza-bg);
      padding: 6px 12px;
      border-radius: 4px;
      border-left: 3px solid var(--azul);
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .card {
      background: var(--cinza-bg);
      border: 1px solid var(--cinza-borda);
      border-radius: 8px;
      padding: 16px;
    }

    .card-titulo { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 6px; }
    .card-valor { font-size: 22px; font-weight: 700; color: var(--azul-escuro); }

    .lista { padding-left: 20px; }
    .lista li { margin-bottom: 4px; }
    .lista-risco li { color: var(--vermelho); }

    .vazio { color: #94a3b8; font-style: italic; }

    .tabela {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .tabela th {
      background: var(--azul-escuro);
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }

    .tabela td {
      padding: 7px 10px;
      border-bottom: 1px solid var(--cinza-borda);
    }

    .tabela tr:nth-child(even) td { background: var(--cinza-bg); }
    .tabela tr.atrasado td { background: #fef2f2; }
    .tabela tr.migrado td { background: #fff7ed; }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-concluído, .status-concluido, .status-feito, .status-done, .status-ok {
      background: #dcfce7; color: #166534;
    }
    .status-em.andamento, .status-andamento {
      background: #dbeafe; color: #1e40af;
    }
    .status-atrasado, .status-vencido { background: #fee2e2; color: #991b1b; }
    .status-existente { background: #dbeafe; color: #1e40af; }
    .status-sugerida { background: #fef9c3; color: #854d0e; }
    .status-aprovada { background: #dcfce7; color: #166534; }

    .alerta {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      padding: 12px 16px;
      color: var(--vermelho);
      margin-bottom: 12px;
    }

    .meta-card {
      background: var(--cinza-bg);
      border: 1px solid var(--cinza-borda);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .meta-card h3 {
      font-size: 14px;
      font-weight: 700;
      color: var(--azul-escuro);
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--cinza-borda);
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .meta-grid strong { font-size: 11px; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px; }

    @media print {
      body { padding: 20px; }
      .secao { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>Relatório Operacional Stellar</h1>
    <div class="sub">${relatorio.mesAnterior} → ${relatorio.mesAtual}</div>
    <div class="gerado">Gerado em: ${new Date(relatorio.geradoEm).toLocaleString('pt-BR')}</div>
  </div>

  <!-- RESUMO EXECUTIVO -->
  <div class="secao">
    <h2>Resumo Executivo</h2>

    <div class="cards-grid">
      <div class="card">
        <div class="card-titulo">Concluídos no mês anterior</div>
        <div class="card-valor">${re.entregasConcluidas.length}</div>
      </div>
      <div class="card">
        <div class="card-titulo">Prioridades do mês atual</div>
        <div class="card-valor">${re.prioridades.length}</div>
      </div>
      <div class="card">
        <div class="card-titulo">Itens atrasados</div>
        <div class="card-valor" style="color: var(--vermelho)">${re.itensAtrasados.length}</div>
      </div>
    </div>

    ${
      re.pontosAtencao.length > 0
        ? re.pontosAtencao.map((p) => `<div class="alerta">⚠ ${p}</div>`).join('')
        : ''
    }

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px;">
      <div>
        <strong style="display:block; margin-bottom:8px; color:#64748b; font-size:11px; text-transform:uppercase;">Principais entregas concluídas (mês anterior)</strong>
        ${formatarLista(re.entregasConcluidas)}
      </div>
      <div>
        <strong style="display:block; margin-bottom:8px; color:#64748b; font-size:11px; text-transform:uppercase;">Prioridades críticas do mês atual</strong>
        ${formatarLista(re.prioridades)}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px;">
      <div>
        <strong style="display:block; margin-bottom:8px; color:#64748b; font-size:11px; text-transform:uppercase;">Responsáveis com mais pendências</strong>
        ${
          re.responsaveisComMaisPendencias.length > 0
            ? `<ul class="lista">${re.responsaveisComMaisPendencias.map((r) => `<li>${r.nome}: ${r.total} pendências</li>`).join('')}</ul>`
            : '<p class="vazio">Nenhum.</p>'
        }
      </div>
      <div>
        <strong style="display:block; margin-bottom:8px; color:#64748b; font-size:11px; text-transform:uppercase;">Frentes mais críticas</strong>
        ${
          re.frentesMaisCriticas.length > 0
            ? `<ul class="lista">${re.frentesMaisCriticas.map((f) => `<li>${f.nome}: ${f.total} itens críticos</li>`).join('')}</ul>`
            : '<p class="vazio">Nenhuma.</p>'
        }
      </div>
    </div>
  </div>

  <!-- VISÃO POR RESPONSÁVEL -->
  <div class="secao">
    <h2>Visão por Responsável</h2>
    ${secaoResponsaveis || '<p class="vazio">Nenhum dado disponível.</p>'}
  </div>

  <!-- VISÃO POR ETAPA -->
  <div class="secao">
    <h2>Visão por Etapa</h2>
    ${secaoEtapas || '<p class="vazio">Nenhum dado disponível.</p>'}
  </div>

  <!-- VISÃO POR FRENTE -->
  <div class="secao">
    <h2>Visão por Frente</h2>
    ${secaoFrentes || '<p class="vazio">Nenhum dado disponível.</p>'}
  </div>

  <!-- VISÃO POR STATUS -->
  <div class="secao">
    <h2>Visão por Status</h2>
    ${secaoStatus || '<p class="vazio">Nenhum dado disponível.</p>'}
  </div>

  <!-- META DO MÊS POR RESPONSÁVEL -->
  <div class="secao">
    <h2>Meta do Mês por Responsável</h2>
    ${secaoMetas || '<p class="vazio">Nenhum dado disponível.</p>'}
  </div>

  <!-- SUGESTÃO DE AGENDA DO MÊS -->
  <div class="secao">
    <h2>Sugestão de Agenda do Mês</h2>
    ${tabelaAgenda}
  </div>

</body>
</html>`
}

function normalizarStatus(status: string): string {
  return (status || '').toLowerCase().replace(/\s+/g, '.')
}
