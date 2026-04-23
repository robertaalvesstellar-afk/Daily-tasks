'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, RefreshCw, Send, Edit3, Save, X, FileText, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import type { MensagemWhatsApp } from '@/types'

export default function WhatsAppPage() {
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mesRelatorio, setMesRelatorio] = useState(() => {
    const d = new Date()
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  })

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/whatsapp')
      if (res.ok) setMensagens(await res.json())
    } finally {
      setCarregando(false)
    }
  }

  const prepararMensagens = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesRelatorio }),
      })
      if (!res.ok) throw new Error('Falha ao preparar')
      const msgs = await res.json()
      setMensagens(msgs)
      toast.success('Mensagens preparadas!')
    } catch (err) {
      toast.error(String(err))
    } finally {
      setCarregando(false)
    }
  }

  const toggleAprovacao = (id: string) => {
    setMensagens((prev) =>
      prev.map((m) => (m.id === id ? { ...m, aprovada: !m.aprovada } : m))
    )
  }

  const editarMensagem = (id: string, texto: string) => {
    setMensagens((prev) =>
      prev.map((m) => (m.id === id ? { ...m, mensagem: texto } : m))
    )
  }

  const enviarAprovados = async () => {
    const aprovados = mensagens.filter((m) => m.aprovada && !m.enviada)
    if (!aprovados.length) {
      toast.error('Nenhuma mensagem aprovada para enviar.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens }),
      })
      if (!res.ok) throw new Error('Falha ao enviar')
      const data = await res.json()
      const ok = data.resultados?.filter((r: { sucesso: boolean }) => r.sucesso).length || 0
      toast.success(`${ok} mensagem(ns) enviada(s) via WhatsApp Web!`)
      carregar()
    } catch (err) {
      toast.error(String(err))
    } finally {
      setEnviando(false)
    }
  }

  const aprovadas = mensagens.filter((m) => m.aprovada)
  const enviadas = mensagens.filter((m) => m.enviada)

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">WhatsApp</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            Prepare e envie o relatório mensal via WhatsApp Web (modo assistido).
          </p>
        </div>
      </div>

      {/* Aviso */}
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4">
        <p className="text-sm text-blue-300 font-medium mb-1">Como funciona</p>
        <ul className="text-xs text-blue-200/80 space-y-1 list-disc pl-4">
          <li>Prepare as mensagens com o relatório do mês.</li>
          <li>Aprove cada mensagem e o destinatário.</li>
          <li>Ao enviar, o WhatsApp Web abre automaticamente no navegador.</li>
          <li>Você pode acompanhar e confirmar cada envio.</li>
          <li>Na primeira vez, escaneie o QR Code para conectar.</li>
        </ul>
      </div>

      {/* Config */}
      <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Preparar mensagens</h2>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Mês do relatório</label>
            <input
              type="text"
              value={mesRelatorio}
              onChange={(e) => setMesRelatorio(e.target.value)}
              placeholder="ex: abril 2026"
              className="bg-[#0f1629] border border-[#2a3558] rounded-lg px-3 py-1.5 text-sm text-white w-44"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={prepararMensagens}
              disabled={carregando}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] hover:bg-[#2a4fa0] rounded-lg text-sm text-blue-200 border border-blue-800/50 transition-all disabled:opacity-50"
            >
              {carregando ? <RefreshCw size={14} className="animate-spin" /> : <MessageCircle size={14} />}
              Preparar mensagens
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {mensagens.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{mensagens.length}</p>
            <p className="text-xs text-[#94a3b8] mt-1">Total</p>
          </div>
          <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-300">{aprovadas.length}</p>
            <p className="text-xs text-[#94a3b8] mt-1">Aprovadas</p>
          </div>
          <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-300">{enviadas.length}</p>
            <p className="text-xs text-[#94a3b8] mt-1">Enviadas</p>
          </div>
        </div>
      )}

      {/* Lista de mensagens */}
      {mensagens.length > 0 ? (
        <div className="space-y-3">
          {mensagens.map((msg) => (
            <MensagemCard
              key={msg.id}
              msg={msg}
              editando={editandoId === msg.id}
              onToggleAprovacao={() => toggleAprovacao(msg.id)}
              onEditar={() => setEditandoId(editandoId === msg.id ? null : msg.id)}
              onSalvar={(texto) => {
                editarMensagem(msg.id, texto)
                setEditandoId(null)
              }}
              onCancelar={() => setEditandoId(null)}
            />
          ))}

          {aprovadas.filter((m) => !m.enviada).length > 0 && (
            <div className="pt-2">
              <button
                onClick={enviarAprovados}
                disabled={enviando}
                className="flex items-center gap-2 px-6 py-3 bg-green-700 hover:bg-green-600 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 w-full justify-center"
              >
                {enviando ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                Enviar aprovadas via WhatsApp Web ({aprovadas.filter((m) => !m.enviada).length})
              </button>
              <p className="text-xs text-[#64748b] text-center mt-2">
                O WhatsApp Web abrirá no seu navegador. Confirme o envio lá.
              </p>
            </div>
          )}
        </div>
      ) : !carregando && (
        <div className="text-center py-16 bg-[#1a2340] border border-[#2a3558] rounded-xl">
          <MessageCircle size={40} className="mx-auto mb-3 text-[#2a3558]" />
          <p className="text-sm text-[#64748b]">Clique em "Preparar mensagens" para começar.</p>
        </div>
      )}
    </div>
  )
}

