import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Shield } from 'lucide-react'
import Logo from './Logo'

const COLUMNS = [
  {
    title: 'Plataforma',
    links: [
      { label: 'Buscar inmuebles',   to: '/inmuebles' },
      { label: 'Publicar inmueble',  to: '/publicar'  },
      { label: 'Scoring de inquilino', to: '/scoring' },
      { label: 'Firma digital',      to: '/registro'  },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Ley N° 30933',           href: '#' },
      { label: 'Términos y condiciones', href: '#' },
      { label: 'Política de privacidad', href: '#' },
      { label: 'Tratamiento de datos',   href: '#' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Nosotros',      href: '#' },
      { label: 'Blog',          href: '#' },
      { label: 'Prensa',        href: '#' },
      { label: 'Trabaja con nosotros', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-[#0B1A2E] text-white/60">

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">

          {/* Brand — 2 columns wide */}
          <div className="md:col-span-2">
            <Logo size="sm" dark={false} />
            <p className="mt-4 text-sm leading-relaxed text-white/50 max-w-xs">
              La plataforma peruana de alquiler con validación legal, respaldada en la Ley N° 30933 y verificación ante RENIEC.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 mt-5">
              {['RENIEC', 'INFOCORP', 'LEY 30933', 'SUNAT'].map(b => (
                <span key={b} className="text-[10px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-2.5 py-1 rounded-full">
                  {b}
                </span>
              ))}
            </div>

            {/* Socials */}
            <div className="flex gap-3 mt-6">
              {[
                { Icon: Facebook, href: '#'  },
                { Icon: Instagram, href: '#' },
                { Icon: Linkedin, href: '#'  },
              ].map(({ Icon, href }) => (
                <a
                  key={href + Icon.name}
                  href={href}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-[#C9A84C]/20 flex items-center justify-center text-white/40 hover:text-[#C9A84C] transition-all"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map(col => (
            <div key={col.title}>
              <h4 className="text-white font-semibold text-sm mb-5">{col.title}</h4>
              <ul className="space-y-3 text-sm">
                {col.links.map(l => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="hover:text-[#C9A84C] transition-colors duration-200">{l.label}</Link>
                    ) : (
                      <a href={l.href} className="hover:text-[#C9A84C] transition-colors duration-200">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact row */}
        <div className="mt-12 pt-8 border-t border-white/8 grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { icon: Mail,   text: 'contacto@rentavalid.pe'    },
            { icon: Phone,  text: '+51 01 700 8900'            },
            { icon: MapPin, text: 'Av. El Derby 055, Surco, Lima' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors">
              <Icon size={14} className="text-[#C9A84C] flex-shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/25">
          <p>© 2026 RentaValid S.A.C. Todos los derechos reservados.</p>
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-[#C9A84C]" />
            <span className="text-white/40">Plataforma segura · Datos protegidos · Contratos verificados</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
