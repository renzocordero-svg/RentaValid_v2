require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// ── Datos de prueba ───────────────────────────────────────────────────────────

const PROPIEDADES = [
  {
    titulo:       'Departamento moderno con vista al parque',
    descripcion:  'Amplio departamento totalmente amoblado en el corazón de Miraflores. Vista al parque Kennedy, acabados de lujo, cocina equipada con electrodomésticos de primera línea. Edificio con seguridad 24/7, gimnasio y área de lavandería.',
    direccion:    'Av. Larco 820, Piso 8',
    distrito:     'Miraflores',
    area:         75,
    habitaciones: 2,
    banos:        2,
    cochera:      true,
    amoblado:     true,
    precio:       1800,
    mesesGarantia: 2,
    tipo:         'Departamento',
    fotos: [
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', orden: 1 },
      { url: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800&q=80', orden: 2 },
      { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', orden: 3 },
    ],
  },
  {
    titulo:       'Casa independiente cerca al Bosque El Olivar',
    descripcion:  'Elegante casa independiente con jardín en la mejor zona de San Isidro. 4 habitaciones, sala formal, comedor, estudio y cochera doble. Zona tranquila a 200m del Bosque El Olivar.',
    direccion:    'Calle Los Libertadores 340',
    distrito:     'San Isidro',
    area:         180,
    habitaciones: 4,
    banos:        3,
    cochera:      true,
    amoblado:     false,
    precio:       3200,
    mesesGarantia: 3,
    tipo:         'Casa',
    fotos: [
      { url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80', orden: 1 },
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80', orden: 2 },
    ],
  },
  {
    titulo:       'Studio moderno cerca al Jockey Plaza',
    descripcion:  'Studio recién remodelado ideal para jóvenes profesionales. Cocina americana integrada, baño con acabados en mármol. A 5 min del CC Jockey Plaza y acceso rápido a la Vía Expresa.',
    direccion:    'Av. Primavera 1560, Piso 3',
    distrito:     'Santiago de Surco',
    area:         45,
    habitaciones: 1,
    banos:        1,
    cochera:      false,
    amoblado:     true,
    precio:       1200,
    mesesGarantia: 2,
    tipo:         'Studio',
    fotos: [
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', orden: 1 },
      { url: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80', orden: 2 },
    ],
  },
  {
    titulo:       'Piso artístico con balcón en Barranco',
    descripcion:  'Hermoso piso en el bohemio Barranco, a pasos del parque principal. Techos altos a 3m, pisos de parquet noble, balcón con vista a la ciudad. Rodeado de galerías de arte y restaurantes.',
    direccion:    'Jr. Unión 450, Piso 5',
    distrito:     'Barranco',
    area:         95,
    habitaciones: 3,
    banos:        2,
    cochera:      true,
    amoblado:     false,
    precio:       2100,
    mesesGarantia: 2,
    tipo:         'Departamento',
    fotos: [
      { url: 'https://images.unsplash.com/photo-1493809842364-78817f7b51b?w=800&q=80', orden: 1 },
      { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80', orden: 2 },
    ],
  },
  {
    titulo:       'Departamento familiar con piscina en San Borja',
    descripcion:  'Amplio departamento familiar en zona residencial consolidada y tranquila. Totalmente amoblado, cerca al Gran Parque de San Borja, colegios y centros comerciales. Piscina y gimnasio en el edificio.',
    direccion:    'Av. San Borja Norte 891, Piso 6',
    distrito:     'San Borja',
    area:         110,
    habitaciones: 3,
    banos:        2,
    cochera:      true,
    amoblado:     true,
    precio:       2400,
    mesesGarantia: 2,
    tipo:         'Departamento',
    fotos: [
      { url: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80', orden: 1 },
      { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80', orden: 2 },
    ],
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed…\n')

  // Limpia datos previos en orden de dependencias (para re-seeds)
  await prisma.payment.deleteMany()
  await prisma.signature.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.application.deleteMany()
  await prisma.score.deleteMany()
  await prisma.propertyPhoto.deleteMany()
  await prisma.property.deleteMany()
  await prisma.verificationCode.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.user.deleteMany()
  // Los roles los dejamos con upsert para no romper referencias futuras
  console.log('🗑️  Datos anteriores eliminados\n')

  // ── Roles ──────────────────────────────────────────────────────────────────
  const [roleArrendador, roleArrendatario] = await Promise.all([
    prisma.role.upsert({ where: { nombre: 'Arrendador'   }, update: {}, create: { nombre: 'Arrendador'   } }),
    prisma.role.upsert({ where: { nombre: 'Arrendatario' }, update: {}, create: { nombre: 'Arrendatario' } }),
    prisma.role.upsert({ where: { nombre: 'Admin'        }, update: {}, create: { nombre: 'Admin'        } }),
  ])
  console.log('✅ Roles: Arrendador · Arrendatario · Admin\n')

  // ── Arrendador ─────────────────────────────────────────────────────────────
  const arrendador = await prisma.user.create({
    data: {
      dni:               '08234561',
      nombre:            'Carlos',
      apellidoPaterno:   'Mendoza',
      apellidoMaterno:   'Ríos',
      email:             'carlos.mendoza@rentavalid.pe',
      telefono:          '+51 987 111 222',
      passwordHash:      await bcrypt.hash('Demo1234!', 12),
      identidadValidada: true,
      fotoUrl:           'https://randomuser.me/api/portraits/men/32.jpg',
      roles:             { create: { roleId: roleArrendador.id } },
    },
  })
  console.log(`✅ Arrendador  → ${arrendador.nombre} ${arrendador.apellidoPaterno} (id ${arrendador.id})`)
  console.log(`   Email: carlos.mendoza@rentavalid.pe · Pass: Demo1234!\n`)

  // ── Arrendatario ───────────────────────────────────────────────────────────
  const arrendatario = await prisma.user.create({
    data: {
      dni:               '47382910',
      nombre:            'Diego',
      apellidoPaterno:   'Salinas',
      apellidoMaterno:   'Vega',
      email:             'diego.salinas@gmail.com',
      telefono:          '+51 987 654 321',
      passwordHash:      await bcrypt.hash('Demo1234!', 12),
      identidadValidada: true,
      fotoUrl:           'https://randomuser.me/api/portraits/men/45.jpg',
      roles:             { create: { roleId: roleArrendatario.id } },
      score: {
        create: {
          ingreso:      4500,
          topeAlquiler: 2250,
          decision:     'Aprobado',
          detalle: {
            ingresos:   { puntuacion: 85, resumen: 'Ingreso estable S/ 4,500/mes' },
            infocorp:   { puntuacion: 91, resumen: 'Clasificación NORMAL · Sin deudas vencidas' },
            documentos: { puntuacion: 100, resumen: 'DNI y biometría verificados con RENIEC' },
            puntajeTotal: 87,
          },
        },
      },
    },
  })
  console.log(`✅ Arrendatario→ ${arrendatario.nombre} ${arrendatario.apellidoPaterno} (id ${arrendatario.id})`)
  console.log(`   Email: diego.salinas@gmail.com · Pass: Demo1234! · Score: 87/100\n`)

  // ── Propiedades ────────────────────────────────────────────────────────────
  console.log('🏠 Creando inmuebles…')
  for (const { fotos, tipo, ...data } of PROPIEDADES) {
    const property = await prisma.property.create({
      data: {
        ...data,
        tipo,
        arrendadorId: arrendador.id,
        fotos: { create: fotos },
      },
    })
    console.log(`   ✅ [${property.id}] ${property.titulo} — ${property.distrito} · S/ ${property.precio}/mes`)
  }

  console.log('\n🎉 Seed completado exitosamente.')
  console.log('─'.repeat(52))
  console.log('  Credenciales de prueba:')
  console.log('  Arrendador  → carlos.mendoza@rentavalid.pe / Demo1234!')
  console.log('  Arrendatario→ diego.salinas@gmail.com       / Demo1234!')
  console.log('─'.repeat(52))
}

main()
  .catch((e) => { console.error('\n❌ Error en seed:', e.message); process.exit(1) })
  .finally(()  => prisma.$disconnect())
