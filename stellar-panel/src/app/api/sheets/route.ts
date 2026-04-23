import { NextResponse } from 'next/server'
import { lerCronograma } from '@/lib/google/sheets'
import { isAuthenticated } from '@/lib/google/auth'

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  try {
    const dados = await lerCronograma()
    return NextResponse.json({ dados, total: dados.length })
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao ler planilha', detalhes: String(error) },
      { status: 500 }
    )
  }
}
