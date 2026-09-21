const express = require('express');
const { readDB, writeDB, nextId } = require('../db');
const { autenticar, apenasSindico } = require('../middleware/auth');

const router = express.Router();
const PERIODOS = ['manha', 'tarde', 'noite', 'dia_todo'];
const STATUS = ['pendente', 'aprovada', 'rejeitada', 'cancelada'];

function enriquecer(db, r) {
  const area = db.areas.find((a) => a.id === r.areaId);
  const usuario = db.usuarios.find((u) => u.id === r.usuarioId);
  const unidade = db.unidades.find((u) => u.id === r.unidadeId);
  return {
    ...r,
    areaNome: area ? area.nome : 'Área removida',
    taxa: area ? area.taxa : 0,
    solicitante: usuario ? usuario.nome : 'Desconhecido',
    unidadeLabel: unidade ? `${unidade.bloco} - ${unidade.numero}` : '-'
  };
}

// Lista as areas comuns disponiveis para reserva
router.get('/areas', autenticar, (req, res) => {
  const db = readDB();
  res.json(db.areas);
});

// Lista reservas: sindico ve todas, condomino ve so as proprias
router.get('/', autenticar, (req, res) => {
  const db = readDB();
  let lista = db.reservas;
  if (req.usuario.papel !== 'sindico') {
    lista = lista.filter((r) => r.usuarioId === req.usuario.id);
  }
  lista = [...lista]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .map((r) => enriquecer(db, r));
  res.json(lista);
});

// Solicita uma reserva (qualquer usuario logado)
router.post('/', autenticar, (req, res) => {
  const { areaId, data, periodo, observacao } = req.body;
  if (!areaId || !data || !periodo) {
    return res.status(400).json({ erro: 'Área, data e período são obrigatórios' });
  }
  if (!PERIODOS.includes(periodo)) {
    return res.status(400).json({ erro: `Período deve ser um de: ${PERIODOS.join(', ')}` });
  }

  const db = readDB();
  if (!db.areas.some((a) => a.id === Number(areaId))) {
    return res.status(400).json({ erro: 'Área não encontrada' });
  }
  if (data < new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ erro: 'A data não pode estar no passado' });
  }

  const conflito = db.reservas.some(
    (r) =>
      r.areaId === Number(areaId) &&
      r.data === data &&
      r.status === 'aprovada' &&
      (r.periodo === periodo || r.periodo === 'dia_todo' || periodo === 'dia_todo')
  );
  if (conflito) {
    return res.status(409).json({ erro: 'Já existe uma reserva aprovada para essa área nesse dia/período' });
  }

  const agora = new Date().toISOString();
  const nova = {
    id: nextId(db.reservas),
    areaId: Number(areaId),
    usuarioId: req.usuario.id,
    unidadeId: req.usuario.unidadeId || null,
    data,
    periodo,
    status: 'pendente',
    observacao: observacao || '',
    criadoEm: agora,
    atualizadoEm: agora
  };
  db.reservas.push(nova);
  writeDB(db);
  res.status(201).json(enriquecer(db, nova));
});

// Sindico aprova/rejeita uma reserva
router.patch('/:id/status', autenticar, apenasSindico, (req, res) => {
  const { status } = req.body;
  if (!STATUS.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${STATUS.join(', ')}` });
  }

  const db = readDB();
  const reserva = db.reservas.find((r) => r.id === Number(req.params.id));
  if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada' });

  reserva.status = status;
  reserva.atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.json(enriquecer(db, reserva));
});

// O solicitante cancela a propria reserva (ou o sindico cancela qualquer uma)
router.delete('/:id', autenticar, (req, res) => {
  const db = readDB();
  const reserva = db.reservas.find((r) => r.id === Number(req.params.id));
  if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada' });
  if (req.usuario.papel !== 'sindico' && reserva.usuarioId !== req.usuario.id) {
    return res.status(403).json({ erro: 'Você só pode cancelar as suas reservas' });
  }

  reserva.status = 'cancelada';
  reserva.atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.json(enriquecer(db, reserva));
});

module.exports = router;
