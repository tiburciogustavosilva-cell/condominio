const router = require('express').Router();
const c = require('../controllers/condominios.controller');
const { apenasSindico } = require('../middlewares/auth');

// Onboarding do condomínio ativo (síndico/administradora)
router.put('/atual', apenasSindico, c.responderOnboarding);
// Administradora: seus condomínios (checagem de papel no service)
router.get('/', c.listar);
router.post('/', c.criar);
router.post('/:id/ativar', c.ativar);

module.exports = router;
