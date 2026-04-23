import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/google/auth'
import { lerCronograma } from '@/lib/google/sheets'
import { lerTarefas } from '@/lib/google/tasks'
import { gerarRelatorio, gerarHTML } from '@/lib/report/generator'
import fs from 'fs'
import path from 'path'
import type { ReuniaoProposta } from '@/types'

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'NÃO_AUTENTICADO' }, { status: 401 })
  }

  try {
    const [cronograma, tarefas] = await Promise.all([
      lerCronograma(),
      lerTarefas(),
    ])

    let reunioesSugeridas: ReuniaoProposta[] = []
    const sugestoesPath = path.join(process.cwd(), 'data', 'sugestoes.json')
    if (fs.existsSync(sugestoesPath)) {
      reunioesSugeridas = JSON.parse(fs.readFileSync(sugestoesPath, 'utf-8'))
    }

    const relatorio = gerarRelatorio({ cronograma, tarefas, reunioesSugeridas })
    const html = gerarHTML(relatorio)

    // Gerar PDF com Puppeteer
    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.emulateMediaType('print')

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    })

    await browser.close()

    // Salvar PDF em disco também
    const dir = path.join(process.cwd(), 'reports')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const nomeArquivo = `relatorio-${relatorio.mesAtual.replace(/\s+/g, '-')}.pdf`
    const pdfPath = path.join(dir, nomeArquivo)
    fs.writeFileSync(pdfPath, pdfBuffer)

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao gerar PDF', detalhes: String(error) },
      { status: 500 }
    )
  }
}
