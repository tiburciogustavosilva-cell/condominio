const service = require('../services/encomendas.service');

module.exports = {
  listar: async (req, res) => res.json(await service.listar(req.usuario)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.usuario, req.body)),
  foto: async (req, res) => res.type('image/webp').send(await service.foto(req.usuario, req.params.id)),
  retirar: async (req, res) => {
    await service.retirar(req.usuario, req.params.id, req.body);
    res.status(204).end();
  },
  desbloquear: async (req, res) => {
    await service.desbloquear(req.usuario, req.params.id);
    res.status(204).end();
  },
  remover: async (req, res) => {
    await service.remover(req.usuario, req.params.id);
    res.status(204).end();
  }
};
