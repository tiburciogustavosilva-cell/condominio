const router = require('express').Router();
const { apenasSindico } = require('../middlewares/auth');
const c = require('../controllers/relatorios.controller');

router.get('/', apenasSindico, c.resumo);

module.exports = router;
