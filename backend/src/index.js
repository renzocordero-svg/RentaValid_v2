require('dotenv').config()

const app  = require('./app')
const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`RentaValid API corriendo en http://localhost:${PORT}`)
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`)
})
