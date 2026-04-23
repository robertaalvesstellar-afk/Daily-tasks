import { OAuth2Client, Credentials } from 'google-auth-library'
import fs from 'fs'
import path from 'path'

const TOKENS_PATH = path.join(process.cwd(), 'data', 'tokens.json')

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function getOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
  )
}

export function getAuthUrl(): string {
  const client = getOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export function saveTokens(tokens: Credentials): void {
  const dir = path.dirname(TOKENS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2))
}

export function loadTokens(): Credentials | null {
  try {
    if (!fs.existsSync(TOKENS_PATH)) return null
    const raw = fs.readFileSync(TOKENS_PATH, 'utf-8')
    return JSON.parse(raw) as Credentials
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  const tokens = loadTokens()
  if (!tokens) return false
  // Verifica se o token de acesso ainda é válido (com 5 min de margem)
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 5 * 60 * 1000) {
    // Expirado mas pode ter refresh token
    return !!tokens.refresh_token
  }
  return true
}

export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const tokens = loadTokens()
  if (!tokens) throw new Error('NÃO_AUTENTICADO')

  const client = getOAuth2Client()
  client.setCredentials(tokens)

  // Renovar token se estiver expirando
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 5 * 60 * 1000) {
    const { credentials } = await client.refreshAccessToken()
    saveTokens(credentials)
    client.setCredentials(credentials)
  }

  return client
}
