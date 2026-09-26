const service = require('../services/ocorrencias.service');

module.exports = {
  listar: async (req, res) => res.json(await service.listar(req.usuario)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.usuario, req.body)),
  atualizarStatus: async (req, res) => {
    await service.atualizarStatus(req.usuario, req.params.id, req.body.status);
    res.status(204).end();
  }
};
