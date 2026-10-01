const router = require('express').Router();
const service = require('../services/mapa.service');
const { apenasSindico } = require('../middlewares/auth');

router.use(apenasSindico);
router.get('/', async (req, res) => res.json(await service.listar(req.usuario)));
router.put('/', async (req, res) => {
  await service.salvar(req.usuario, req.body);
  res.status(204).end();
});

module.exports = router;
