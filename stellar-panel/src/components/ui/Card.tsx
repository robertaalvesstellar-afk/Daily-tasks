import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-[#1a2340] border border-[#2a3558] rounded-xl',
        padding && 'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  valor: string | number
  sub?: string
  cor?: 'azul' | 'verde' | 'vermelho' | 'ouro' | 'normal'
  icon?: React.ReactNode
}

export function StatCard({ label, valor, sub, cor = 'normal', icon }: StatCardProps) {
  const cores = {
    azul: 'text-[#3366ff]',
    verde: 'text-[#22c55e]',
    vermelho: 'text-[#ef4444]',
    ouro: 'text-[#e8b820]',
    normal: 'text-white',
  }

  return (
    <div className="bg-[#1a2340] border border-[#2a3558] rounded-xl p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">{label}</p>
        {icon && <div className="text-[#94a3b8]">{icon}</div>}
      </div>
      <p className={clsx('text-3xl font-bold', cores[cor])}>{valor}</p>
      {sub && <p className="text-xs text-[#64748b] mt-1">{sub}</p>}
    </div>
  )
}
