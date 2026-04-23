import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/google/auth'
import { lerCronograma } from '@/lib/google/sheets'
import { resolverCalendarios, lerEventos } from '@/lib/google/calendar'
import { lerTarefas } from '@/lib/google/tasks'
import { gerarSugestoes } from '@/lib/meetings/suggester'
import { addMonths, startOfMonth, endOfMonth } from 'date-fns'
import fs from 'fs'
import path from 'path'
import type { PreferenciasAgenda } from '@/types'

function carregarPreferencias(): PreferenciasAgenda {
  const p = path.join(process.cwd(), 'data', 'preferences.json')
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const mesParam = searchParams.get('mes') // YYYY-MM, ex: "2026-05"

  try {
    const mesSugestao = mesParam
      ? new Date(mesParam + '-01')
      : addMonths(new Date(), 1)

    const inicio = startOfMonth(mesSugestao)
    const fim = endOfMonth(mesSugestao)

    const [cronograma, tarefas, ids] = await Promise.all([
      lerCronograma(),
      lerTarefas(),
      resolverCalendarios(),
    ])

    const hoje = new Date()
    const [eventosPessoais, eventosStellar] = await Promise.all([
      lerEventos(ids.pessoal, inicio, fim),
      lerEventos(ids.stellar, inicio, fim),
    ])

    const preferencias = carregarPreferencias()

    const sugestoes = gerarSugestoes({
      mesSugestao,
      eventosPessoais,
      eventosStellar,
      cronograma,
      tarefas,
      preferencias,
    })

    return NextResponse.json({ sugestoes, total: sugestoes.length })
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao gerar sugestões', detalhes: String(error) },
      { status: 500 }
    )
  }
}
