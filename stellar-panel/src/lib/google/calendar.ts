import { google } from 'googleapis'
import { getAuthenticatedClient } from './auth'
import type { CalendarEvent } from '@/types'

// IDs dos calendários (serão carregados dinamicamente)
let _calendarIdPessoal: string | null = null
let _calendarIdStellar: string | null = null

export async function listarCalendarios(): Promise<{ id: string; nome: string; primary: boolean }[]> {
  const auth = await getAuthenticatedClient()
  const cal = google.calendar({ version: 'v3', auth })

  const resp = await cal.calendarList.list()
  return (resp.data.items || []).map((c) => ({
    id: c.id!,
    nome: c.summary || '',
    primary: c.primary || false,
  }))
}

export async function resolverCalendarios(): Promise<{
  pessoal: string
  stellar: string
}> {
  const calendarios = await listarCalendarios()

  const pessoal =
    calendarios.find((c) => c.primary)?.id ||
    calendarios[0]?.id ||
    'primary'

  const stellar =
    calendarios.find(
      (c) => c.nome.toLowerCase().includes('stellar')
    )?.id || null

  if (!stellar) {
    throw new Error('Calendário "stellar" não encontrado. Crie-o no Google Calendar.')
  }

  _calendarIdPessoal = pessoal
  _calendarIdStellar = stellar

  return { pessoal, stellar }
}

export async function lerEventos(
  calendarId: string,
  inicio: Date,
  fim: Date
): Promise<CalendarEvent[]> {
  const auth = await getAuthenticatedClient()
  const cal = google.calendar({ version: 'v3', auth })

  const resp = await cal.events.list({
    calendarId,
    timeMin: inicio.toISOString(),
    timeMax: fim.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  })

  return (resp.data.items || []).map((e) => ({
    id: e.id || '',
    titulo: e.summary || '',
    inicio: e.start?.dateTime || e.start?.date || '',
    fim: e.end?.dateTime || e.end?.date || '',
    descricao: e.description || '',
    participantes: (e.attendees || []).map((a) => a.email || a.displayName || ''),
    calendario: calendarId === _calendarIdPessoal ? 'pessoal' : 'stellar',
    link: e.htmlLink || '',
  }))
}

export async function criarEvento(params: {
  titulo: string
  inicio: string       // ISO 8601
  fim: string          // ISO 8601
  descricao?: string
  participantes?: string[]
  enviarInvite?: boolean
  recorrencia?: string
  calendarId?: string
}): Promise<{ id: string; link: string }> {
  const auth = await getAuthenticatedClient()
  const cal = google.calendar({ version: 'v3', auth })

  if (!_calendarIdStellar) {
    await resolverCalendarios()
  }

  const calId = params.calendarId || _calendarIdStellar || 'primary'

  const attendees = params.participantes?.map((email) => ({ email })) || []

  const resp = await cal.events.insert({
    calendarId: calId,
    sendUpdates: params.enviarInvite ? 'all' : 'none',
    requestBody: {
      summary: params.titulo,
      description: params.descricao || '',
      start: { dateTime: params.inicio, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: params.fim, timeZone: 'America/Sao_Paulo' },
      attendees: attendees.length > 0 ? attendees : undefined,
      recurrence: params.recorrencia ? [params.recorrencia] : undefined,
    },
  })

  return {
    id: resp.data.id || '',
    link: resp.data.htmlLink || '',
  }
}

export async function verificarConflito(
  inicio: Date,
  fim: Date,
  calendarIds: string[]
): Promise<CalendarEvent[]> {
  const conflitos: CalendarEvent[] = []
  for (const calId of calendarIds) {
    const eventos = await lerEventos(calId, inicio, fim)
    conflitos.push(...eventos)
  }
  return conflitos
}
