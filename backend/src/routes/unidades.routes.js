const router = require('express').Router();
const c = require('../controllers/unidades.controller');
const { apenasSindico } = require('../middlewares/auth');

router.get('/', c.listar);
router.post('/', apenasSindico, c.criar);
router.put('/:id', apenasSindico, c.atualizar);
router.delete('/:id', apenasSindico, c.remover);

module.exports = router;
