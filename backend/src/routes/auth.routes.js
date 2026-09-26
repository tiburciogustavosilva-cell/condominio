const router = require('express').Router();
const c = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');

router.post('/login', c.login);
router.post('/cadastro', c.cadastrar);
router.get('/me', autenticar, c.me);

module.exports = router;
