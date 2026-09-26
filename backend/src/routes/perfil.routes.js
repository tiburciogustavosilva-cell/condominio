const router = require('express').Router();
const c = require('../controllers/perfil.controller');

router.get('/', c.obter);
router.put('/', c.atualizar);
router.put('/senha', c.trocarSenha);
router.post('/tutorial', c.concluirTutorial);

module.exports = router;
