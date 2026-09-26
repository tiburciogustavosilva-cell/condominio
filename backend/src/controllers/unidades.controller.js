const service = require('../services/unidades.service');

module.exports = {
  listar: async (req, res) => res.json(await service.listar(req.usuario)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.usuario, req.body)),
  atualizar: async (req, res) => {
    await service.atualizar(req.usuario, req.params.id, req.body);
    res.status(204).end();
  },
  remover: async (req, res) => {
    await service.remover(req.usuario, req.params.id);
    res.status(204).end();
  }
};
