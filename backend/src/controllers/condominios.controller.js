const service = require('../services/condominios.service');

module.exports = {
  listar: async (req, res) => res.json(await service.listarDaAdministradora(req.usuario)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.usuario, req.body)),
  ativar: async (req, res) => {
    await service.ativar(req.usuario, req.params.id);
    res.status(204).end();
  },
  responderOnboarding: async (req, res) => res.json(await service.responderOnboarding(req.usuario, req.body))
};
