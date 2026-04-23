'use client'

import { useState } from 'react'
import { FileText, Download, RefreshCw, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RelatorioPage() {
  const [carregando, setCarregando] = useState(false)
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null)

  const gerarHTML = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/report?formato=html')
      if (!res.ok) throw new Error(await res.text())
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      setHtmlUrl(url)
      toast.success('Relatório HTML gerado!')
    } catch (err) {
      toast.error('Erro: ' + String(err))
    } finally {
      setCarregando(false)
    }
  }

  const exportarPDF = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/pdf')
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'relatorio-stellar.pdf'
      a.click()
      toast.success('PDF exportado com sucesso!')
    } catch (err) {
      toast.error('Erro: ' + String(err))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">Relatório Mensal</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Gere o relatório com visão completa do cronograma, responsáveis e metas.
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={gerarHTML}
          disabled={carregando}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a8a] hover:bg-[#2a4fa0] rounded-xl text-blue-200 text-sm font-medium border border-blue-800/50 transition-all disabled:opacity-50"
        >
          {carregando ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
          Gerar relatório HTML
        </button>

        <button
          onClick={exportarPDF}
          disabled={carregando}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-900/30 hover:bg-yellow-900/50 rounded-xl text-yellow-300 text-sm font-medium border border-yellow-800/50 transition-all disabled:opacity-50"
        >
          <Download size={14} />
          Exportar PDF
        </button>

        {htmlUrl && (
          <a
            href={htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-green-900/30 hover:bg-green-900/50 rounded-xl text-green-300 text-sm font-medium border border-green-800/50 transition-all"
          >
            <ExternalLink size={14} />
            Abrir relatório
          </a>
        )}
      </div>

      {/* Preview inline do relatório */}
      {htmlUrl && (
        <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3558]">
            <span className="text-sm font-medium text-white">Pré-visualização</span>
            <a
              href={htmlUrl}
              target="_blank"
              className="text-xs text-[#3366ff] hover:text-[#6090ff] flex items-center gap-1"
            >
              <ExternalLink size={10} /> Abrir em nova aba
            </a>
          </div>
          <iframe
            src={htmlUrl}
            className="w-full bg-white"
            style={{ height: 'calc(100vh - 280px)' }}
            title="Relatório Stellar"
          />
        </div>
      )}

      {!htmlUrl && (
        <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-12 text-center">
          <FileText size={40} className="text-[#2a3558] mx-auto mb-3" />
          <p className="text-sm text-[#64748b]">Clique em "Gerar relatório HTML" para ver a pré-visualização aqui.</p>
        </div>
      )}
    </div>
  )
}
