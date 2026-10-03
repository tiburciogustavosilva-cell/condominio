const service = require('../services/ordensServico.service');

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
  listarAnexos: async (req, res) => res.json(await service.listarAnexos(req.usuario, req.params.id)),
  adicionarAnexo: async (req, res) => res.status(201).json(await service.adicionarAnexo(req.usuario, req.params.id, req.body)),
  anexo: async (req, res) => {
    const a = await service.anexo(req.usuario, req.params.id, req.params.anexoId);
    res.type(a.mimeType).send(a.arquivo);
  },
  removerAnexo: async (req, res) => {
    await service.removerAnexo(req.usuario, req.params.id, req.params.anexoId);
    res.status(204).end();
  }
};
