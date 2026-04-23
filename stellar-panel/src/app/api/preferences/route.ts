import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { PreferenciasAgenda, PreferenciaGeral } from '@/types'

const PREFS_PATH = path.join(process.cwd(), 'data', 'preferences.json')

export async function GET() {
  try {
    const raw = fs.readFileSync(PREFS_PATH, 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Falha ao ler preferências' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: PreferenciasAgenda = await req.json()
    body.atualizadoEm = new Date().toISOString()
    fs.writeFileSync(PREFS_PATH, JSON.stringify(body, null, 2))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Adicionar preferência avulsa
export async function POST(req: NextRequest) {
  try {
    const { descricao, tipo }: { descricao: string; tipo: PreferenciaGeral['tipo'] } = await req.json()

    const raw = fs.readFileSync(PREFS_PATH, 'utf-8')
    const prefs: PreferenciasAgenda = JSON.parse(raw)

    prefs.preferenciasGerais = prefs.preferenciasGerais || []
    prefs.preferenciasGerais.push({
      descricao,
      tipo,
      criadoEm: new Date().toISOString(),
    })
    prefs.atualizadoEm = new Date().toISOString()

    fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
