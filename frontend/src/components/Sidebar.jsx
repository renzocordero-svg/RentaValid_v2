import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  X, LayoutDashboard, Search, CreditCard, Star, User,
  PlusCircle, Building2, LogOut, ChevronRight,
  FileText, Settings,
} from 'lucide-react'
import Logo from './Logo'
import { useAuthStore } from '../store/authStore'

const SECTIONS = [
  {
    key: 'principal',
    title: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Panel',            href: '/pagos'    },
      { icon: Search,          label: 'Buscar inmuebles', href: '/inmuebles' },
    ],
  },
  {
    key: 'arrendatario',
    title: 'Inquilino',
    roles: ['Arrendatario'],
    items: [
      { icon: Star,       label: 'Mi scoring',    href: '/scoring'  },
      { icon: FileText,   label: 'Mis contratos', href: '/pagos'    },
      { icon: CreditCard, label: 'Mis pagos',     href: '/pagos'    },
    ],
  },
  {
    key: 'arrendador',
    title: 'Propietario',
    roles: ['Arrendador'],
    items: [
      { icon: Building2,  label: 'Mis propiedades',    href: '/inmuebles' },
      { icon: PlusCircle, label: 'Publicar inmueble',  href: '/publicar'  },
      { icon: CreditCard, label: 'Mis ingresos',       href: '/pagos'     },
    ],
  },
  {
    key: 'cuenta',
    title: 'Cuenta',
    items: [
      { icon: User,     label: 'Mi perfil',      href: '/perfil' },
      { icon: Settings, label: 'Configuración',  href: '/perfil' },
    ],
  },
]

export default function Sidebar({ open, onClose }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { user, logout, hasRole } = useAuthStore()

  // Cerrar al cambiar de ruta
  useEffect(() => { onClose() }, [location.pathname])

  if (!open) return null

  const nombre = [user?.nombre, user?.apellidoPaterno].filter(Boolean).join(' ') || 'Usuario'
  const inicial = (user?.nombre?.[0] ?? '?').toUpperCase()
  const roles   = user?.roles ?? []

  const doLogout = () => { logout(); navigate('/'); onClose() }

  const isActive = (href) => {
    if (href === '/pagos') return location.pathname === '/pagos'
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1B2A4A]/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#1B2A4A] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <Logo size="sm" dark={false} />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#1B2A4A] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-extrabold text-sm">{inicial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#1B2A4A] text-sm truncate">{nombre}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {roles.map(r => (
                  <span key={r} className="badge bg-[#C9A84C]/15 text-[#1B2A4A] text-[9px] px-2 py-0.5">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {SECTIONS.map(section => {
            // Filtrar por rol
            if (section.roles) {
              const visible = section.roles.some(r => roles.includes(r))
              if (!visible) return null
            }
            return (
              <div key={section.key} className="mb-2">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 py-1.5">
                  {section.title}
                </p>
                {section.items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.label}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        active
                          ? 'bg-[#1B2A4A] text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[#1B2A4A]'
                      }`}
                    >
                      <item.icon
                        size={16}
                        className={active ? 'text-[#C9A84C]' : 'text-gray-400 group-hover:text-[#1B2A4A] transition-colors'}
                      />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight size={12} className="text-[#C9A84C]" />}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 px-3 py-3">
          <button
            onClick={doLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-[9px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded">LEY 30933</span>
            <span className="text-[9px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded">RENIEC</span>
            <span className="text-[9px] text-gray-300">v2.0</span>
          </div>
        </div>
      </div>
    </>
  )
}
