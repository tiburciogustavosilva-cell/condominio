const router = require('express').Router();
const c = require('../controllers/ocorrencias.controller');
const { apenasSindico } = require('../middlewares/auth');

router.get('/', c.listar);
router.post('/', c.criar);
router.patch('/:id/status', apenasSindico, c.atualizarStatus);

module.exports = router;
