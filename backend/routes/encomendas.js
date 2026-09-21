const express = require('express');
const { readDB, writeDB, nextId } = require('../db');
const { autenticar, apenasSindico } = require('../middleware/auth');

const router = express.Router();

function enriquecer(db, e) {
  const unidade = db.unidades.find((u) => u.id === e.unidadeId);
  return { ...e, unidadeLabel: unidade ? `${unidade.bloco} - ${unidade.numero}` : '-' };
}

// Lista encomendas: sindico ve todas, condomino ve so as da propria unidade
router.get('/', autenticar, (req, res) => {
  const db = readDB();
  let lista = db.encomendas;
  if (req.usuario.papel !== 'sindico') {
    lista = lista.filter((e) => e.unidadeId === req.usuario.unidadeId);
  }
  lista = [...lista]
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
    .map((e) => enriquecer(db, e));
  res.json(lista);
});

// Registra uma encomenda recebida na portaria (somente sindico)
router.post('/', autenticar, apenasSindico, (req, res) => {
  const { unidadeId, descricao, remetente } = req.body;
  if (!unidadeId || !descricao) {
    return res.status(400).json({ erro: 'Unidade e descrição são obrigatórias' });
  }

  const db = readDB();
  if (!db.unidades.some((u) => u.id === Number(unidadeId))) {
    return res.status(400).json({ erro: 'Unidade não encontrada' });
  }

  const nova = {
    id: nextId(db.encomendas),
    unidadeId: Number(unidadeId),
    descricao,
    remetente: remetente || '',
    status: 'aguardando',
    recebidoPor: null,
    criadoEm: new Date().toISOString(),
    entregueEm: null
  };
  db.encomendas.push(nova);
  writeDB(db);
  res.status(201).json(enriquecer(db, nova));
});

// Marca como entregue (sindico, ou condomino da propria unidade)
router.patch('/:id/entregar', autenticar, (req, res) => {
  const db = readDB();
  const encomenda = db.encomendas.find((e) => e.id === Number(req.params.id));
  if (!encomenda) return res.status(404).json({ erro: 'Encomenda não encontrada' });
  if (req.usuario.papel !== 'sindico' && encomenda.unidadeId !== req.usuario.unidadeId) {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  encomenda.status = 'entregue';
  encomenda.entregueEm = new Date().toISOString();
  encomenda.recebidoPor = req.body.recebidoPor || req.usuario.nome;
  writeDB(db);
  res.json(enriquecer(db, encomenda));
});

// Remove encomenda (somente sindico)
router.delete('/:id', autenticar, apenasSindico, (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  if (!db.encomendas.some((e) => e.id === id)) {
    return res.status(404).json({ erro: 'Encomenda não encontrada' });
  }
  db.encomendas = db.encomendas.filter((e) => e.id !== id);
  writeDB(db);
  res.status(204).end();
});

module.exports = router;
