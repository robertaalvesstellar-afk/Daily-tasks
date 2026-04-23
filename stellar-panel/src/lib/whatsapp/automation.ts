import type { MensagemWhatsApp } from '@/types'

// WhatsApp Web automation via Puppeteer (modo assistido)
// O usuário precisa escanear o QR code na primeira execução.

export async function iniciarSessaoWhatsApp(): Promise<void> {
  // Dynamic import to avoid issues at build time
  const puppeteer = await import('puppeteer')

  const browser = await puppeteer.default.launch({
    headless: false, // Modo visual para o usuário ver e aprovar
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--user-data-dir=./data/whatsapp-session', // Salva sessão para não precisar escanear sempre
    ],
  })

  const page = await browser.newPage()
  await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2', timeout: 60000 })

  // Aguarda até a tela inicial do WhatsApp Web carregar
  try {
    await page.waitForSelector('[data-testid="conversation-panel-wrapper"], [data-testid="qrcode"]', {
      timeout: 30000,
    })
  } catch {
    console.log('Aguardando WhatsApp Web carregar...')
  }

  // Retorna sem fechar o browser — será fechado pelo caller
  // Para uso em sessão única, o caller gerencia o ciclo de vida
  await browser.close()
}

export async function enviarMensagemWhatsApp(
  mensagem: MensagemWhatsApp,
  pdfPath?: string
): Promise<{ sucesso: boolean; erro?: string }> {
  let browser: Awaited<ReturnType<typeof import('puppeteer').default.launch>> | null = null

  try {
    const puppeteer = await import('puppeteer')

    browser = await puppeteer.default.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--user-data-dir=./data/whatsapp-session',
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2', timeout: 60000 })

    // Aguarda carregamento
    await page.waitForSelector('[data-testid="conversation-panel-wrapper"]', {
      timeout: 60000,
    })

    // Espera 2s para estabilizar
    await new Promise((r) => setTimeout(r, 2000))

    // Busca o contato
    const pesquisaSelector = '[data-testid="chat-list-search"]'
    await page.click(pesquisaSelector)
    await page.type(pesquisaSelector, mensagem.contato, { delay: 50 })
    await new Promise((r) => setTimeout(r, 1500))

    // Clica no primeiro resultado
    const resultadoSelector = '[data-testid="cell-frame-container"]'
    await page.waitForSelector(resultadoSelector, { timeout: 10000 })
    await page.click(resultadoSelector)
    await new Promise((r) => setTimeout(r, 1000))

    if (pdfPath && mensagem.tipo === 'arquivo') {
      // Envia arquivo PDF
      const inputFile = await page.$('input[type="file"]')
      if (!inputFile) {
        // Tenta abrir o anexo
        const btnAnexo = await page.$('[data-testid="attach-btn"]') ||
                          await page.$('[title="Attach"]') ||
                          await page.$('[data-icon="attach-menu-plus"]')
        if (btnAnexo) {
          await btnAnexo.click()
          await new Promise((r) => setTimeout(r, 500))
        }
      }

      const fileInput = await page.$('input[type="file"]')
      if (fileInput) {
        // ElementHandle do Puppeteer aceita uploadFile
        await (fileInput as unknown as { uploadFile: (path: string) => Promise<void> }).uploadFile(pdfPath)
        await new Promise((r) => setTimeout(r, 2000))
      }
    }

    // Digita a mensagem
    const inputMensagem = await page.$('[data-testid="conversation-compose-box-input"]')
    if (inputMensagem) {
      await inputMensagem.click()
      await page.keyboard.type(mensagem.mensagem, { delay: 20 })
      await new Promise((r) => setTimeout(r, 500))
      await page.keyboard.press('Enter')
      await new Promise((r) => setTimeout(r, 2000))
    }

    return { sucesso: true }
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  } finally {
    if (browser) await browser.close()
  }
}

export function gerarMensagemPadrao(params: {
  destinatario: string
  mesRelatorio: string
  nomeArquivo?: string
}): string {
  const modelos: Record<string, string> = {
    'Júlia': `Oi Ju! Segue o relatório operacional do Stellar referente ao mês de ${params.mesRelatorio}. Qualquer dúvida me fala! 🚀`,
    'Maria': `Oi Ma! Segue o relatório operacional do Stellar referente ao mês de ${params.mesRelatorio}. Qualquer dúvida me fala!`,
    'Guilherme Nasser': `Oi Guilherme! Segue o resumo do mês de ${params.mesRelatorio} com as informações de produção do Stellar.`,
    'Grupo Sócias Stellar': `Bom dia, sócias! Segue o relatório mensal do Stellar — ${params.mesRelatorio}. Em anexo o PDF com todos os detalhes. Vamos alinhar na nossa próxima reunião! 💪`,
  }

  return modelos[params.destinatario] ||
    `Segue o relatório do Stellar referente ao mês de ${params.mesRelatorio}.`
}
