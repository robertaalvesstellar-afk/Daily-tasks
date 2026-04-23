import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/google/auth'
import { enviarMensagemWhatsApp, gerarMensagemPadrao } from '@/lib/whatsapp/automation'
import fs from 'fs'
import path from 'path'
import type { MensagemWhatsApp, LogEnvio } from '@/types'

const MSGS_PATH = path.join(process.cwd(), 'data', 'mensagens.json')

function carregarMensagens(): MensagemWhatsApp[] {
  if (!fs.existsSync(MSGS_PATH)) return []
  return JSON.parse(fs.readFileSync(MSGS_PATH, 'utf-8'))
}

function salvarMensagens(msgs: MensagemWhatsApp[]) {
  fs.writeFileSync(MSGS_PATH, JSON.stringify(msgs, null, 2))
}

export async function GET() {
  return NextResponse.json(carregarMensagens())
}

// Preparar mensagens padrão
export async function POST(req: NextRequest) {
  try {
    const { mesRelatorio }: { mesRelatorio: string } = await req.json()

    const destinatarios = [
      { nome: 'Júlia', contato: 'Júlia' },
      { nome: 'Maria', contato: 'Maria' },
      { nome: 'Guilherme Nasser', contato: 'Guilherme Nasser' },
      { nome: 'Grupo Sócias Stellar', contato: 'Sócias Stellar' },
    ]

    const msgs: MensagemWhatsApp[] = destinatarios.map((d, i) => ({
      id: `msg_${Date.now()}_${i}`,
      destinatario: d.nome,
      contato: d.contato,
      tipo: 'arquivo',
      mensagem: gerarMensagemPadrao({ destinatario: d.nome, mesRelatorio }),
      aprovada: false,
      enviada: false,
    }))

    salvarMensagens(msgs)
    return NextResponse.json(msgs)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Aprovar e enviar mensagem
export async function PUT(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  try {
    const { mensagens }: { mensagens: MensagemWhatsApp[] } = await req.json()
    salvarMensagens(mensagens)

    const aprovadas = mensagens.filter((m) => m.aprovada && !m.enviada)
    const resultados: { id: string; sucesso: boolean; erro?: string }[] = []

    // Buscar PDF mais recente
    const reportsDir = path.join(process.cwd(), 'reports')
    const pdfs = fs.existsSync(reportsDir)
      ? fs.readdirSync(reportsDir).filter((f) => f.endsWith('.pdf'))
      : []
    const pdfRecente = pdfs.length > 0 ? path.join(reportsDir, pdfs[pdfs.length - 1]) : undefined

    for (const msg of aprovadas) {
      const resultado = await enviarMensagemWhatsApp(
        msg,
        msg.tipo === 'arquivo' ? pdfRecente : undefined
      )

      resultados.push({ id: msg.id, ...resultado })

      if (resultado.sucesso) {
        msg.enviada = true
        msg.enviadoEm = new Date().toISOString()
        registrarLog({
          tipo: 'whatsapp_enviado',
          descricao: `WhatsApp enviado para ${msg.destinatario}`,
          detalhes: { destinatario: msg.destinatario, contato: msg.contato },
        })
      }
    }

    salvarMensagens(mensagens)
    return NextResponse.json({ resultados })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function registrarLog(params: {
  tipo: LogEnvio['tipo']
  descricao: string
  detalhes?: Record<string, unknown>
}) {
  try {
    const logPath = path.join(process.cwd(), 'logs', 'envios.json')
    const logs: LogEnvio[] = fs.existsSync(logPath)
      ? JSON.parse(fs.readFileSync(logPath, 'utf-8'))
      : []
    logs.push({
      id: `log_${Date.now()}`,
      ...params,
      timestamp: new Date().toISOString(),
    })
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))
  } catch {
    // silencioso
  }
}