function MensagemCard({
  msg, editando, onToggleAprovacao, onEditar, onSalvar, onCancelar,
}: {
  msg: MensagemWhatsApp
  editando: boolean
  onToggleAprovacao: () => void
  onEditar: () => void
  onSalvar: (texto: string) => void
  onCancelar: () => void
}) {
  const [textoEdit, setTextoEdit] = useState(msg.mensagem)

  useEffect(() => { setTextoEdit(msg.mensagem) }, [msg.mensagem])

  return (
    <div className={`bg-[#1a2340] border rounded-xl overflow-hidden ${
      msg.enviada ? 'border-green-800/50 bg-green-900/10' :
      msg.aprovada ? 'border-yellow-800/50 bg-yellow-900/10' :
      'border-[#2a3558]'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-white">{msg.destinatario}</p>
              <span className="text-xs text-[#64748b]">→ {msg.contato}</span>
              {msg.enviada && <Badge variante="verde">Enviada</Badge>}
              {msg.aprovada && !msg.enviada && <Badge variante="ouro">Aprovada</Badge>}
              {msg.tipo === 'arquivo' && (
                <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                  <FileText size={10} />
                  Com PDF
                </span>
              )}
            </div>

            {editando ? (
              <div className="space-y-2">
                <textarea
                  value={textoEdit}
                  onChange={(e) => setTextoEdit(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0f1629] border border-[#2a3558] rounded-lg px-3 py-2 text-sm text-white resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onSalvar(textoEdit)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-900/40 rounded text-xs text-green-300 hover:bg-green-900/60"
                  >
                    <Save size={11} /> Salvar
                  </button>
                  <button
                    onClick={onCancelar}
                    className="px-3 py-1 bg-[#0f1629] rounded text-xs text-[#94a3b8] hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#94a3b8] whitespace-pre-wrap">{msg.mensagem}</p>
            )}

            {msg.enviadoEm && (
              <p className="text-[10px] text-[#475569] mt-1">
                Enviado em: {new Date(msg.enviadoEm).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {!msg.enviada && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={onToggleAprovacao}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  msg.aprovada
                    ? 'bg-yellow-900/40 text-yellow-300 border-yellow-800/50 hover:bg-red-900/40 hover:text-red-300 hover:border-red-800/50'
                    : 'bg-green-900/30 text-green-300 border-green-800/50 hover:bg-green-900/50'
                }`}
              >
                {msg.aprovada ? <X size={11} /> : <Eye size={11} />}
                {msg.aprovada ? 'Cancelar' : 'Aprovar'}
              </button>
              {!editando && (
                <button
                  onClick={onEditar}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-[#94a3b8] border border-[#2a3558] hover:text-white hover:border-[#3366ff] transition-all"
                >
                  <Edit3 size={11} />
                  Editar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
