const router = require('express').Router();
const c = require('../controllers/tarefas.controller');
const { apenasSindico, apenasStaff } = require('../middlewares/auth');

router.use(apenasStaff); // síndico/administradora e funcionários; condômino não
router.get('/hoje', c.doDia);
router.post('/:id/concluir', c.concluir); // cargo conferido no service
router.get('/fotos/:fotoId', c.foto);

router.get('/execucoes', apenasSindico, c.historico);
router.get('/perdidas', apenasSindico, c.perdidas);
router.get('/', apenasSindico, c.listar);
router.post('/', apenasSindico, c.criar);
router.put('/:id', apenasSindico, c.atualizar);
router.delete('/:id', apenasSindico, c.remover);

module.exports = router;
