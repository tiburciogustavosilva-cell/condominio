const router = require('express').Router();
const c = require('../controllers/chamados.controller');
const { apenasSindico } = require('../middlewares/auth');

router.get('/', c.listar);
router.get('/:id', c.obter);
router.post('/', c.criar);
router.patch('/:id/status', apenasSindico, c.atualizarStatus);
router.post('/:id/comentarios', c.comentar);

module.exports = router;
