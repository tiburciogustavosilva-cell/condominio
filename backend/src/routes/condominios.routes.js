const router = require('express').Router();
const c = require('../controllers/condominios.controller');
const { apenasSindico, exigirLiberado } = require('../middlewares/auth');

// Onboarding do condomínio ativo (síndico/administradora)
router.put('/atual', exigirLiberado, apenasSindico, c.responderOnboarding);
// Qual campo da unidade decide o peso do voto nas assembleias
router.patch('/peso-voto', exigirLiberado, apenasSindico, c.atualizarPesoVoto);
// Planos: o síndico troca mesmo com o teste vencido (é assim que ele escolhe o que vai pagar)
router.get('/planos', c.planos);
router.patch('/plano', apenasSindico, c.mudarPlano);
// Administradora: seus condomínios (checagem de papel no service)
router.get('/', c.listar);
router.post('/', c.criar);
router.post('/:id/ativar', c.ativar);

module.exports = router;
