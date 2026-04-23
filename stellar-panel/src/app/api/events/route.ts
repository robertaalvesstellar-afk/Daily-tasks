import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/google/auth'
import { resolverCalendarios, criarEvento } from '@/lib/google/calendar'
import { addMinutes, parseISO } from 'date-fns'
import fs from 'fs'
import path from 'path'
import type { ReuniaoProposta, LogEnvio } from '@/types'

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { reunioes }: { reunioes: ReuniaoProposta[] } = body

    if (!reunioes?.length) {
      return NextResponse.json({ error: 'Nenhuma reunião para criar' }, { status: 400 })
    }

    const ids = await resolverCalendarios()
    const resultados: { id: string; titulo: string; link: string; erro?: string }[] = []

    for (const reuniao of reunioes) {
      if (reuniao.status !== 'aprovada') continue

      try {
        const dataHoraInicio = `${reuniao.data}T${reuniao.horario}:00`
        const inicioDate = parseISO(dataHoraInicio)
        const fimDate = addMinutes(inicioDate, reuniao.duracao)

        const result = await criarEvento({
          titulo: reuniao.titulo,
          inicio: inicioDate.toISOString(),
          fim: fimDate.toISOString(),
          descricao: reuniao.descricaoEvento,
          participantes: reuniao.participantes,
          enviarInvite: reuniao.enviarInvite,
          calendarId: ids.stellar,
        })

        resultados.push({ id: reuniao.id, titulo: reuniao.titulo, link: result.link })
        registrarLog({
          tipo: 'evento_criado',
          descricao: `Evento criado: ${reuniao.titulo}`,
          detalhes: { reuniaoId: reuniao.id, link: result.link },
        })
      } catch (err) {
        resultados.push({
          id: reuniao.id,
          titulo: reuniao.titulo,
          link: '',
          erro: String(err),
        })
      }
    }

    // Atualizar status das sugestões salvas
    const sugestoesPath = path.join(process.cwd(), 'data', 'sugestoes.json')
    if (fs.existsSync(sugestoesPath)) {
      const sugestoes: ReuniaoProposta[] = JSON.parse(fs.readFileSync(sugestoesPath, 'utf-8'))
      const criados = new Set(resultados.filter((r) => !r.erro).map((r) => r.id))
      const atualizadas = sugestoes.map((s) =>
        criados.has(s.id) ? { ...s, status: 'aprovada' as const } : s
      )
      fs.writeFileSync(sugestoesPath, JSON.stringify(atualizadas, null, 2))
    }

    return NextResponse.json({ resultados })
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao criar eventos', detalhes: String(error) },
      { status: 500 }
    )
  }
}

// Salvar sugestões aprovadas/rejeitadas
export async function PUT(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  try {
    const { sugestoes }: { sugestoes: ReuniaoProposta[] } = await req.json()
    const sugestoesPath = path.join(process.cwd(), 'data', 'sugestoes.json')
    fs.writeFileSync(sugestoesPath, JSON.stringify(sugestoes, null, 2))
    return NextResponse.json({ ok: true })
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
      tipo: params.tipo,
      descricao: params.descricao,
      timestamp: new Date().toISOString(),
      detalhes: params.detalhes,
    })

    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))
  } catch {
    // log silencioso
  }
}
