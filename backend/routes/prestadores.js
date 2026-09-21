const express = require('express');
const { readDB, writeDB, nextId } = require('../db');
const { autenticar, apenasSindico } = require('../middleware/auth');
const { UNIDADES, statusManutencao } = require('../lib/recorrencia');
const { processarLembretes } = require('../lib/lembretes');
const { emailSimulado } = require('../lib/mailer');

const router = express.Router();

// Módulo inteiro é restrito ao síndico.
router.use(autenticar, apenasSindico);

function manutencaoComContexto(db, m) {
  const prestador = db.prestadores.find((p) => p.id === m.prestadorId);
  const { proxima, dias, status } = statusManutencao(m);
  return {
    ...m,
    prestadorNome: prestador ? prestador.nome : '—',
    prestadorEmail: prestador ? prestador.email : '',
    proximaManutencao: proxima,
    diasParaProxima: dias,
    status
  };
}

/* ------------------------------------------------------------------ */
/*  Config                                                            */
/* ------------------------------------------------------------------ */
router.get('/config', (req, res) => {
  res.json({ emailSimulado });
});

/* ------------------------------------------------------------------ */
/*  Agenda de manutenções (rotas antes de /:id dos prestadores)       */
/* ------------------------------------------------------------------ */
router.get('/manutencoes', (req, res) => {
  const db = readDB();
  const lista = db.manutencoes
    .map((m) => manutencaoComContexto(db, m))
    .sort((a, b) => {
      if (!a.proximaManutencao) return 1;
      if (!b.proximaManutencao) return -1;
      return new Date(a.proximaManutencao) - new Date(b.proximaManutencao);
    });
  res.json(lista);
});

router.post('/manutencoes', (req, res) => {
  const {
    prestadorId,
    titulo,
    descricao,
    ultimaManutencao,
    frequenciaUnidade,
    frequenciaIntervalo,
    diasAntecedencia
  } = req.body;

  if (!prestadorId || !titulo || !ultimaManutencao) {
    return res.status(400).json({ erro: 'Prestador, título e última manutenção são obrigatórios' });
  }
  if (!UNIDADES.includes(frequenciaUnidade)) {
    return res.status(400).json({ erro: 'Frequência deve ser semanal, mensal ou anual' });
  }

  const db = readDB();
  if (!db.prestadores.some((p) => p.id === Number(prestadorId))) {
    return res.status(400).json({ erro: 'Prestador não encontrado' });
  }

  const nova = {
    id: nextId(db.manutencoes),
    prestadorId: Number(prestadorId),
    titulo,
    descricao: descricao || '',
    ultimaManutencao,
    frequenciaUnidade,
    frequenciaIntervalo: Math.max(1, Number(frequenciaIntervalo) || 1),
    diasAntecedencia: Math.max(0, Number(diasAntecedencia) || 0),
    ativo: true,
    ultimoLembreteCiclo: null,
    historico: [],
    criadoEm: new Date().toISOString()
  };

  db.manutencoes.push(nova);
  writeDB(db);
  res.status(201).json(manutencaoComContexto(db, nova));
});

router.patch('/manutencoes/:id', (req, res) => {
  const db = readDB();
  const m = db.manutencoes.find((x) => x.id === Number(req.params.id));
  if (!m) return res.status(404).json({ erro: 'Manutenção não encontrada' });

  const b = req.body;
  let mudouAgenda = false;

  if (b.titulo !== undefined) m.titulo = b.titulo;
  if (b.descricao !== undefined) m.descricao = b.descricao;
  if (b.prestadorId !== undefined) {
    if (!db.prestadores.some((p) => p.id === Number(b.prestadorId))) {
      return res.status(400).json({ erro: 'Prestador não encontrado' });
    }
    m.prestadorId = Number(b.prestadorId);
  }
  if (b.ultimaManutencao !== undefined) {
    m.ultimaManutencao = b.ultimaManutencao;
    mudouAgenda = true;
  }
  if (b.frequenciaUnidade !== undefined) {
    if (!UNIDADES.includes(b.frequenciaUnidade)) {
      return res.status(400).json({ erro: 'Frequência inválida' });
    }
    m.frequenciaUnidade = b.frequenciaUnidade;
    mudouAgenda = true;
  }
  if (b.frequenciaIntervalo !== undefined) {
    m.frequenciaIntervalo = Math.max(1, Number(b.frequenciaIntervalo) || 1);
    mudouAgenda = true;
  }
  if (b.diasAntecedencia !== undefined) {
    m.diasAntecedencia = Math.max(0, Number(b.diasAntecedencia) || 0);
  }
  if (b.ativo !== undefined) m.ativo = !!b.ativo;

  if (mudouAgenda) m.ultimoLembreteCiclo = null; // reavalia o lembrete no novo ciclo

  writeDB(db);
  res.json(manutencaoComContexto(db, m));
});

