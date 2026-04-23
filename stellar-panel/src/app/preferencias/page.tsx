'use client'

import { useState, useEffect } from 'react'
import { Save, RefreshCw, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { PreferenciasAgenda, BlocoIndisponibilidade, PreferenciaGeral } from '@/types'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function PreferenciasPage() {
  const [prefs, setPrefs] = useState<PreferenciasAgenda | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [novaPrefs, setNovaPrefs] = useState('')
  const [tipoNovaPrefs, setTipoNovaPrefs] = useState<PreferenciaGeral['tipo']>('horario_ok')

  useEffect(() => {
    fetch('/api/preferences')
      .then((r) => r.json())
      .then(setPrefs)
      .catch(() => toast.error('Erro ao carregar preferências'))
  }, [])

  const salvar = async () => {
    if (!prefs) return
    setSalvando(true)
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      toast.success('Preferências salvas!')
    } catch (err) {
      toast.error(String(err))
    } finally {
      setSalvando(false)
    }
  }

  const adicionarPrefGeral = async () => {
    if (!novaPrefs.trim()) return
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: novaPrefs, tipo: tipoNovaPrefs }),
      })
      if (!res.ok) throw new Error('Falha')
      // Recarregar
      const updated = await fetch('/api/preferences').then((r) => r.json())
      setPrefs(updated)
      setNovaPrefs('')
      toast.success('Preferência adicionada!')
    } catch (err) {
      toast.error(String(err))
    }
  }

  const removerPrefGeral = (index: number) => {
    if (!prefs) return
    const novo = { ...prefs, preferenciasGerais: prefs.preferenciasGerais.filter((_, i) => i !== index) }
    setPrefs(novo)
  }

  const atualizarBloqueio = (index: number, campo: keyof BlocoIndisponibilidade, valor: string | number) => {
    if (!prefs) return
    const bloqueios = [...prefs.indisponibilidadeRoberta]
    bloqueios[index] = { ...bloqueios[index], [campo]: valor }
    setPrefs({ ...prefs, indisponibilidadeRoberta: bloqueios })
  }

  const adicionarBloqueio = () => {
    if (!prefs) return
    setPrefs({
      ...prefs,
      indisponibilidadeRoberta: [
        ...prefs.indisponibilidadeRoberta,
        { diaSemana: 1, horaInicio: '19:00', horaFim: '22:00', motivo: '' },
      ],
    })
  }

  const removerBloqueio = (index: number) => {
    if (!prefs) return
    setPrefs({
      ...prefs,
      indisponibilidadeRoberta: prefs.indisponibilidadeRoberta.filter((_, i) => i !== index),
    })
  }

  if (!prefs) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw size={24} className="animate-spin text-[#3366ff]" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 fade-in max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Preferências</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            Configure regras de agenda e disponibilidade para melhorar as sugestões.
          </p>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2 bg-[#3366ff] hover:bg-[#4477ff] rounded-lg text-sm text-white font-medium transition-all disabled:opacity-50"
        >
          {salvando ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar tudo
        </button>
      </div>

      {/* Indisponibilidade da Roberta */}
      <Secao titulo="Indisponibilidade da Roberta">
        <div className="space-y-3">
          {prefs.indisponibilidadeRoberta.map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#0f1629] rounded-lg p-3">
              <select
                value={b.diaSemana}
                onChange={(e) => atualizarBloqueio(i, 'diaSemana', parseInt(e.target.value))}
                className="bg-[#1a2340] border border-[#2a3558] rounded px-2 py-1 text-sm text-white"
              >
                {DIAS.map((d, idx) => (
                  <option key={idx} value={idx}>{d}</option>
                ))}
              </select>
              <input
                type="time"
                value={b.horaInicio}
                onChange={(e) => atualizarBloqueio(i, 'horaInicio', e.target.value)}
                className="bg-[#1a2340] border border-[#2a3558] rounded px-2 py-1 text-sm text-white"
              />
              <span className="text-[#64748b] text-sm">até</span>
              <input
                type="time"
                value={b.horaFim}
                onChange={(e) => atualizarBloqueio(i, 'horaFim', e.target.value)}
                className="bg-[#1a2340] border border-[#2a3558] rounded px-2 py-1 text-sm text-white"
              />
              <input
                type="text"
                value={b.motivo}
                onChange={(e) => atualizarBloqueio(i, 'motivo', e.target.value)}
                placeholder="Motivo"
                className="bg-[#1a2340] border border-[#2a3558] rounded px-2 py-1 text-sm text-white flex-1"
              />
              <button
                onClick={() => removerBloqueio(i)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={adicionarBloqueio}
            className="flex items-center gap-2 text-sm text-[#3366ff] hover:text-[#6090ff]"
          >
            <Plus size={14} /> Adicionar bloqueio
          </button>
        </div>
      </Secao>

      {/* Preferências da Júlia */}
      <Secao titulo="Preferências da Júlia">
        <div className="space-y-2">
          <PrefField
            label="Horários preferidos"
            value={prefs.preferenciasJulia.horariosPreferidos.join(', ')}
            onChange={(v) => setPrefs({
              ...prefs,
              preferenciasJulia: { ...prefs.preferenciasJulia, horariosPreferidos: v.split(',').map((s) => s.trim()) },
            })}
            placeholder="20:00, 21:00"
          />
          <PrefField
            label="Observações"
            value={prefs.preferenciasJulia.observacoes.join('; ')}
            onChange={(v) => setPrefs({
              ...prefs,
              preferenciasJulia: { ...prefs.preferenciasJulia, observacoes: v.split(';').map((s) => s.trim()) },
            })}
          />
        </div>
      </Secao>

      {/* Preferências do Guilherme */}
      <Secao titulo="Preferências do Guilherme Nasser">
        <div className="space-y-2">
          <PrefField
            label="Horários preferidos"
            value={prefs.preferenciasGuilherme.horariosPreferidos.join(', ')}
            onChange={(v) => setPrefs({
              ...prefs,
              preferenciasGuilherme: { ...prefs.preferenciasGuilherme, horariosPreferidos: v.split(',').map((s) => s.trim()) },
            })}
          />
          <PrefField
            label="Observações"
            value={prefs.preferenciasGuilherme.observacoes.join('; ')}
            onChange={(v) => setPrefs({
              ...prefs,
              preferenciasGuilherme: { ...prefs.preferenciasGuilherme, observacoes: v.split(';').map((s) => s.trim()) },
            })}
          />
        </div>
      </Secao>

      {/* Genesis */}
      <Secao titulo="Consultoria Genesis">
        <div className="grid grid-cols-2 gap-3">
          <PrefField
            label="Horas por mês"
            value={String(prefs.preferenciasGenesis.horasPorMes)}
            onChange={(v) => setPrefs({
              ...prefs,
              preferenciasGenesis: { ...prefs.preferenciasGenesis, horasPorMes: parseInt(v) || 4 },
            })}
          />
          <PrefField
            label="Duração (min)"
            value={String(prefs.preferenciasGenesis.duracaoReuniao)}
            onChange={(v) => setPrefs({
              ...prefs,
              preferenciasGenesis: { ...prefs.preferenciasGenesis, duracaoReuniao: parseInt(v) || 60 },
            })}
          />
          <PrefField
            label="Horários preferidos"
            value={prefs.preferenciasGenesis.horariosPreferidos.join(', ')}
            onChange={(v) => setPrefs({
              ...prefs,
              preferenciasGenesis: { ...prefs.preferenciasGenesis, horariosPreferidos: v.split(',').map((s) => s.trim()) },
            })}
          />
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Precisa de invite?</label>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setPrefs({ ...prefs, preferenciasGenesis: { ...prefs.preferenciasGenesis, precisaInvite: true } })}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${prefs.preferenciasGenesis.precisaInvite ? 'bg-green-900/40 text-green-300 border-green-800/50' : 'bg-[#0f1629] text-[#64748b] border-[#2a3558]'}`}
              >
                Sim
              </button>
              <button
                onClick={() => setPrefs({ ...prefs, preferenciasGenesis: { ...prefs.preferenciasGenesis, precisaInvite: false } })}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${!prefs.preferenciasGenesis.precisaInvite ? 'bg-red-900/40 text-red-300 border-red-800/50' : 'bg-[#0f1629] text-[#64748b] border-[#2a3558]'}`}
              >
                Não
              </button>
            </div>
          </div>
        </div>
      </Secao>

      {/* Preferências gerais / aprendizados */}
      <Secao titulo="Preferências gerais e aprendizados">
        <div className="space-y-3">
          {prefs.preferenciasGerais.length === 0 ? (
            <p className="text-sm text-[#64748b]">Nenhuma preferência registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {prefs.preferenciasGerais.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-[#0f1629] rounded-lg px-3 py-2">
                  <div>
                    <span className="text-xs text-[#64748b] mr-2 px-1.5 py-0.5 bg-[#1a2340] rounded">{p.tipo}</span>
                    <span className="text-sm text-[#94a3b8]">{p.descricao}</span>
                  </div>
                  <button
                    onClick={() => removerPrefGeral(i)}
                    className="text-[#64748b] hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar nova preferência */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#2a3558]">
            <select
              value={tipoNovaPrefs}
              onChange={(e) => setTipoNovaPrefs(e.target.value as PreferenciaGeral['tipo'])}
              className="bg-[#0f1629] border border-[#2a3558] rounded-lg px-2 py-1.5 text-xs text-white"
            >
              <option value="horario_ok">Horário funciona</option>
              <option value="horario_nao">Horário não funciona</option>
              <option value="pessoa">Pessoa</option>
              <option value="recorrencia">Recorrência</option>
            </select>
            <input
              type="text"
              value={novaPrefs}
              onChange={(e) => setNovaPrefs(e.target.value)}
              placeholder="ex: Maria não consegue quinta 21h"
              className="flex-1 bg-[#0f1629] border border-[#2a3558] rounded-lg px-3 py-1.5 text-sm text-white"
              onKeyDown={(e) => e.key === 'Enter' && adicionarPrefGeral()}
            />
            <button
              onClick={adicionarPrefGeral}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#1e3a8a] rounded-lg text-xs text-blue-200 border border-blue-800/50 hover:bg-[#2a4fa0] transition-all"
            >
              <Plus size={12} /> Adicionar
            </button>
          </div>
          <p className="text-xs text-[#475569]">
            Essas preferências serão consideradas nas próximas sugestões de reunião.
          </p>
        </div>
      </Secao>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4 pb-3 border-b border-[#2a3558]">{titulo}</h2>
      {children}
    </div>
  )
}

function PrefField({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-[#64748b] mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f1629] border border-[#2a3558] rounded-lg px-3 py-1.5 text-sm text-white"
      />
    </div>
  )
}
