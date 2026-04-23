'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  CheckSquare,
  MessageCircle,
  Settings,
  Star,
  ScrollText,
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/relatorio', label: 'Relatório', icon: FileText },
  { href: '/reunioes', label: 'Reuniões', icon: CalendarDays },
  { href: '/aprovacao', label: 'Aprovação', icon: CheckSquare },
  { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/preferencias', label: 'Preferências', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-[#111827] border-r border-[#2a3558] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#2a3558]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3366ff] to-[#6090ff] flex items-center justify-center">
            <Star size={16} className="text-white fill-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Stellar</div>
            <div className="text-[10px] text-[#94a3b8]">Painel Operacional</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                ativo
                  ? 'bg-[#1e3a8a] text-white'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1a2340]'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-5 py-4 border-t border-[#2a3558]">
        <div className="text-[10px] text-[#475569]">Painel Stellar v1.0</div>
        <div className="text-[10px] text-[#475569]">uso interno</div>
      </div>
    </aside>
  )
}
