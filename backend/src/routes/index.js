const router = require('express').Router();
const { autenticar, semFuncionario } = require('../middlewares/auth');

router.get('/health', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));
router.use('/auth', require('./auth.routes'));

// Daqui pra baixo, tudo exige Authorization: Bearer <token>.
router.use(autenticar);
router.use('/perfil', require('./perfil.routes'));
router.use('/condominios', semFuncionario, require('./condominios.routes'));
router.use('/moradores', semFuncionario, require('./moradores.routes'));
router.use('/funcionarios', semFuncionario, require('./funcionarios.routes'));
router.use('/unidades', require('./unidades.routes'));
router.use('/avisos', require('./avisos.routes'));
router.use('/chamados', semFuncionario, require('./chamados.routes'));
router.use('/ocorrencias', semFuncionario, require('./ocorrencias.routes'));
router.use('/reservas', semFuncionario, require('./reservas.routes'));
router.use('/encomendas', require('./encomendas.routes'));
router.use('/prestadores', semFuncionario, require('./prestadores.routes'));
router.use('/manutencoes', semFuncionario, require('./manutencoes.routes'));
router.use('/ativos', semFuncionario, require('./ativos.routes'));
router.use('/ordens-servico', semFuncionario, require('./ordensServico.routes'));
router.use('/dashboard', semFuncionario, require('./dashboard.routes'));

module.exports = router;
