const router = require('express').Router();
const service = require('../services/admin.service');

// Admin da plataforma (apenasAdmin no index): todos os condomínios.
router.get('/condominios', async (req, res) => res.json(await service.listar()));
router.post('/condominios', async (req, res) => res.status(201).json(await service.criar(req.body)));
router.post('/condominios/:id/convite', async (req, res) => res.json(await service.reenviarConvite(req.params.id)));
router.get('/condominios/:id/usuarios', async (req, res) => res.json(await service.usuariosDo(req.params.id)));
router.post('/usuarios/:id/acessar', async (req, res) => res.json(await service.acessarComo(req.usuario, req.params.id)));
router.get('/pendentes', async (req, res) => res.json(await service.pendentes()));
router.post('/usuarios/:id/confirmar-email', async (req, res) => {
  await service.confirmarEmail(req.params.id);
  res.status(204).end();
});
router.get('/condominios/:id/pagamentos', async (req, res) => res.json(await service.pagamentosDo(req.params.id)));
router.post('/condominios/:id/pagamentos', async (req, res) =>
  res.status(201).json(await service.registrarPagamento(req.params.id, req.body))
);
router.delete('/pagamentos/:id', async (req, res) => {
  await service.excluirPagamento(req.params.id);
  res.status(204).end();
});
router.patch('/condominios/:id', async (req, res) => res.json(await service.atualizar(req.params.id, req.body)));

module.exports = router;
