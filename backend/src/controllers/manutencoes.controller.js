const service = require('../services/manutencoes.service');

module.exports = {
  listar: async (req, res) => res.json(await service.listar(req.usuario)),
  config: (req, res) => res.json(service.config()),
  criar: async (req, res) => res.status(201).json(await service.criar(req.usuario, req.body)),
  atualizar: async (req, res) => {
    await service.atualizar(req.usuario, req.params.id, req.body);
    res.status(204).end();
  },
  remover: async (req, res) => {
    await service.remover(req.usuario, req.params.id);
    res.status(204).end();
  },
  concluir: async (req, res) => {
    await service.concluir(req.usuario, req.params.id, req.body?.data);
    res.status(204).end();
  },
  notificar: async (req, res) => res.json(await service.notificar(req.usuario, req.params.id))
};
