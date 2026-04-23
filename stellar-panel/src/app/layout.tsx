import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Painel Stellar',
  description: 'Assistente operacional de agenda e cronograma do Stellar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex h-screen overflow-hidden bg-[#0f1629]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a2340',
              color: '#e2e8f0',
              border: '1px solid #2a3558',
              borderRadius: '8px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1a2340' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1a2340' } },
          }}
        />
      </body>
    </html>
  )
}
