'use client'

import { useState, useEffect } from 'react'
import { Badge, statusParaVariante } from '@/components/ui/Badge'
import { RefreshCw, CalendarPlus, ChevronDown, ChevronUp, Users, Clock, Repeat } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ReuniaoProposta, AgendaItem } from '@/types'

const TIPO_LABEL: Record<string, string> = {
  'julia-roberta': 'Júlia + Roberta',
  'maria-roberta': 'Maria + Roberta',
  socias: 'Sócias Stellar',
  guilherme: 'Guilherme Nasser',
  genesis: 'Consultoria Genesis',
  extra: 'Extra',
}

const TIPO_COR: Record<string, string> = {
  'julia-roberta': 'text-blue-300 bg-blue-900/30 border-blue-800/50',
  'maria-roberta': 'text-purple-300 bg-purple-900/30 border-purple-800/50',
  socias: 'text-yellow-300 bg-yellow-900/30 border-yellow-800/50',
  guilherme: 'text-green-300 bg-green-900/30 border-green-800/50',
  genesis: 'text-orange-300 bg-orange-900/30 border-orange-800/50',
  extra: 'text-red-300 bg-red-900/30 border-red-800/50',
}

export default function ReunioesPage() {
  const [reunioes, setReunioes] = useState<ReuniaoProposta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [mesSugestao, setMesSugestao] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 7)
  })

  const carregar = async (mes?: string) => {
    setCarregando(true)
    try {
      const url = `/api/suggest${mes ? `?mes=${mes}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setReunioes(data.sugestoes || [])
    } catch (err) {
      toast.error('Erro ao carregar sugestões: ' + String(err))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar(mesSugestao)
  }, [])

  const grupos = reunioes.reduce<Record<string, ReuniaoProposta[]>>((acc, r) => {
    const g = r.tipo
    if (!acc[g]) acc[g] = []
    acc[g].push(r)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Sugestão de Reuniões</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            Reuniões sugeridas e existentes para o próximo mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={mesSugestao}
            onChange={(e) => setMesSugestao(e.target.value)}
            className="bg-[#1a2340] border border-[#2a3558] rounded-lg px-3 py-1.5 text-sm text-white"
          />
          <button
            onClick={() => carregar(mesSugestao)}
            disabled={carregando}
            className="flex items-center gap-2 px-3 py-2 bg-[#1e3a8a] rounded-lg text-sm text-blue-200 border border-blue-800/50 hover:bg-[#2a4fa0] transition-all disabled:opacity-50"
          >
            {carregando ? <RefreshCw size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
            Gerar
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={24} className="animate-spin text-[#3366ff]" />
        </div>
      ) : reunioes.length === 0 ? (
        <div className="text-center py-16 text-[#64748b]">
          <CalendarPlus size={40} className="mx-auto mb-3 text-[#2a3558]" />
          <p className="text-sm">Clique em "Gerar" para criar sugestões de reunião.</p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(grupos).map(([tipo, itens]) => (
              <div key={tipo} className={`rounded-xl p-4 border ${TIPO_COR[tipo] || ''}`}>
                <p className="text-xs font-medium mb-1">{TIPO_LABEL[tipo] || tipo}</p>
                <p className="text-2xl font-bold">{itens.length}</p>
                <p className="text-[10px] opacity-70 mt-0.5">
                  {itens.filter((i) => i.status === 'sugerida').length} sugeridas ·{' '}
                  {itens.filter((i) => i.status === 'existente').length} existentes
                </p>
              </div>
            ))}
          </div>

          {/* Lista por grupo */}
          {Object.entries(grupos).map(([tipo, itens]) => (
            <div key={tipo} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${TIPO_COR[tipo] || ''}`}>
                  {TIPO_LABEL[tipo] || tipo}
                </div>
                <div className="h-px flex-1 bg-[#2a3558]" />
              </div>

              <div className="space-y-2">
                {itens.map((r) => (
                  <ReuniaoCard
                    key={r.id}
                    reuniao={r}
                    expandido={expandido === r.id}
                    onToggle={() => setExpandido(expandido === r.id ? null : r.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Botão ir para aprovação */}
          <div className="flex justify-end">
            <a
              href="/aprovacao"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#3366ff] hover:bg-[#4477ff] rounded-xl text-white text-sm font-medium transition-all"
            >
              <CalendarPlus size={14} />
              Ir para aprovação
            </a>
          </div>
        </>
      )}
    </div>
  )
}

function ReuniaoCard({
  reuniao,
  expandido,
  onToggle,
}: {
  reuniao: ReuniaoProposta
  expandido: boolean
  onToggle: () => void
}) {
  const dataFormatada = reuniao.data
    ? new Date(reuniao.data + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : ''

  return (
    <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1e2a48] transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 text-center">
            <p className="text-[10px] text-[#94a3b8]">{dataFormatada}</p>
            <p className="text-sm font-bold text-white">{reuniao.horario}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{reuniao.titulo}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-[#64748b]">
                <Clock size={10} />
                {reuniao.duracao} min
              </span>
              {reuniao.recorrencia && (
                <span className="flex items-center gap-1 text-xs text-[#64748b]">
                  <Repeat size={10} />
                  {reuniao.recorrencia}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-[#64748b]">
                <Users size={10} />
                {reuniao.participantes.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <Badge variante={statusParaVariante(reuniao.status)}>{reuniao.status}</Badge>
          {expandido ? <ChevronUp size={14} className="text-[#64748b]" /> : <ChevronDown size={14} className="text-[#64748b]" />}
        </div>
      </button>

      {expandido && (
        <div className="border-t border-[#2a3558] p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detalhes */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-[#64748b] uppercase font-semibold mb-1">Motivo</p>
                <p className="text-sm text-[#94a3b8]">{reuniao.motivo}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#64748b] uppercase font-semibold mb-1">Participantes</p>
                <div className="flex flex-wrap gap-1">
                  {reuniao.participantes.map((p) => (
                    <span key={p} className="px-2 py-0.5 bg-[#0f1629] rounded text-xs text-[#94a3b8] border border-[#2a3558]">
                      {p.includes('@') ? p.split('@')[0] : p}
                    </span>
                  ))}
                </div>
              </div>
              {reuniao.enviarInvite !== undefined && (
                <div>
                  <p className="text-[10px] text-[#64748b] uppercase font-semibold mb-1">Invite</p>
                  <Badge variante={reuniao.enviarInvite ? 'verde' : 'cinza'}>
                    {reuniao.enviarInvite ? 'Enviar invite' : 'Sem invite'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Agenda */}
            {reuniao.agendaItens && reuniao.agendaItens.length > 0 && (
              <div>
                <p className="text-[10px] text-[#64748b] uppercase font-semibold mb-2">Agenda da reunião</p>
                <div className="space-y-1.5">
                  {reuniao.agendaItens.map((item, i) => (
                    <AgendaItemRow key={i} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ata inicial */}
          {reuniao.ataInicial && (
            <div className="border-t border-[#2a3558] pt-3">
              <p className="text-[10px] text-[#64748b] uppercase font-semibold mb-2">Ata inicial pré-preenchida</p>
              <div className="bg-[#0f1629] rounded-lg p-3 text-xs text-[#94a3b8] space-y-1">
                <p><strong className="text-[#64748b]">Data:</strong> {reuniao.ataInicial.data}</p>
                <p><strong className="text-[#64748b]">Participantes:</strong> {reuniao.ataInicial.participantes.join(', ')}</p>
                <p><strong className="text-[#64748b]">Tópicos:</strong> {reuniao.ataInicial.topicos.join('; ')}</p>
                <p className="text-[#475569] italic">* Decisões, responsáveis e prazos a preencher durante a reunião</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AgendaItemRow({ item }: { item: AgendaItem }) {
  const cores = {
    decisao: 'text-yellow-300',
    informativo: 'text-blue-300',
    revisao: 'text-purple-300',
    acao: 'text-green-300',
  }
  const labels = {
    decisao: 'Decisão',
    informativo: 'Info',
    revisao: 'Revisão',
    acao: 'Ação',
  }
  return (
    <div className="flex items-start gap-2">
      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#1a2340] border border-[#2a3558] flex-shrink-0 ${cores[item.tipo]}`}>
        {labels[item.tipo]}
      </span>
      <div>
        <p className="text-xs text-[#94a3b8]">{item.topico}</p>
        {item.contexto && <p className="text-[10px] text-[#64748b]">{item.contexto}</p>}
      </div>
    </div>
  )
}
