import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google/auth'

export async function GET() {
  try {
    const url = getAuthUrl()
    return NextResponse.redirect(url)
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao gerar URL de autenticação', detalhes: String(error) },
      { status: 500 }
    )
  }
}
