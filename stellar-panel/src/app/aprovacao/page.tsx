'use client'

import { useState, useEffect } from 'react'
import { Badge, statusParaVariante } from '@/components/ui/Badge'
import { Check, X, Edit3, RefreshCw, CalendarCheck, Save, Users, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ReuniaoProposta } from '@/types'

export default function AprovacaoPage() {
  const [reunioes, setReunioes] = useState<ReuniaoProposta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [edicao, setEdicao] = useState<{ horario: string; participantes: string }>({ horario: '', participantes: '' })

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/suggest')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setReunioes(data.sugestoes || [])
    } catch (err) {
      toast.error(String(err))
    } finally {
      setCarregando(false)
    }
  }

  const salvar = async (novas: ReuniaoProposta[]) => {
    setSalvando(true)
    try {
      await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sugestoes: novas }),
      })
    } catch {
      // silencioso
    } finally {
      setSalvando(false)
    }
  }

  const atualizar = (id: string, changes: Partial<ReuniaoProposta>) => {
    setReunioes((prev) => {
      const novo = prev.map((r) => (r.id === id ? { ...r, ...changes } : r))
      salvar(novo)
      return novo
    })
  }

  const aprovarTodos = () => {
    const novo = reunioes.map((r) =>
      r.status === 'sugerida' ? { ...r, status: 'aprovada' as const } : r
    )
    setReunioes(novo)
    salvar(novo)
    toast.success('Todos os eventos sugeridos aprovados!')
  }

  const criarAprovados = async () => {
    const aprovados = reunioes.filter((r) => r.status === 'aprovada')
    if (!aprovados.length) {
      toast.error('Nenhum evento aprovado para criar.')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reunioes: aprovados }),
      })
      const data = await res.json()
      const criados = data.resultados?.filter((r: { erro?: string }) => !r.erro).length || 0
      toast.success(`${criados} evento(s) criados no calendário Stellar!`)
      carregar()
    } catch (err) {
      toast.error('Erro ao criar eventos: ' + String(err))
    } finally {
      setSalvando(false)
    }
  }

  const iniciarEdicao = (r: ReuniaoProposta) => {
    setEditando(r.id)
    setEdicao({ horario: r.horario, participantes: r.participantes.join(', ') })
  }

  const confirmarEdicao = (id: string) => {
    atualizar(id, {
      horario: edicao.horario,
      participantes: edicao.participantes.split(',').map((p) => p.trim()).filter(Boolean),
    })
    setEditando(null)
  }

  const sugeridas = reunioes.filter((r) => r.status === 'sugerida')
  const aprovadas = reunioes.filter((r) => r.status === 'aprovada')
  const rejeitadas = reunioes.filter((r) => r.status === 'rejeitada')

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Painel de Aprovação</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            Revise, edite e aprove eventos antes de criar no calendário Stellar.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={carregar}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a2340] border border-[#2a3558] rounded-lg text-sm text-[#94a3b8] hover:text-white transition-all"
          >
            <RefreshCw size={14} />
          </button>
          {sugeridas.length > 0 && (
            <button
              onClick={aprovarTodos}
              className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-800/50 rounded-lg text-sm text-green-300 hover:bg-green-900/50 transition-all"
            >
              <Check size={14} />
              Aprovar todos ({sugeridas.length})
            </button>
          )}
          {aprovadas.length > 0 && (
            <button
              onClick={criarAprovados}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 bg-[#3366ff] hover:bg-[#4477ff] rounded-lg text-sm text-white font-medium transition-all disabled:opacity-50"
            >
              {salvando ? <RefreshCw size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
              Criar no Google Calendar ({aprovadas.length})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-300">{sugeridas.length}</p>
          <p className="text-xs text-[#94a3b8] mt-1">Aguardando aprovação</p>
        </div>
        <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-300">{aprovadas.length}</p>
          <p className="text-xs text-[#94a3b8] mt-1">Aprovados</p>
        </div>
        <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-300">{rejeitadas.length}</p>
          <p className="text-xs text-[#94a3b8] mt-1">Rejeitados</p>
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={24} className="animate-spin text-[#3366ff]" />
        </div>
      ) : reunioes.length === 0 ? (
        <div className="text-center py-16 bg-[#1a2340] border border-[#2a3558] rounded-xl">
          <CalendarCheck size={40} className="mx-auto mb-3 text-[#2a3558]" />
          <p className="text-sm text-[#64748b]">
            Nenhuma sugestão de reunião. Vá para{' '}
            <a href="/reunioes" className="text-[#3366ff] hover:underline">Reuniões</a> e gere sugestões primeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reunioes.map((r) => (
            <EventoCard
              key={r.id}
              reuniao={r}
              editando={editando === r.id}
              edicao={edicao}
              onEdicaoChange={setEdicao}
              onAprovar={() => atualizar(r.id, { status: 'aprovada' })}
              onRejeitar={() => atualizar(r.id, { status: 'rejeitada' })}
              onEditar={() => iniciarEdicao(r)}
              onConfirmarEdicao={() => confirmarEdicao(r.id)}
              onCancelarEdicao={() => setEditando(null)}
              onToggleInvite={() => atualizar(r.id, { enviarInvite: !r.enviarInvite })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventoCard({
  reuniao,
  editando,
  edicao,
  onEdicaoChange,
  onAprovar,
  onRejeitar,
  onEditar,
  onConfirmarEdicao,
  onCancelarEdicao,
  onToggleInvite,
}: {
  reuniao: ReuniaoProposta
  editando: boolean
  edicao: { horario: string; participantes: string }
  onEdicaoChange: (v: { horario: string; participantes: string }) => void
  onAprovar: () => void
  onRejeitar: () => void
  onEditar: () => void
  onConfirmarEdicao: () => void
  onCancelarEdicao: () => void
  onToggleInvite: () => void
}) {
  const statusBg = {
    sugerida: 'border-yellow-800/50 bg-yellow-900/10',
    aprovada: 'border-green-800/50 bg-green-900/10',
    rejeitada: 'border-red-800/50 bg-red-900/10',
    existente: 'border-blue-800/50 bg-blue-900/10',
  }[reuniao.status] || 'border-[#2a3558]'

  const dataFormatada = reuniao.data
    ? new Date(reuniao.data + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : '-'

  return (
    <div className={`bg-[#1a2340] border rounded-xl overflow-hidden ${statusBg}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-white">{reuniao.titulo}</p>
              <Badge variante={statusParaVariante(reuniao.status)}>{reuniao.status}</Badge>
            </div>

            {editando ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#64748b] w-20">Horário</label>
                  <input
                    type="time"
                    value={edicao.horario}
                    onChange={(e) => onEdicaoChange({ ...edicao, horario: e.target.value })}
                    className="bg-[#0f1629] border border-[#2a3558] rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#64748b] w-20">Participantes</label>
                  <input
                    type="text"
                    value={edicao.participantes}
                    onChange={(e) => onEdicaoChange({ ...edicao, participantes: e.target.value })}
                    placeholder="email1@..., email2@..."
                    className="bg-[#0f1629] border border-[#2a3558] rounded px-2 py-1 text-xs text-white flex-1"
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={onConfirmarEdicao}
                    className="flex items-center gap-1 px-3 py-1 bg-green-900/40 rounded text-xs text-green-300 hover:bg-green-900/60"
                  >
                    <Save size={11} /> Salvar
                  </button>
                  <button
                    onClick={onCancelarEdicao}
                    className="px-3 py-1 bg-[#0f1629] rounded text-xs text-[#94a3b8] hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748b] mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {dataFormatada} às {reuniao.horario} · {reuniao.duracao} min
                </span>
                <span className="flex items-center gap-1">
                  <Users size={10} />
                  {reuniao.participantes.map((p) => (p.includes('@') ? p.split('@')[0] : p)).join(', ')}
                </span>
                {reuniao.recorrencia && <span>{reuniao.recorrencia}</span>}
              </div>
            )}
          </div>

          {/* Ações */}
          {!editando && reuniao.status !== 'existente' && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={onToggleInvite}
                title={reuniao.enviarInvite ? 'Desativar invite' : 'Ativar invite'}
                className={`px-2 py-1.5 rounded text-xs border transition-all ${
                  reuniao.enviarInvite
                    ? 'bg-blue-900/30 text-blue-300 border-blue-800/50'
                    : 'bg-[#0f1629] text-[#64748b] border-[#2a3558]'
                }`}
              >
                {reuniao.enviarInvite ? '📧 Invite' : '📧 Sem invite'}
              </button>
              <button
                onClick={onEditar}
                className="p-1.5 rounded bg-[#0f1629] text-[#64748b] border border-[#2a3558] hover:text-white hover:border-[#3366ff] transition-all"
              >
                <Edit3 size={13} />
              </button>
              {reuniao.status !== 'aprovada' && (
                <button
                  onClick={onAprovar}
                  className="p-1.5 rounded bg-green-900/30 text-green-300 border border-green-800/50 hover:bg-green-900/50 transition-all"
                >
                  <Check size={13} />
                </button>
              )}
              {reuniao.status !== 'rejeitada' && (
                <button
                  onClick={onRejeitar}
                  className="p-1.5 rounded bg-red-900/30 text-red-300 border border-red-800/50 hover:bg-red-900/50 transition-all"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Agenda resumida */}
        {reuniao.agendaItens && reuniao.agendaItens.length > 0 && !editando && (
          <div className="mt-3 pt-3 border-t border-[#2a3558]">
            <p className="text-[10px] text-[#64748b] uppercase font-semibold mb-1.5">Agenda</p>
            <div className="flex flex-wrap gap-1.5">
              {reuniao.agendaItens.slice(0, 4).map((item, i) => (
                <span key={i} className="px-2 py-0.5 bg-[#0f1629] rounded text-xs text-[#94a3b8] border border-[#2a3558]">
                  {item.topico}
                </span>
              ))}
              {reuniao.agendaItens.length > 4 && (
                <span className="text-xs text-[#475569]">+{reuniao.agendaItens.length - 4} mais</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
