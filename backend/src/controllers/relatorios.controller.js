const service = require('../services/relatorios.service');

module.exports = {
  resumo: async (req, res) => res.json(await service.resumo(req.usuario, { meses: Number(req.query.meses), de: req.query.de, ate: req.query.ate }))
};
