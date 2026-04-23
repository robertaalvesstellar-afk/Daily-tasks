import clsx from 'clsx'

type Variante = 'azul' | 'verde' | 'vermelho' | 'ouro' | 'cinza' | 'roxo'

interface BadgeProps {
  children: React.ReactNode
  variante?: Variante
  className?: string
}

const estilos: Record<Variante, string> = {
  azul: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  verde: 'bg-green-900/40 text-green-300 border-green-700/50',
  vermelho: 'bg-red-900/40 text-red-300 border-red-700/50',
  ouro: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
  cinza: 'bg-slate-800 text-slate-300 border-slate-700',
  roxo: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
}

export function Badge({ children, variante = 'cinza', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
        estilos[variante],
        className
      )}
    >
      {children}
    </span>
  )
}

export function statusParaVariante(status: string): Variante {
  const s = (status || '').toLowerCase()
  if (['concluído', 'concluido', 'feito', 'done', 'ok', 'finalizado'].some((v) => s.includes(v))) return 'verde'
  if (['atrasado', 'vencido', 'crítico', 'urgente'].some((v) => s.includes(v))) return 'vermelho'
  if (['andamento', 'progresso', 'em curso'].some((v) => s.includes(v))) return 'azul'
  if (['pausado', 'bloqueado', 'impedido'].some((v) => s.includes(v))) return 'ouro'
  if (['sugerida', 'pendente'].some((v) => s.includes(v))) return 'ouro'
  if (['aprovada', 'existente'].some((v) => s.includes(v))) return 'verde'
  if (['rejeitada'].some((v) => s.includes(v))) return 'vermelho'
  return 'cinza'
}
