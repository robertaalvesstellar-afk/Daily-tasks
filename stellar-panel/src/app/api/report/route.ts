import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/google/auth'
import { lerCronograma } from '@/lib/google/sheets'
import { lerTarefas } from '@/lib/google/tasks'
import { gerarRelatorio, gerarHTML } from '@/lib/report/generator'
import fs from 'fs'
import path from 'path'
import type { PreferenciasAgenda, ReuniaoProposta } from '@/types'

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const formato = searchParams.get('formato') || 'json' // json | html

  try {
    const [cronograma, tarefas] = await Promise.all([
      lerCronograma(),
      lerTarefas(),
    ])

    // Carregar sugestões se existirem salvas, senão array vazio
    let reunioesSugeridas: ReuniaoProposta[] = []
    const sugestoesPath = path.join(process.cwd(), 'data', 'sugestoes.json')
    if (fs.existsSync(sugestoesPath)) {
      reunioesSugeridas = JSON.parse(fs.readFileSync(sugestoesPath, 'utf-8'))
    }

    const relatorio = gerarRelatorio({ cronograma, tarefas, reunioesSugeridas })

    if (formato === 'html') {
      const html = gerarHTML(relatorio)

      // Salvar HTML em disco
      const dir = path.join(process.cwd(), 'reports')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const nomeArquivo = `relatorio-${relatorio.mesAtual.replace(/\s+/g, '-')}.html`
      fs.writeFileSync(path.join(dir, nomeArquivo), html)

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    }

    return NextResponse.json(relatorio)
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao gerar relatório', detalhes: String(error) },
      { status: 500 }
    )
  }
}
