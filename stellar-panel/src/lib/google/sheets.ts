import { google } from 'googleapis'
import { getAuthenticatedClient } from './auth'
import type { CronogramaRow } from '@/types'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '172iH5tzSCgSE0Ss5bLrFnhmMxZqQoJuOkIYaymG5P3E'
const SHEET_NAME = process.env.SHEET_NAME || 'cronograma geral'

export async function lerCronograma(): Promise<CronogramaRow[]> {
  const auth = await getAuthenticatedClient()
  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'`,
  })

  const rows = response.data.values
  if (!rows || rows.length < 2) return []

  // A primeira linha são os cabeçalhos
  const headers = (rows[0] as string[]).map((h: string) =>
    normalizarCabecalho(h)
  )

  return rows.slice(1).map((row: string[]) => {
    const obj: CronogramaRow = {
      frente: '',
      etapa: '',
      atividade: '',
      responsavel: '',
      dataInicio: '',
      dataFim: '',
      status: '',
      prioridade: '',
      observacoes: '',
    }
    headers.forEach((header, i) => {
      obj[header] = (row[i] || '').toString().trim()
    })
    return obj
  })
}

function normalizarCabecalho(header: string): string {
  const mapa: Record<string, string> = {
    frente: 'frente',
    etapa: 'etapa',
    atividade: 'atividade',
    tarefa: 'atividade',
    responsavel: 'responsavel',
    responsável: 'responsavel',
    'data inicio': 'dataInicio',
    'data início': 'dataInicio',
    'data de início': 'dataInicio',
    'data fim': 'dataFim',
    'data de fim': 'dataFim',
    prazo: 'dataFim',
    status: 'status',
    prioridade: 'prioridade',
    observacoes: 'observacoes',
    observações: 'observacoes',
    obs: 'observacoes',
  }
  const lower = header.toLowerCase().trim()
  return mapa[lower] || lower.replace(/\s+/g, '_')
}

export function filtrarPorMes(
  rows: CronogramaRow[],
  ano: number,
  mes: number // 1-12
): CronogramaRow[] {
  return rows.filter((row) => {
    const data = parsarData(row.dataFim) || parsarData(row.dataInicio)
    if (!data) return false
    return data.getFullYear() === ano && data.getMonth() + 1 === mes
  })
}

export function filtrarConcluidos(rows: CronogramaRow[]): CronogramaRow[] {
  const statusConcluido = ['concluído', 'concluido', 'finalizado', 'done', 'feito', 'ok']
  return rows.filter((r) =>
    statusConcluido.includes(r.status.toLowerCase().trim())
  )
}

export function filtrarPendentes(rows: CronogramaRow[]): CronogramaRow[] {
  const statusConcluido = ['concluído', 'concluido', 'finalizado', 'done', 'feito', 'ok']
  return rows.filter((r) =>
    !statusConcluido.includes(r.status.toLowerCase().trim())
  )
}

export function filtrarAtrasados(rows: CronogramaRow[], dataReferencia = new Date()): CronogramaRow[] {
  return rows.filter((row) => {
    const data = parsarData(row.dataFim)
    if (!data) return false
    const pendente = !['concluído', 'concluido', 'finalizado', 'done', 'feito', 'ok'].includes(
      row.status.toLowerCase().trim()
    )
    return pendente && data < dataReferencia
  })
}

export function parsarData(str: string): Date | null {
  if (!str) return null
  // Suporta formatos: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const formatos = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ]
  for (const fmt of formatos) {
    const m = str.match(fmt)
    if (m) {
      if (fmt === formatos[1]) {
        // YYYY-MM-DD
        return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
      } else {
        // DD/MM/YYYY ou DD-MM-YYYY
        return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
      }
    }
  }
  // Tentativa genérica
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function agruparPor(
  rows: CronogramaRow[],
  campo: keyof CronogramaRow
): Record<string, CronogramaRow[]> {
  return rows.reduce<Record<string, CronogramaRow[]>>((acc, row) => {
    const chave = row[campo] || 'Não informado'
    if (!acc[chave]) acc[chave] = []
    acc[chave].push(row)
    return acc
  }, {})
}
