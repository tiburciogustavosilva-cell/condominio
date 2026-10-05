const router = require('express').Router();
const { autenticar, exigirLiberado, exigirRecurso, apenasAdmin, semFuncionario } = require('../middlewares/auth');

router.get('/health', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));
router.use('/auth', require('./auth.routes'));

// Daqui pra baixo, tudo exige Authorization: Bearer <token>.
router.use(autenticar);
router.use('/admin', apenasAdmin, require('./admin.routes'));
// Antes da trava: a administradora troca de condomínio mesmo com o ativo bloqueado.
router.use('/condominios', semFuncionario, require('./condominios.routes'));

// Daqui pra baixo, condomínio bloqueado não entra.
router.use(exigirLiberado);
router.use('/perfil', require('./perfil.routes'));
router.use('/moradores', semFuncionario, require('./moradores.routes'));
router.use('/funcionarios', semFuncionario, exigirRecurso('funcionarios'), require('./funcionarios.routes'));
router.use('/unidades', require('./unidades.routes'));
router.use('/mapa', semFuncionario, exigirRecurso('mapa'), require('./mapa.routes'));
router.use('/avisos', exigirRecurso('avisos'), require('./avisos.routes'));
router.use('/chamados', semFuncionario, exigirRecurso('chamados'), require('./chamados.routes'));
router.use('/ocorrencias', semFuncionario, exigirRecurso('ocorrencias'), require('./ocorrencias.routes'));
router.use('/reservas', semFuncionario, exigirRecurso('reservas'), require('./reservas.routes'));
router.use('/encomendas', exigirRecurso('encomendas'), require('./encomendas.routes'));
router.use('/tarefas', exigirRecurso('tarefas'), require('./tarefas.routes'));
router.use('/assembleias', semFuncionario, exigirRecurso('assembleias'), require('./assembleias.routes'));
router.use('/prestadores', semFuncionario, exigirRecurso('manutencoes'), require('./prestadores.routes'));
router.use('/manutencoes', semFuncionario, exigirRecurso('manutencoes'), require('./manutencoes.routes'));
router.use('/ativos', semFuncionario, exigirRecurso('manutencoes'), require('./ativos.routes'));
router.use('/ordens-servico', semFuncionario, exigirRecurso('manutencoes'), require('./ordensServico.routes'));
router.use('/dashboard', semFuncionario, require('./dashboard.routes'));

module.exports = router;
