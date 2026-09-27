const service = require('../services/tarefas.service');

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
  },
  doDia: async (req, res) => res.json(await service.doDia(req.usuario)),
  concluir: async (req, res) => res.status(201).json(await service.concluir(req.usuario, req.params.id, req.body)),
  perdidas: async (req, res) => res.json(await service.perdidas(req.usuario, req.query)),
  historico: async (req, res) => res.json(await service.historico(req.usuario, req.query)),
  foto: async (req, res) => res.type('image/webp').send(await service.foto(req.usuario, req.params.fotoId))
};
