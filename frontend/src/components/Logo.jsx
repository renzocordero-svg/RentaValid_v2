export default function Logo({ size = 'md', dark = false }) {
  const sizes = {
    sm: { icon: 28, text: 'text-lg' },
    md: { icon: 36, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5">
      <svg width={s.icon} height={s.icon} viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shield shape */}
        <path
          d="M20 2L37 9V24C37 33.5 29.5 41.5 20 43C10.5 41.5 3 33.5 3 24V9L20 2Z"
          fill="#C9A84C"
        />
        <path
          d="M20 4.5L35 11V24C35 32.3 28.3 39.7 20 41.2C11.7 39.7 5 32.3 5 24V11L20 4.5Z"
          fill="#0F2D52"
        />
        {/* House shape inside shield */}
        <path d="M20 13L29 20H27V29H22V24H18V29H13V20H11L20 13Z" fill="#C9A84C" />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`font-extrabold tracking-tight ${s.text} ${dark ? 'text-navy' : 'text-white'}`}
        >
          Renta<span className="text-gold">Valid</span>
        </span>
        <span className={`text-[9px] font-medium tracking-widest uppercase ${dark ? 'text-navy/50' : 'text-white/60'}`}>
          Alquiler con respaldo
        </span>
      </div>
    </div>
  )
}
