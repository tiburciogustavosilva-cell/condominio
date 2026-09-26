const router = require('express').Router();
const c = require('../controllers/manutencoes.controller');
const { apenasSindico } = require('../middlewares/auth');

router.use(apenasSindico);
router.get('/', c.listar);
router.get('/config', c.config);
router.post('/', c.criar);
router.put('/:id', c.atualizar);
router.delete('/:id', c.remover);
router.post('/:id/concluir', c.concluir);
router.post('/:id/notificar', c.notificar);

module.exports = router;
