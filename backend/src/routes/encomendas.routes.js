const router = require('express').Router();
const c = require('../controllers/encomendas.controller');
const { apenasSindico, apenasEquipe } = require('../middlewares/auth');

router.get('/', c.listar);
router.get('/:id/foto', c.foto);
router.post('/', apenasEquipe, c.criar);
router.patch('/:id/retirar', apenasEquipe, c.retirar); // alternativa: código informado pelo morador + nome
router.post('/:id/qr-retirada', apenasEquipe, c.gerarQrRetirada); // portaria gera o QR (principal)
router.post('/retirar-qr', c.retirarComQr); // o próprio morador confirma escaneando o QR
router.patch('/:id/desbloquear', apenasSindico, c.desbloquear);
router.delete('/:id', apenasSindico, c.remover);
router.post('/:id/autorizados', c.adicionarAutorizado); // morador autoriza terceiros a retirar
router.delete('/:id/autorizados/:autorizadoId', c.removerAutorizado);

module.exports = router;
