import {
  addDays,
  addWeeks,
  format,
  getDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { parsarData } from '../google/sheets'
import type {
  ReuniaoProposta,
  CalendarEvent,
  CronogramaRow,
  GoogleTask,
  PreferenciasAgenda,
  TipoReuniao,
  AgendaItem,
  AtaInicial,
} from '@/types'

// ===== CONSTANTES =====

const DIA = { DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, SAB: 6 } as const

// ===== GERADOR PRINCIPAL =====

export function gerarSugestoes(params: {
  mesSugestao: Date
  eventosPessoais: CalendarEvent[]
  eventosStellar: CalendarEvent[]
  cronograma: CronogramaRow[]
  tarefas: GoogleTask[]
  preferencias: PreferenciasAgenda
}): ReuniaoProposta[] {
  const { mesSugestao, eventosPessoais, eventosStellar, cronograma, tarefas, preferencias } = params

  const sugestoes: ReuniaoProposta[] = []
  let idCounter = 1

  const novoId = () => `sug_${Date.now()}_${idCounter++}`

  // Eventos já existentes no Stellar (marcar como "existente")
  const existentes = eventosStellar.map((e): ReuniaoProposta => ({
    id: e.id,
    tipo: inferirTipoReuniao(e.titulo),
    titulo: e.titulo,
    data: e.inicio.split('T')[0],
    horario: e.inicio.includes('T') ? e.inicio.split('T')[1].substring(0, 5) : '',
    duracao: calcularDuracao(e.inicio, e.fim),
    participantes: e.participantes || [],
    motivo: 'Reunião já existente no calendário Stellar',
    enviarInvite: false,
    status: 'existente',
    agendaItens: gerarAgendaItens(inferirTipoReuniao(e.titulo), cronograma, tarefas, e.inicio.split('T')[0]),
    ataInicial: gerarAta(e.titulo, e.inicio.split('T')[0], e.participantes || []),
    descricaoEvento: e.descricao,
  }))

  sugestoes.push(...existentes)

  // Eventos bloqueados (pessoal)
  const bloqueios = new Set(eventosPessoais.map((e) => e.inicio.split('T')[0] + '_' + e.inicio.split('T')[1]?.substring(0, 5)))

  const inicio = startOfMonth(mesSugestao)
  const fim = endOfMonth(mesSugestao)

  // ===== GERAR REUNIÕES SUGERIDAS =====

  // 1. Júlia + Roberta — semanal, segunda 20h ou 21h
  const reunioesJulia = gerarRecorrenciaSemanal({
    inicio, fim,
    diasPreferidos: [DIA.SEG, DIA.QUA],
    horariosPreferidos: ['20:00', '21:00'],
    bloqueiosRoberta: preferencias.indisponibilidadeRoberta,
    bloqueiosCalendario: bloqueios,
    eventosStellarExistentes: eventosStellar,
    duracao: 60,
    titulo: 'Reunião Júlia + Roberta',
    tipo: 'julia-roberta',
    participantes: ['julia@stellar.com.br', 'roberta@stellar.com.br'],
    motivo: 'Alinhamento semanal Júlia e Roberta',
    enviarInvite: true,
    novoId,
    cronograma,
    tarefas,
    preferencias,
  })
  sugestoes.push(...reunioesJulia)

  // 2. Maria + Roberta — semanal, terça ou quinta 20h
  const reunioesMaria = gerarRecorrenciaSemanal({
    inicio, fim,
    diasPreferidos: [DIA.TER, DIA.QUI],
    horariosPreferidos: ['20:00', '21:00'],
    bloqueiosRoberta: preferencias.indisponibilidadeRoberta,
    bloqueiosCalendario: bloqueios,
    eventosStellarExistentes: eventosStellar,
    duracao: 60,
    titulo: 'Reunião Maria + Roberta',
    tipo: 'maria-roberta',
    participantes: ['maria@stellar.com.br', 'roberta@stellar.com.br'],
    motivo: 'Alinhamento semanal Maria e Roberta',
    enviarInvite: true,
    novoId,
    cronograma,
    tarefas,
    preferencias,
  })
  sugestoes.push(...reunioesMaria)

  // 3. Sócias (todas) — quinzenal, sexta 17h ou domingo 18h
  const reunioesSocias = gerarRecorrenciaQuinzenal({
    inicio, fim,
    diasPreferidos: [DIA.SEX, DIA.DOM],
    horariosPreferidos: ['17:00', '18:00'],
    bloqueiosRoberta: preferencias.indisponibilidadeRoberta,
    bloqueiosCalendario: bloqueios,
    eventosStellarExistentes: eventosStellar,
    duracao: 90,
    titulo: 'Reunião Sócias Stellar',
    tipo: 'socias',
    participantes: ['julia@stellar.com.br', 'maria@stellar.com.br', 'roberta@stellar.com.br'],
    motivo: 'Alinhamento quinzenal de todas as sócias',
    enviarInvite: true,
    novoId,
    cronograma,
    tarefas,
    preferencias,
  })
  sugestoes.push(...reunioesSocias)

  // 4. Guilherme Nasser — semanal, tarde (14h-17h)
  const reunioesGuilherme = gerarRecorrenciaSemanal({
    inicio, fim,
    diasPreferidos: [DIA.QUA, DIA.QUI, DIA.TER],
    horariosPreferidos: ['14:00', '15:00', '16:00', '17:00'],
    bloqueiosRoberta: preferencias.indisponibilidadeRoberta,
    bloqueiosCalendario: bloqueios,
    eventosStellarExistentes: eventosStellar,
    duracao: 60,
    titulo: 'Reunião Guilherme Nasser',
    tipo: 'guilherme',
    participantes: ['guilherme.nasser@email.com', 'roberta@stellar.com.br'],
    motivo: 'Reunião semanal de produção com Guilherme Nasser',
    enviarInvite: true,
    novoId,
    cronograma,
    tarefas,
    preferencias,
  })
  sugestoes.push(...reunioesGuilherme)

  // 5. Genesis — 4 reuniões de 1h, manhã (8h ou 9h)
  const reunioesGenesis = gerarReunioesMensais({
    inicio, fim,
    quantidade: 4,
    diasPreferidos: [DIA.SEG, DIA.TER, DIA.QUA, DIA.QUI, DIA.SEX],
    horariosPreferidos: ['08:00', '09:00'],
    bloqueiosRoberta: preferencias.indisponibilidadeRoberta,
    bloqueiosCalendario: bloqueios,
    eventosStellarExistentes: eventosStellar,
    duracao: 60,
    titulo: 'Consultoria Genesis',
    tipo: 'genesis',
    participantes: ['roberta@stellar.com.br'],
    motivo: '4 horas mensais de consultoria Genesis',
    enviarInvite: false,
    novoId,
    cronograma,
    tarefas,
    preferencias,
  })
  sugestoes.push(...reunioesGenesis)

  // 6. Reuniões extras em semanas críticas
  const semanasCriticas = identificarSemanasCriticas(cronograma, mesSugestao)
  semanasCriticas.forEach(({ semana, motivo }) => {
    const candidatos = encontrarSlotLivre({
      semanaInicio: semana,
      diasPreferidos: [DIA.QUA, DIA.QUI, DIA.SEX],
      horariosPreferidos: ['17:00', '18:00'],
      bloqueiosRoberta: preferencias.indisponibilidadeRoberta,
      bloqueiosCalendario: bloqueios,
      eventosStellarExistentes: eventosStellar,
    })
    if (candidatos) {
      sugestoes.push({
        id: novoId(),
        tipo: 'extra',
        titulo: `Reunião Extra — ${motivo}`,
        data: candidatos.data,
        horario: candidatos.horario,
        duracao: 90,
        participantes: ['julia@stellar.com.br', 'maria@stellar.com.br', 'roberta@stellar.com.br'],
        motivo: `Semana crítica: ${motivo}`,
        enviarInvite: true,
        status: 'sugerida',
        agendaItens: gerarAgendaItens('extra', cronograma, tarefas, candidatos.data),
        ataInicial: gerarAta(`Reunião Extra — ${motivo}`, candidatos.data, ['Júlia', 'Maria', 'Roberta']),
        descricaoEvento: gerarDescricaoEvento('extra', cronograma, tarefas, candidatos.data),
      })
    }
  })

  return sugestoes
}

// ===== HELPERS =====

function gerarRecorrenciaSemanal(params: {
  inicio: Date; fim: Date
  diasPreferidos: number[]; horariosPreferidos: string[]
  bloqueiosRoberta: PreferenciasAgenda['indisponibilidadeRoberta']
  bloqueiosCalendario: Set<string>
  eventosStellarExistentes: CalendarEvent[]
  duracao: number; titulo: string; tipo: TipoReuniao
  participantes: string[]; motivo: string; enviarInvite: boolean
  novoId: () => string
  cronograma: CronogramaRow[]; tarefas: GoogleTask[]
  preferencias: PreferenciasAgenda
}): ReuniaoProposta[] {
  const resultado: ReuniaoProposta[] = []
  let cursor = new Date(params.inicio)

  while (cursor <= params.fim) {
    // Verificar se já existe reunião desse tipo nessa semana no Stellar
    const semanaFim = addDays(cursor, 6)
    const jaExiste = params.eventosStellarExistentes.some((e) => {
      const dataEvento = new Date(e.inicio)
      return (
        dataEvento >= cursor &&
        dataEvento <= semanaFim &&
        e.titulo.toLowerCase().includes(params.titulo.toLowerCase().split(' ')[1] || '')
      )
    })

    if (!jaExiste) {
      const slot = encontrarSlotLivre({
        semanaInicio: cursor,
        diasPreferidos: params.diasPreferidos,
        horariosPreferidos: params.horariosPreferidos,
        bloqueiosRoberta: params.bloqueiosRoberta,
        bloqueiosCalendario: params.bloqueiosCalendario,
        eventosStellarExistentes: params.eventosStellarExistentes,
      })

      if (slot) {
        resultado.push({
          id: params.novoId(),
          tipo: params.tipo,
          titulo: params.titulo,
          data: slot.data,
          horario: slot.horario,
          duracao: params.duracao,
          participantes: params.participantes,
          recorrencia: 'Semanal',
          motivo: params.motivo,
          enviarInvite: params.enviarInvite,
          status: 'sugerida',
          agendaItens: gerarAgendaItens(params.tipo, params.cronograma, params.tarefas, slot.data),
          ataInicial: gerarAta(params.titulo, slot.data, params.participantes),
          descricaoEvento: gerarDescricaoEvento(params.tipo, params.cronograma, params.tarefas, slot.data),
        })
      }
    }

    cursor = addWeeks(cursor, 1)
  }

  return resultado
}

function gerarRecorrenciaQuinzenal(params: {
  inicio: Date; fim: Date
  diasPreferidos: number[]; horariosPreferidos: string[]
  bloqueiosRoberta: PreferenciasAgenda['indisponibilidadeRoberta']
  bloqueiosCalendario: Set<string>
  eventosStellarExistentes: CalendarEvent[]
  duracao: number; titulo: string; tipo: TipoReuniao
  participantes: string[]; motivo: string; enviarInvite: boolean
  novoId: () => string
  cronograma: CronogramaRow[]; tarefas: GoogleTask[]
  preferencias: PreferenciasAgenda
}): ReuniaoProposta[] {
  const resultado: ReuniaoProposta[] = []
  let cursor = new Date(params.inicio)
  let count = 0

  while (cursor <= params.fim) {
    if (count % 2 === 0) {
      const slot = encontrarSlotLivre({
        semanaInicio: cursor,
        diasPreferidos: params.diasPreferidos,
        horariosPreferidos: params.horariosPreferidos,
        bloqueiosRoberta: params.bloqueiosRoberta,
        bloqueiosCalendario: params.bloqueiosCalendario,
        eventosStellarExistentes: params.eventosStellarExistentes,
      })

      if (slot) {
        resultado.push({
          id: params.novoId(),
          tipo: params.tipo,
          titulo: params.titulo,
          data: slot.data,
          horario: slot.horario,
          duracao: params.duracao,
          participantes: params.participantes,
          recorrencia: 'Quinzenal',
          motivo: params.motivo,
          enviarInvite: params.enviarInvite,
          status: 'sugerida',
          agendaItens: gerarAgendaItens(params.tipo, params.cronograma, params.tarefas, slot.data),
          ataInicial: gerarAta(params.titulo, slot.data, params.participantes),
          descricaoEvento: gerarDescricaoEvento(params.tipo, params.cronograma, params.tarefas, slot.data),
        })
      }
    }

    cursor = addWeeks(cursor, 1)
    count++
  }

  return resultado
}

function gerarReunioesMensais(params: {
  inicio: Date; fim: Date
  quantidade: number
  diasPreferidos: number[]; horariosPreferidos: string[]
  bloqueiosRoberta: PreferenciasAgenda['indisponibilidadeRoberta']
  bloqueiosCalendario: Set<string>
  eventosStellarExistentes: CalendarEvent[]
  duracao: number; titulo: string; tipo: TipoReuniao
  participantes: string[]; motivo: string; enviarInvite: boolean
  novoId: () => string
  cronograma: CronogramaRow[]; tarefas: GoogleTask[]
  preferencias: PreferenciasAgenda
}): ReuniaoProposta[] {
  const resultado: ReuniaoProposta[] = []
  let cursor = new Date(params.inicio)
  const usadosNestaSemana = new Set<string>()

  while (cursor <= params.fim && resultado.length < params.quantidade) {
    const slot = encontrarSlotLivre({
      semanaInicio: cursor,
      diasPreferidos: params.diasPreferidos,
      horariosPreferidos: params.horariosPreferidos,
      bloqueiosRoberta: params.bloqueiosRoberta,
      bloqueiosCalendario: params.bloqueiosCalendario,
      eventosStellarExistentes: params.eventosStellarExistentes,
      excluirDatas: usadosNestaSemana,
    })

    if (slot) {
      usadosNestaSemana.add(slot.data)
      resultado.push({
        id: params.novoId(),
        tipo: params.tipo,
        titulo: params.titulo,
        data: slot.data,
        horario: slot.horario,
        duracao: params.duracao,
        participantes: params.participantes,
        motivo: params.motivo,
        enviarInvite: params.enviarInvite,
        status: 'sugerida',
        agendaItens: gerarAgendaItens(params.tipo, params.cronograma, params.tarefas, slot.data),
        ataInicial: gerarAta(params.titulo, slot.data, params.participantes),
        descricaoEvento: gerarDescricaoEvento(params.tipo, params.cronograma, params.tarefas, slot.data),
      })
    }

    cursor = addWeeks(cursor, 1)
  }

  return resultado
}

function encontrarSlotLivre(params: {
  semanaInicio: Date
  diasPreferidos: number[]
  horariosPreferidos: string[]
  bloqueiosRoberta: PreferenciasAgenda['indisponibilidadeRoberta']
  bloqueiosCalendario: Set<string>
  eventosStellarExistentes: CalendarEvent[]
  excluirDatas?: Set<string>
}): { data: string; horario: string } | null {
  for (const diaPref of params.diasPreferidos) {
    // Encontrar a data do dia preferido nessa semana
    const diaAtual = getDay(params.semanaInicio)
    const diff = (diaPref - diaAtual + 7) % 7
    const candidato = addDays(params.semanaInicio, diff)

    const dataStr = format(candidato, 'yyyy-MM-dd')

    if (params.excluirDatas?.has(dataStr)) continue

    for (const horario of params.horariosPreferidos) {
      const [h, m] = horario.split(':').map(Number)

      // Verificar bloqueio da Roberta
      const bloqueado = params.bloqueiosRoberta.some((b) => {
        if (b.diaSemana !== diaPref) return false
        const horaInicio = parseInt(b.horaInicio.split(':')[0]) * 60 + parseInt(b.horaInicio.split(':')[1])
        const horaFim = parseInt(b.horaFim.split(':')[0]) * 60 + parseInt(b.horaFim.split(':')[1])
        const horaEvento = h * 60 + m
        return horaEvento >= horaInicio && horaEvento < horaFim
      })

      if (bloqueado) continue

      // Verificar conflito com calendário pessoal
      const chave = `${dataStr}_${horario}`
      if (params.bloqueiosCalendario.has(chave)) continue

      // Verificar conflito com Stellar
      const conflito = params.eventosStellarExistentes.some((e) => {
        return e.inicio.startsWith(dataStr) && e.inicio.includes(`T${horario}`)
      })

      if (!conflito) {
        return { data: dataStr, horario }
      }
    }
  }

  return null
}

function inferirTipoReuniao(titulo: string): TipoReuniao {
  const t = titulo.toLowerCase()
  if (t.includes('júlia') || t.includes('julia')) return 'julia-roberta'
  if (t.includes('maria')) return 'maria-roberta'
  if (t.includes('sócias') || t.includes('socias')) return 'socias'
  if (t.includes('guilherme') || t.includes('nasser')) return 'guilherme'
  if (t.includes('genesis') || t.includes('gênesis')) return 'genesis'
  return 'extra'
}

function calcularDuracao(inicio: string, fim: string): number {
  try {
    const diff = new Date(fim).getTime() - new Date(inicio).getTime()
    return Math.round(diff / (1000 * 60))
  } catch {
    return 60
  }
}

function identificarSemanasCriticas(
  cronograma: CronogramaRow[],
  mes: Date
): { semana: Date; motivo: string }[] {
  const semanas: { semana: Date; motivo: string }[] = []
  const inicio = startOfMonth(mes)
  const fim = endOfMonth(mes)

  const criticos = cronograma.filter((r) => {
    const prioridade = r.prioridade?.toLowerCase() || ''
    return prioridade.includes('alta') || prioridade.includes('crítica') || prioridade.includes('urgente')
  })

  let cursor = new Date(inicio)
  while (cursor <= fim) {
    const semanaFim = addDays(cursor, 6)
    const itensSemana = criticos.filter((r) => {
      const data = parsarData(r.dataFim)
      return data && data >= cursor && data <= semanaFim
    })

    if (itensSemana.length >= 3) {
      semanas.push({
        semana: new Date(cursor),
        motivo: `${itensSemana.length} entregas críticas`,
      })
    }

    cursor = addWeeks(cursor, 1)
  }

  return semanas
}

export function gerarAgendaItens(
  tipo: TipoReuniao,
  cronograma: CronogramaRow[],
  tarefas: GoogleTask[],
  data: string
): AgendaItem[] {
  const itens: AgendaItem[] = []
  const dataRef = new Date(data + 'T00:00:00')
  const umaSemanaAntes = addDays(dataRef, -7)
  const umaSemanaDepois = addDays(dataRef, 7)

  // Tarefas atrasadas relevantes
  const atrasadas = cronograma.filter((r) => {
    const d = parsarData(r.dataFim)
    return d && d < dataRef && !['concluído', 'concluido', 'finalizado', 'done'].includes(r.status.toLowerCase())
  }).slice(0, 3)

  atrasadas.forEach((r) => {
    itens.push({
      topico: `[ATRASADO] ${r.atividade} — ${r.responsavel}`,
      contexto: `Prazo: ${r.dataFim} | Status: ${r.status}`,
      tipo: 'acao',
    })
  })

  // Entregas da semana
  const entregasSemana = cronograma.filter((r) => {
    const d = parsarData(r.dataFim)
    return d && d >= dataRef && d <= umaSemanaDepois
  }).slice(0, 4)

  entregasSemana.forEach((r) => {
    itens.push({
      topico: `Revisão: ${r.atividade}`,
      contexto: `Responsável: ${r.responsavel} | Prazo: ${r.dataFim}`,
      tipo: 'revisao',
    })
  })

  // Tópicos fixos por tipo
  const topicosFixos = topicosPorTipo(tipo)
  itens.push(...topicosFixos)

  // Tarefas do Google Tasks relevantes
  const tarefasRelev = tarefas
    .filter((t) => t.status === 'needsAction' && (t.estrela || t.titulo.toLowerCase().includes('stellar')))
    .slice(0, 3)

  tarefasRelev.forEach((t) => {
    itens.push({
      topico: t.titulo,
      contexto: t.dataVencimento ? `Prazo: ${t.dataVencimento}` : undefined,
      tipo: 'acao',
    })
  })

  return itens.slice(0, 8)
}

function topicosPorTipo(tipo: TipoReuniao): AgendaItem[] {
  const mapa: Record<TipoReuniao, AgendaItem[]> = {
    'julia-roberta': [
      { topico: 'Alinhamento de prioridades da semana', tipo: 'informativo' },
      { topico: 'Revisão de pendências em aberto', tipo: 'revisao' },
      { topico: 'Decisões necessárias', tipo: 'decisao' },
    ],
    'maria-roberta': [
      { topico: 'Status das atividades financeiras/administrativas', tipo: 'informativo' },
      { topico: 'Pendências e bloqueios', tipo: 'revisao' },
      { topico: 'Próximos passos', tipo: 'acao' },
    ],
    socias: [
      { topico: 'Visão estratégica do mês', tipo: 'informativo' },
      { topico: 'Indicadores de desempenho', tipo: 'revisao' },
      { topico: 'Decisões estratégicas', tipo: 'decisao' },
      { topico: 'Alinhamento de metas', tipo: 'acao' },
    ],
    guilherme: [
      { topico: 'Status de produção', tipo: 'informativo' },
      { topico: 'Revisão de entregas da semana', tipo: 'revisao' },
      { topico: 'Próximas demandas de produção', tipo: 'acao' },
    ],
    genesis: [
      { topico: 'Revisão de progresso', tipo: 'revisao' },
      { topico: 'Consultoria e orientações', tipo: 'informativo' },
      { topico: 'Plano de ação', tipo: 'acao' },
    ],
    extra: [
      { topico: 'Situação crítica e urgências', tipo: 'decisao' },
      { topico: 'Redistribuição de tarefas se necessário', tipo: 'acao' },
    ],
  }
  return mapa[tipo] || []
}

export function gerarAta(
  titulo: string,
  data: string,
  participantes: string[]
): AtaInicial {
  return {
    data: format(new Date(data + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    participantes: participantes.map((p) =>
      p.includes('@') ? p.split('@')[0].replace(/[._]/g, ' ') : p
    ),
    topicos: ['(Preencher com base na agenda)'],
    decisoes: ['(A preencher durante a reunião)'],
    responsaveis: ['(A preencher durante a reunião)'],
    prazos: ['(A preencher durante a reunião)'],
  }
}

export function gerarDescricaoEvento(
  tipo: TipoReuniao,
  cronograma: CronogramaRow[],
  tarefas: GoogleTask[],
  data: string
): string {
  const agendaItens = gerarAgendaItens(tipo, cronograma, tarefas, data)

  const objetivo = objetivoPorTipo(tipo)
  const topicos = agendaItens.map((i) => `• ${i.topico}`).join('\n')

  return `OBJETIVO
${objetivo}

TÓPICOS A DISCUTIR
${topicos}

---
Gerado automaticamente pelo Painel Stellar`
}

function objetivoPorTipo(tipo: TipoReuniao): string {
  const mapa: Record<TipoReuniao, string> = {
    'julia-roberta': 'Alinhamento semanal entre Júlia e Roberta para revisão de prioridades e pendências.',
    'maria-roberta': 'Alinhamento semanal entre Maria e Roberta para revisão operacional e financeira.',
    socias: 'Reunião quinzenal de todas as sócias para alinhamento estratégico e tomada de decisões.',
    guilherme: 'Reunião semanal com Guilherme Nasser para acompanhamento de produção.',
    genesis: 'Sessão de consultoria mensal com a equipe Genesis.',
    extra: 'Reunião extra convocada por urgência ou semana crítica.',
  }
  return mapa[tipo]
}
