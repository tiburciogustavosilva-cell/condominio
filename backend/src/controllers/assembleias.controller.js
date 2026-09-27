const service = require('../services/assembleias.service');

module.exports = {
  listar: async (req, res) => res.json(await service.listar(req.usuario)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.usuario, req.body)),
  estado: async (req, res) => res.json(await service.estado(req.usuario, req.params.id)),
  adicionarPauta: async (req, res) => res.status(201).json(await service.adicionarPauta(req.usuario, req.params.id, req.body)),
  mudarStatusPauta: async (req, res) => {
    await service.mudarStatusPauta(req.usuario, req.params.pautaId, req.body.status);
    res.status(204).end();
  },
  marcarPresenca: async (req, res) => {
    await service.marcarPresenca(req.usuario, req.params.id, req.body.unidadeId);
    res.status(204).end();
  },
  remover: async (req, res) => {
    await service.remover(req.usuario, req.params.id);
    res.status(204).end();
  },
  editarPauta: async (req, res) => {
    await service.editarPauta(req.usuario, req.params.pautaId, req.body);
    res.status(204).end();
  },
  removerPauta: async (req, res) => {
    await service.removerPauta(req.usuario, req.params.pautaId);
    res.status(204).end();
  },
  removerPresenca: async (req, res) => {
    await service.removerPresenca(req.usuario, req.params.id, req.params.unidadeId);
    res.status(204).end();
  },
  adicionarProcuracao: async (req, res) =>
    res.status(201).json(await service.adicionarProcuracao(req.usuario, req.params.id, req.body)),
  removerProcuracao: async (req, res) => {
    await service.removerProcuracao(req.usuario, req.params.id, req.params.procuracaoId);
    res.status(204).end();
  },
  encerrar: async (req, res) => {
    await service.encerrar(req.usuario, req.params.id);
    res.status(204).end();
  },
  checkin: async (req, res) => {
    await service.checkin(req.usuario, req.params.id, req.body);
    res.status(204).end();
  },
  votar: async (req, res) => {
    await service.votar(req.usuario, req.params.pautaId, req.body);
    res.status(204).end();
  }
};
