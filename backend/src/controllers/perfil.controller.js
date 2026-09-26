const service = require('../services/perfil.service');
const { trocarSenha } = require('../services/auth.service');

module.exports = {
  obter: async (req, res) => res.json(await service.obter(req.usuario)),
  atualizar: async (req, res) => res.json(await service.atualizar(req.usuario, req.body)),
  trocarSenha: async (req, res) => {
    await trocarSenha(req.usuario, req.body.senhaAtual, req.body.novaSenha);
    res.status(204).end();
  },
  concluirTutorial: async (req, res) => {
    await service.concluirTutorial(req.usuario);
    res.status(204).end();
  }
};
