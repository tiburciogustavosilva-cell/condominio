const router = require('express').Router();
const c = require('../controllers/encomendas.controller');
const { apenasSindico, apenasEquipe } = require('../middlewares/auth');

router.get('/', c.listar);
router.get('/:id/foto', c.foto);
router.post('/', apenasEquipe, c.criar);
router.patch('/:id/retirar', apenasEquipe, c.retirar); // exige o código informado pelo morador
router.patch('/:id/desbloquear', apenasSindico, c.desbloquear);
router.delete('/:id', apenasSindico, c.remover);
router.post('/:id/autorizados', c.adicionarAutorizado); // morador autoriza terceiros a retirar
router.delete('/:id/autorizados/:autorizadoId', c.removerAutorizado);

module.exports = router;