// Registra que a manutenção foi realizada: move a "última" para a data informada
// (ou hoje) e reinicia o ciclo de lembretes.
router.post('/manutencoes/:id/concluir', (req, res) => {
  const db = readDB();
  const m = db.manutencoes.find((x) => x.id === Number(req.params.id));
  if (!m) return res.status(404).json({ erro: 'Manutenção não encontrada' });

  const data = req.body.data || new Date().toISOString().slice(0, 10);
  m.ultimaManutencao = data;
  m.ultimoLembreteCiclo = null;
  m.historico = m.historico || [];
  m.historico.push({
    tipo: 'realizada',
    data,
    em: new Date().toISOString(),
    detalhe: `Registrada por ${req.usuario.nome}`
  });

  writeDB(db);
  res.json(manutencaoComContexto(db, m));
});

// Dispara o e-mail para o prestador agora (independente da janela).
router.post('/manutencoes/:id/notificar', async (req, res) => {
  const db = readDB();
  const m = db.manutencoes.find((x) => x.id === Number(req.params.id));
  if (!m) return res.status(404).json({ erro: 'Manutenção não encontrada' });

  const enviados = await processarLembretes({ forcarId: m.id });
  if (!enviados.length) {
    return res.status(400).json({ erro: 'Não foi possível enviar (o prestador tem e-mail cadastrado?)' });
  }
  res.json({ ok: true, ...enviados[0] });
});

router.delete('/manutencoes/:id', (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  if (!db.manutencoes.some((m) => m.id === id)) {
    return res.status(404).json({ erro: 'Manutenção não encontrada' });
  }
  db.manutencoes = db.manutencoes.filter((m) => m.id !== id);
  writeDB(db);
  res.status(204).end();
});

/* ------------------------------------------------------------------ */
/*  Prestadores                                                       */
/* ------------------------------------------------------------------ */
router.get('/', (req, res) => {
  const db = readDB();
  const porPrestador = {};
  for (const m of db.manutencoes) {
    porPrestador[m.prestadorId] = (porPrestador[m.prestadorId] || 0) + 1;
  }
  res.json(db.prestadores.map((p) => ({ ...p, manutencoes: porPrestador[p.id] || 0 })));
});

router.post('/', (req, res) => {
  const { nome, email, servico, empresa, telefone, observacao } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios' });
  }
  const db = readDB();
  const novo = {
    id: nextId(db.prestadores),
    nome,
    email,
    servico: servico || '',
    empresa: empresa || '',
    telefone: telefone || '',
    observacao: observacao || '',
    criadoEm: new Date().toISOString()
  };
  db.prestadores.push(novo);
  writeDB(db);
  res.status(201).json({ ...novo, manutencoes: 0 });
});

router.patch('/:id', (req, res) => {
  const db = readDB();
  const p = db.prestadores.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ erro: 'Prestador não encontrado' });
  for (const campo of ['nome', 'email', 'servico', 'empresa', 'telefone', 'observacao']) {
    if (req.body[campo] !== undefined) p[campo] = req.body[campo];
  }
  writeDB(db);
  res.json(p);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  if (!db.prestadores.some((p) => p.id === id)) {
    return res.status(404).json({ erro: 'Prestador não encontrado' });
  }
  db.prestadores = db.prestadores.filter((p) => p.id !== id);
  db.manutencoes = db.manutencoes.filter((m) => m.prestadorId !== id);
  writeDB(db);
  res.status(204).end();
});

module.exports = router;
