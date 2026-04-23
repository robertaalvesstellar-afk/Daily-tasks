import { NextRequest, NextResponse } from 'next/server'
import { resolverCalendarios, lerEventos, listarCalendarios } from '@/lib/google/calendar'
import { isAuthenticated } from '@/lib/google/auth'
import { addMonths, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const acao = searchParams.get('acao') || 'eventos'

  try {
    if (acao === 'listar') {
      const cals = await listarCalendarios()
      return NextResponse.json({ calendarios: cals })
    }

    const ids = await resolverCalendarios()

    const hoje = new Date()
    const inicio = startOfMonth(hoje)
    const fim = endOfMonth(addMonths(hoje, 1))

    const [pessoal, stellar] = await Promise.all([
      lerEventos(ids.pessoal, inicio, fim),
      lerEventos(ids.stellar, inicio, fim),
    ])

    return NextResponse.json({
      pessoal,
      stellar,
      ids,
    })
  } catch (error) {
    const msg = String(error)
    if (msg.includes('stellar')) {
      return NextResponse.json(
        { error: 'Calendário "stellar" não encontrado. Crie-o no Google Calendar.' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Falha ao ler calendários', detalhes: msg },
      { status: 500 }
    )
  }
}
