// Formato uniforme: { data } en éxito, { error } en fallo
const ok   = (res, data, status = 200) => res.status(status).json({ data })
const fail = (res, status, message)    => res.status(status).json({ error: message })

module.exports = { ok, fail }
