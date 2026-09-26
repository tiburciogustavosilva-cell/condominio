const service = require('../services/dashboard.service');

module.exports = {
  resumo: async (req, res) => res.json(await service.resumo(req.usuario))
};
