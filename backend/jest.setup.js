// Variables de entorno disponibles en todos los tests antes de que
// cualquier módulo sea cargado (los tests importan app.js directamente,
// sin dotenv, por lo que debemos setearlas aquí).
process.env.NODE_ENV   = 'test'
process.env.JWT_SECRET = 'test_secret_jwt_rentavalid_2026_no_usar_en_prod'
