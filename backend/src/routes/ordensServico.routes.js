const router = require('express').Router();
const c = require('../controllers/ordensServico.controller');
const { apenasSindico } = require('../middlewares/auth');

router.use(apenasSindico);
router.get('/', c.listar);
router.post('/', c.criar);
router.put('/:id', c.atualizar);
router.delete('/:id', c.remover);
router.get('/:id/anexos', c.listarAnexos);
router.post('/:id/anexos', c.adicionarAnexo);
router.get('/:id/anexos/:anexoId', c.anexo);
router.delete('/:id/anexos/:anexoId', c.removerAnexo);

module.exports = router;
