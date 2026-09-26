const router = require('express').Router();
const c = require('../controllers/funcionarios.controller');
const { apenasSindico } = require('../middlewares/auth');

router.use(apenasSindico);
router.get('/', c.listar);
router.post('/', c.criar);
router.put('/:id', c.atualizar);
router.delete('/:id', c.remover);

module.exports = router;
