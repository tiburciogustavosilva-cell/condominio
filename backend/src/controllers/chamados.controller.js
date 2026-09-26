const service = require('../services/chamados.service');

module.exports = {
  listar: async (req, res) => res.json(await service.listar(req.usuario, req.query.status)),
  obter: async (req, res) => res.json(await service.obter(req.usuario, req.params.id)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.usuario, req.body)),
  atualizarStatus: async (req, res) => {
    await service.atualizarStatus(req.usuario, req.params.id, req.body.status);
    res.status(204).end();
  },
  comentar: async (req, res) => res.status(201).json(await service.comentar(req.usuario, req.params.id, req.body.texto))
};
