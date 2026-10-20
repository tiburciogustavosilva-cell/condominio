const service = require('../services/relatorios.service');

module.exports = {
  resumo: async (req, res) => res.json(await service.resumo(req.usuario, Number(req.query.meses)))
};
