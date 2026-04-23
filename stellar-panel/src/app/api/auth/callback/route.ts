import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client, saveTokens } from '@/lib/google/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/?erro=${encodeURIComponent('Autenticação cancelada: ' + error)}`, req.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?erro=Código+de+autorização+não+recebido', req.url)
    )
  }

  try {
    const client = getOAuth2Client()
    const { tokens } = await client.getToken(code)
    saveTokens(tokens)

    return NextResponse.redirect(new URL('/?conectado=true', req.url))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao trocar código por tokens'
    return NextResponse.redirect(
      new URL(`/?erro=${encodeURIComponent(msg)}`, req.url)
    )
  }
}
