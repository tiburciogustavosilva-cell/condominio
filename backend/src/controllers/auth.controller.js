const service = require('../services/auth.service');

module.exports = {
  login: async (req, res) => res.json(await service.login(req.body.email, req.body.senha)),
  cadastrar: async (req, res) => res.status(201).json(await service.cadastrar(req.body)),
  me: async (req, res) => res.json(await service.sessaoDe(req.usuario))
};
