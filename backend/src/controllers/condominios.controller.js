const service = require('../services/condominios.service');
const planos = require('../services/planos.service');

module.exports = {
  planos: (req, res) => res.json(planos.catalogo()),
  mudarPlano: async (req, res) => {
    await planos.mudarPlano(req.usuario, req.body.plano);
    res.status(204).end();
  },
  listar: async (req, res) => res.json(await service.listarDaAdministradora(req.usuario)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.usuario, req.body)),
  ativar: async (req, res) => {
    await service.ativar(req.usuario, req.params.id);
    res.status(204).end();
  },
  responderOnboarding: async (req, res) => res.json(await service.responderOnboarding(req.usuario, req.body)),
  atualizarPesoVoto: async (req, res) => {
    await service.atualizarPesoVoto(req.usuario, req.body.pesoVotoPor);
    res.status(204).end();
  }
};
