// Paginación uniforme para listados admin. Devuelve valores saneados.
function parsePagination(query = {}, { defaultPageSize = 20, maxPageSize = 100 } = {}) {
  let page     = parseInt(query.page, 10)
  let pageSize = parseInt(query.pageSize, 10)
  if (!Number.isInteger(page) || page < 1) page = 1
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = defaultPageSize
  if (pageSize > maxPageSize) pageSize = maxPageSize
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

module.exports = { parsePagination }
