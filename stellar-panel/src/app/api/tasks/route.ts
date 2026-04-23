import { NextResponse } from 'next/server'
import { lerTarefas, filtrarTarefasRelevantes, filtrarVencidas } from '@/lib/google/tasks'
import { isAuthenticated } from '@/lib/google/auth'

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  try {
    const todas = await lerTarefas()
    const relevantes = filtrarTarefasRelevantes(todas)
    const vencidas = filtrarVencidas(todas)

    return NextResponse.json({ todas, relevantes, vencidas })
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao ler tarefas', detalhes: String(error) },
      { status: 500 }
    )
  }
}
