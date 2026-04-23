import { google } from 'googleapis'
import { getAuthenticatedClient } from './auth'
import type { GoogleTask } from '@/types'

export async function lerTarefas(): Promise<GoogleTask[]> {
  const auth = await getAuthenticatedClient()
  const tasks = google.tasks({ version: 'v1', auth })

  // Busca todas as listas de tarefas
  const listasResp = await tasks.tasklists.list({ maxResults: 20 })
  const listas = listasResp.data.items || []

  const todasTarefas: GoogleTask[] = []

  for (const lista of listas) {
    const tarefasResp = await tasks.tasks.list({
      tasklist: lista.id!,
      maxResults: 100,
      showCompleted: true,
      showHidden: false,
    })

    const itens = tarefasResp.data.items || []
    itens.forEach((t) => {
      todasTarefas.push({
        id: t.id || '',
        titulo: t.title || '',
        notas: t.notes || undefined,
        dataVencimento: t.due || undefined,
        status: (t.status as 'needsAction' | 'completed') || 'needsAction',
        estrela: !!(t as { starred?: boolean }).starred,
        listaTitulo: lista.title || '',
      })
    })
  }

  return todasTarefas
}

export function filtrarTarefasRelevantes(
  tarefas: GoogleTask[],
  hoje: Date = new Date()
): GoogleTask[] {
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 7)

  return tarefas.filter((t) => {
    if (t.status === 'completed') return false

    // Tem estrela
    if (t.estrela) return true

    // Prazo próximo (próximos 7 dias)
    if (t.dataVencimento) {
      const due = new Date(t.dataVencimento)
      if (due <= amanha) return true
    }

    // Relacionada ao Stellar
    const textoStellar = (t.titulo + ' ' + (t.notas || '')).toLowerCase()
    if (textoStellar.includes('stellar')) return true

    // Vencida
    if (t.dataVencimento && new Date(t.dataVencimento) < hoje) return true

    return false
  })
}

export function filtrarVencidas(
  tarefas: GoogleTask[],
  hoje: Date = new Date()
): GoogleTask[] {
  return tarefas.filter((t) => {
    if (t.status === 'completed') return false
    if (!t.dataVencimento) return false
    return new Date(t.dataVencimento) < hoje
  })
}
