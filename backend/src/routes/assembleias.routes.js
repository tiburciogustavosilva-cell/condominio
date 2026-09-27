const router = require('express').Router();
const c = require('../controllers/assembleias.controller');
const { apenasSindico } = require('../middlewares/auth');

// síndico/administradora conduz; condômino faz check-in e vota (cargo conferido no service)
router.get('/', c.listar);
router.post('/', apenasSindico, c.criar);
router.patch('/pautas/:pautaId', apenasSindico, c.mudarStatusPauta);
router.put('/pautas/:pautaId', apenasSindico, c.editarPauta);
router.delete('/pautas/:pautaId', apenasSindico, c.removerPauta);
router.post('/pautas/:pautaId/votar', c.votar);
router.get('/:id', c.estado);
router.post('/:id/checkin', c.checkin);
router.post('/:id/presencas', apenasSindico, c.marcarPresenca);
router.delete('/:id/presencas/:unidadeId', apenasSindico, c.removerPresenca);
router.post('/:id/procuracoes', apenasSindico, c.adicionarProcuracao);
router.delete('/:id/procuracoes/:procuracaoId', apenasSindico, c.removerProcuracao);
router.delete('/:id', apenasSindico, c.remover);
router.post('/:id/pautas', apenasSindico, c.adicionarPauta);
router.post('/:id/encerrar', apenasSindico, c.encerrar);

module.exports = router;
