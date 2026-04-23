import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const logPath = path.join(process.cwd(), 'logs', 'envios.json')
    if (!fs.existsSync(logPath)) return NextResponse.json([])
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'))
    return NextResponse.json(logs.reverse().slice(0, 100))
  } catch {
    return NextResponse.json([])
  }
}
