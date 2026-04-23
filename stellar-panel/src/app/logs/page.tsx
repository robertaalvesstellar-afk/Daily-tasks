'use client'

import { useState, useEffect } from 'react'
import { ScrollText, RefreshCw, CalendarCheck, MessageCircle, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { LogEnvio } from '@/types'

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEnvio[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/logs')
      if (res.ok) setLogs(await res.json())
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const IconeTipo = ({ tipo }: { tipo: LogEnvio['tipo'] }) => {
    if (tipo === 'evento_criado') return <CalendarCheck size={14} className="text-blue-300" />
    if (tipo === 'whatsapp_enviado') return <MessageCircle size={14} className="text-green-300" />
    return <FileText size={14} className="text-yellow-300" />
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Logs de envios</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">Histórico de eventos criados e mensagens enviadas.</p>
        </div>
        <button
          onClick={carregar}
          className="flex items-center gap-2 px-3 py-2 bg-[#1a2340] border border-[#2a3558] rounded-lg text-sm text-[#94a3b8] hover:text-white"
        >
          <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={24} className="animate-spin text-[#3366ff]" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-[#1a2340] border border-[#2a3558] rounded-xl">
          <ScrollText size={40} className="mx-auto mb-3 text-[#2a3558]" />
          <p className="text-sm text-[#64748b]">Nenhuma ação registrada ainda.</p>
        </div>
      ) : (
        <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#2a3558]">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-4 py-3">
                <IconeTipo tipo={log.tipo} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{log.descricao}</p>
                  <p className="text-xs text-[#64748b]">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Badge
                  variante={
                    log.tipo === 'evento_criado' ? 'azul' :
                    log.tipo === 'whatsapp_enviado' ? 'verde' : 'ouro'
                  }
                >
                  {log.tipo.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
