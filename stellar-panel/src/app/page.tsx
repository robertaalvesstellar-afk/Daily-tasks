'use client'

import { useState, useEffect, useCallback } from 'react'
import { StatCard } from '@/components/ui/Card'
import { Badge, statusParaVariante } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import {
  RefreshCw, FileText, Download, CalendarPlus,
  CheckSquare, Settings, AlertTriangle, Clock, TrendingUp,
  Users, Zap, Link as LinkIcon, LogIn
} from 'lucide-react'
import type { CronogramaRow, CalendarEvent, GoogleTask, ReuniaoProposta } from '@/types'

interface DashboardData {
  autenticado: boolean
  cronograma: CronogramaRow[]
  eventosStellar: CalendarEvent[]
  tarefas: GoogleTask[]
  sugestoes: ReuniaoProposta[]
}

export default function Dashboard() {
  const [dados, setDados] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acao, setAcao] = useState<string>('')

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    setAcao('Carregando dados...')

    try {
      // Verificar autenticação
      const resAuth = await fetch('/api/sheets')
      if (resAuth.status === 401) {
        setDados({ autenticado: false, cronograma: [], eventosStellar: [], tarefas: [], sugestoes: [] })
        setCarregando(false)
        setAcao('')
        return
      }

      const [resPlanilha, resCal, resTasks] = await Promise.all([
        fetch('/api/sheets'),
        fetch('/api/calendar'),
        fetch('/api/tasks'),
      ])

      const planilha = resAuth.ok ? await resPlanilha.json() : { dados: [] }
      const cal = resCal.ok ? await resCal.json() : { stellar: [], pessoal: [] }
      const tasks = resTasks.ok ? await resTasks.json() : { relevantes: [] }

      // Carregar sugestões salvas
      let sugestoes: ReuniaoProposta[] = []
      try {
        const resSug = await fetch('/api/suggest')
        if (resSug.ok) {
          const sug = await resSug.json()
          sugestoes = sug.sugestoes || []
        }
      } catch {
        // sugestões opcionais
      }

      setDados({
        autenticado: true,
        cronograma: planilha.dados || [],
        eventosStellar: cal.stellar || [],
        tarefas: tasks.relevantes || [],
        sugestoes,
      })
    } catch (err) {
      toast.error('Erro ao carregar dados. Verifique o console.')
      console.error(err)
    } finally {
      setCarregando(false)
      setAcao('')
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const gerarRelatorio = async () => {
    setAcao('Gerando relatório...')
    try {
      const res = await fetch('/api/report?formato=html')
      if (!res.ok) throw new Error('Falha ao gerar')
      window.open('/api/report?formato=html', '_blank')
      toast.success('Relatório HTML gerado!')
    } catch {
      toast.error('Erro ao gerar relatório')
    } finally {
      setAcao('')
    }
  }

  const exportarPDF = async () => {
    setAcao('Gerando PDF...')
    try {
      const res = await fetch('/api/pdf')
      if (!res.ok) throw new Error('Falha')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-stellar.pdf`
      a.click()
      toast.success('PDF exportado!')
    } catch {
      toast.error('Erro ao exportar PDF')
    } finally {
      setAcao('')
    }
  }

  const gerarSugestoes = async () => {
    setAcao('Gerando sugestões de reunião...')
    try {
      const res = await fetch('/api/suggest')
      if (!res.ok) throw new Error('Falha')
      const data = await res.json()
      setDados((d) => d ? { ...d, sugestoes: data.sugestoes } : d)
      toast.success(`${data.total} sugestões geradas!`)
    } catch {
      toast.error('Erro ao gerar sugestões')
    } finally {
      setAcao('')
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#3366ff] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#94a3b8] text-sm">{acao || 'Carregando...'}</p>
        </div>
      </div>
    )
  }

  if (!dados?.autenticado) {
    return <TelaConexao />
  }

  const { cronograma, eventosStellar, tarefas, sugestoes } = dados

  // Métricas
  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()

  const totalAtividades = cronograma.length
  const concluidas = cronograma.filter((r) =>
    ['concluído', 'concluido', 'finalizado', 'done', 'feito', 'ok'].includes(r.status?.toLowerCase() || '')
  ).length
  const atrasadas = cronograma.filter((r) => {
    const data = parsarDataSimples(r.dataFim)
    return data && data < hoje && !['concluído', 'concluido', 'finalizado', 'done'].includes(r.status?.toLowerCase() || '')
  }).length
  const criticas = cronograma.filter((r) =>
    ['alta', 'crítica', 'urgente'].some((p) => (r.prioridade || '').toLowerCase().includes(p))
  ).length

  const proximaReuniao = eventosStellar
    .filter((e) => new Date(e.inicio) > hoje)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0]

  const tarefasVencidas = tarefas.filter((t) =>
    t.dataVencimento && new Date(t.dataVencimento) < hoje && t.status === 'needsAction'
  )

  const itensMesAtual = cronograma.filter((r) => {
    const data = parsarDataSimples(r.dataFim)
    return data && data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual
  })

  const sugestaoPendentes = sugestoes.filter((s) => s.status === 'sugerida')

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={carregarDados}
            disabled={!!acao}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a2340] border border-[#2a3558] rounded-lg text-sm text-[#94a3b8] hover:text-white hover:border-[#3366ff] transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={acao ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Alerta de atrasos */}
      {atrasadas > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800/50 rounded-xl">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <strong>{atrasadas} atividades com prazo vencido</strong> precisam de atenção imediata.{' '}
            <a href="/aprovacao" className="underline hover:text-red-200">Ver detalhes</a>
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de atividades"
          valor={totalAtividades}
          sub={`${concluidas} concluídas`}
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Atrasadas"
          valor={atrasadas}
          sub="prazo vencido"
          cor={atrasadas > 0 ? 'vermelho' : 'verde'}
          icon={<AlertTriangle size={16} />}
        />
        <StatCard
          label="Prioridade alta"
          valor={criticas}
          sub="deste mês"
          cor={criticas > 3 ? 'ouro' : 'normal'}
          icon={<Zap size={16} />}
        />
        <StatCard
          label="Tarefas vencidas"
          valor={tarefasVencidas.length}
          sub="Google Tasks"
          cor={tarefasVencidas.length > 0 ? 'vermelho' : 'verde'}
          icon={<Clock size={16} />}
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Prioridades do mês */}
        <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Prioridades do mês</h2>
            <Badge variante="azul">{itensMesAtual.length} itens</Badge>
          </div>

          {itensMesAtual.length === 0 ? (
            <p className="text-sm text-[#64748b]">Nenhum item com prazo este mês.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {itensMesAtual
                .sort((a, b) => {
                  const ord = ['crítica', 'alta', 'média', 'baixa']
                  return ord.indexOf(a.prioridade?.toLowerCase() || '') - ord.indexOf(b.prioridade?.toLowerCase() || '')
                })
                .slice(0, 12)
                .map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-[#2a3558] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.atividade}</p>
                      <p className="text-xs text-[#64748b]">
                        {item.responsavel} · prazo {item.dataFim}
                      </p>
                    </div>
                    <div className="flex gap-1.5 ml-3 flex-shrink-0">
                      <Badge variante={statusParaVariante(item.status)}>{item.status}</Badge>
                      {item.prioridade && (
                        <Badge variante={
                          ['alta', 'crítica'].includes(item.prioridade.toLowerCase()) ? 'vermelho' : 'cinza'
                        }>
                          {item.prioridade}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Próxima reunião + ações */}
        <div className="space-y-4">
          {/* Próxima reunião */}
          <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Próxima reunião</h2>
            {proximaReuniao ? (
              <div>
                <p className="text-sm font-medium text-white">{proximaReuniao.titulo}</p>
                <p className="text-xs text-[#94a3b8] mt-1">
                  {new Date(proximaReuniao.inicio).toLocaleDateString('pt-BR', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                  {' · '}
                  {new Date(proximaReuniao.inicio).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {(proximaReuniao.participantes ?? []).length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Users size={12} className="text-[#64748b]" />
                    <p className="text-xs text-[#64748b]">
                      {(proximaReuniao.participantes ?? []).length} participante(s)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#64748b]">Nenhuma reunião agendada.</p>
            )}
          </div>

          {/* Sugestões pendentes */}
          {sugestaoPendentes.length > 0 && (
            <div className="bg-[#1a2340] border border-yellow-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarPlus size={14} className="text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-300">
                  {sugestaoPendentes.length} sugestões aguardando
                </span>
              </div>
              <p className="text-xs text-[#94a3b8]">Reuniões sugeridas precisam de aprovação.</p>
              <a
                href="/aprovacao"
                className="mt-2 text-xs text-[#3366ff] hover:text-[#6090ff] flex items-center gap-1"
              >
                <LinkIcon size={10} /> Revisar agora
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Tarefas relevantes */}
      {tarefas.length > 0 && (
        <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Tarefas Google Tasks relevantes</h2>
            <Badge variante="cinza">{tarefas.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {tarefas.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-start gap-2 p-3 bg-[#0f1629] rounded-lg">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  t.estrela ? 'bg-yellow-400' : 'bg-[#3366ff]'
                }`} />
                <div>
                  <p className="text-xs text-white">{t.titulo}</p>
                  {t.dataVencimento && (
                    <p className={`text-[10px] mt-0.5 ${
                      new Date(t.dataVencimento) < hoje ? 'text-red-400' : 'text-[#64748b]'
                    }`}>
                      Prazo: {new Date(t.dataVencimento).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <BotaoAcao
            icon={<FileText size={14} />}
            label="Gerar relatório HTML"
            onClick={gerarRelatorio}
            disabled={!!acao}
          />
          <BotaoAcao
            icon={<Download size={14} />}
            label="Exportar PDF"
            onClick={exportarPDF}
            disabled={!!acao}
            variante="ouro"
          />
          <BotaoAcao
            icon={<CalendarPlus size={14} />}
            label="Gerar sugestão de agenda"
            onClick={gerarSugestoes}
            disabled={!!acao}
          />
          <a href="/aprovacao">
            <BotaoAcao
              icon={<CheckSquare size={14} />}
              label="Painel de aprovação"
              onClick={() => {}}
              variante="verde"
            />
          </a>
          <a href="/preferencias">
            <BotaoAcao
              icon={<Settings size={14} />}
              label="Editar preferências"
              onClick={() => {}}
            />
          </a>
        </div>
        {acao && (
          <p className="text-xs text-[#94a3b8] mt-3 flex items-center gap-2">
            <span className="inline-block w-3 h-3 border border-[#3366ff] border-t-transparent rounded-full animate-spin" />
            {acao}
          </p>
        )}
      </div>
    </div>
  )
}

function BotaoAcao({
  icon, label, onClick, disabled, variante = 'azul',
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variante?: 'azul' | 'verde' | 'ouro'
}) {
  const estilos = {
    azul: 'bg-[#1e3a8a] hover:bg-[#2a4fa0] text-blue-200 border-blue-800/50',
    verde: 'bg-green-900/30 hover:bg-green-900/50 text-green-300 border-green-800/50',
    ouro: 'bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-300 border-yellow-800/50',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-40 ${estilos[variante]}`}
    >
      {icon}
      {label}
    </button>
  )
}

function TelaConexao() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center max-w-sm space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3366ff] to-[#6090ff] flex items-center justify-center mx-auto">
          <LogIn size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Conectar ao Google</h1>
          <p className="text-sm text-[#94a3b8] mt-2">
            Para usar o Painel Stellar, você precisa autorizar o acesso ao Google Calendar,
            Sheets e Tasks.
          </p>
        </div>
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#3366ff] hover:bg-[#4477ff] rounded-xl text-white font-semibold transition-all"
        >
          <LogIn size={16} />
          Conectar com Google
        </a>
        <p className="text-xs text-[#475569]">
          Certifique-se de ter configurado o arquivo .env.local com suas credenciais.
        </p>
      </div>
    </div>
  )
}

function parsarDataSimples(str: string): Date | null {
  if (!str) return null
  const m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m1) return new Date(parseInt(m1[3]), parseInt(m1[2]) - 1, parseInt(m1[1]))
  const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]))
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}
