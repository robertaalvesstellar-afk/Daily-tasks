// ===== PLANILHA =====

export interface CronogramaRow {
  frente: string
  etapa: string
  atividade: string
  responsavel: string
  dataInicio: string
  dataFim: string
  status: string
  prioridade: string
  observacoes: string
  [key: string]: string
}

// ===== CALENDÁRIO =====

export interface CalendarEvent {
  id: string
  titulo: string
  inicio: string
  fim: string
  descricao?: string
  participantes?: string[]
  calendario: 'pessoal' | 'stellar'
  recorrencia?: string
  link?: string
}

// ===== TASKS =====

export interface GoogleTask {
  id: string
  titulo: string
  notas?: string
  dataVencimento?: string
  status: 'needsAction' | 'completed'
  estrela: boolean
  listaTitulo: string
}

// ===== SUGESTÃO DE REUNIÃO =====

export type StatusEvento = 'existente' | 'sugerida' | 'aprovada' | 'rejeitada'
export type TipoReuniao =
  | 'julia-roberta'
  | 'maria-roberta'
  | 'socias'
  | 'guilherme'
  | 'genesis'
  | 'extra'

export interface ReuniaoProposta {
  id: string
  tipo: TipoReuniao
  titulo: string
  data: string
  horario: string
  duracao: number // minutos
  participantes: string[]
  recorrencia?: string
  motivo: string
  enviarInvite: boolean
  status: StatusEvento
  agendaItens?: AgendaItem[]
  ataInicial?: AtaInicial
  descricaoEvento?: string
  // para edição
  horarioEditado?: string
  participantesEditados?: string[]
}

export interface AgendaItem {
  topico: string
  contexto?: string
  tipo: 'decisao' | 'informativo' | 'revisao' | 'acao'
}

export interface AtaInicial {
  data: string
  participantes: string[]
  topicos: string[]
  decisoes: string[]
  responsaveis: string[]
  prazos: string[]
}

// ===== RELATÓRIO =====

export interface RelatorioMes {
  mesAnterior: string
  mesAtual: string
  geradoEm: string
  resumoExecutivo: ResumoExecutivo
  porResponsavel: Record<string, ItemRelatorio[]>
  porEtapa: Record<string, ItemRelatorio[]>
  porFrente: Record<string, ItemRelatorio[]>
  porStatus: Record<string, ItemRelatorio[]>
  metaPorResponsavel: Record<string, MetaResponsavel>
  sugestaoAgenda: ReuniaoProposta[]
}

export interface ItemRelatorio {
  atividade: string
  frente: string
  etapa: string
  responsavel: string
  dataFim: string
  status: string
  prioridade: string
  atrasado: boolean
  migrado: boolean
}

export interface ResumoExecutivo {
  entregasConcluidas: string[]
  prioridades: string[]
  itensAtrasados: ItemRelatorio[]
  responsaveisComMaisPendencias: { nome: string; total: number }[]
  frentesMaisCriticas: { nome: string; total: number }[]
  pontosAtencao: string[]
}

export interface MetaResponsavel {
  responsavel: string
  metaPrincipal: string
  entregasEsperadas: string[]
  reunioesChave: string[]
  riscos: string[]
}

// ===== WHATSAPP =====

export interface MensagemWhatsApp {
  id: string
  destinatario: string
  contato: string // nome exato no WhatsApp
  tipo: 'texto' | 'arquivo'
  mensagem: string
  arquivo?: string // caminho do PDF
  aprovada: boolean
  enviada: boolean
  enviadoEm?: string
}

// ===== PREFERÊNCIAS =====

export interface PreferenciasAgenda {
  indisponibilidadeRoberta: BlocoIndisponibilidade[]
  preferenciasJulia: PreferenciaPessoa
  preferenciasGuilherme: PreferenciaPessoa
  preferenciasGenesis: PreferenciaGenesis
  preferenciasGerais: PreferenciaGeral[]
  atualizadoEm: string
}

export interface BlocoIndisponibilidade {
  diaSemana: number // 0=Dom, 1=Seg, ... 6=Sab
  horaInicio: string // "HH:MM"
  horaFim: string
  motivo: string
}

export interface PreferenciaPessoa {
  nome: string
  horariosPreferidos: string[]
  diasPreferidos: number[]
  observacoes: string[]
}

export interface PreferenciaGenesis {
  horasPorMes: number
  duracaoReuniao: number
  horariosPreferidos: string[]
  precisaInvite: boolean
  observacoes: string[]
}

export interface PreferenciaGeral {
  descricao: string
  tipo: 'horario_ok' | 'horario_nao' | 'pessoa' | 'recorrencia'
  criadoEm: string
}

// ===== LOG =====

export interface LogEnvio {
  id: string
  tipo: 'evento_criado' | 'whatsapp_enviado' | 'relatorio_gerado'
  descricao: string
  timestamp: string
  detalhes?: Record<string, unknown>
}
