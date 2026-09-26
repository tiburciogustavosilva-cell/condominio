const router = require('express').Router();
const c = require('../controllers/reservas.controller');

router.get('/', c.listar);
router.post('/', c.criar);
router.patch('/:id/status', c.atualizarStatus); // dono só cancela; regra no service

module.exports = router;
