const express = require('express');
const { readDB, writeDB, nextId } = require('../db');
const { autenticar, apenasSindico } = require('../middleware/auth');

const router = express.Router();

// Lista unidades (qualquer usuario logado)
router.get('/', autenticar, (req, res) => {
  const db = readDB();
  const comMoradores = db.unidades.map((u) => ({
    ...u,
    moradores: db.usuarios.filter((m) => m.unidadeId === u.id).map((m) => m.nome)
  }));
  res.json(comMoradores);
});

// Cria unidade (somente sindico)
router.post('/', autenticar, apenasSindico, (req, res) => {
  const { numero, bloco, tipo, fracaoIdeal } = req.body;
  if (!numero) return res.status(400).json({ erro: 'Número da unidade é obrigatório' });

  const db = readDB();
  const nova = {
    id: nextId(db.unidades),
    numero: String(numero),
    bloco: bloco || '-',
    tipo: tipo || 'apartamento',
    fracaoIdeal: fracaoIdeal ? Number(fracaoIdeal) : 0
  };
  db.unidades.push(nova);
  writeDB(db);
  res.status(201).json(nova);
});

// Edita unidade (somente sindico)
router.patch('/:id', autenticar, apenasSindico, (req, res) => {
  const db = readDB();
  const unidade = db.unidades.find((u) => u.id === Number(req.params.id));
  if (!unidade) return res.status(404).json({ erro: 'Unidade não encontrada' });

  const { numero, bloco, tipo, fracaoIdeal } = req.body;
  if (numero !== undefined) unidade.numero = String(numero);
  if (bloco !== undefined) unidade.bloco = bloco || '-';
  if (tipo !== undefined) unidade.tipo = tipo || 'apartamento';
  if (fracaoIdeal !== undefined) unidade.fracaoIdeal = fracaoIdeal ? Number(fracaoIdeal) : 0;

  writeDB(db);
  res.json(unidade);
});

// Remove unidade (somente sindico; bloqueia se houver morador vinculado)
router.delete('/:id', autenticar, apenasSindico, (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  if (!db.unidades.some((u) => u.id === id)) {
    return res.status(404).json({ erro: 'Unidade não encontrada' });
  }
  if (db.usuarios.some((u) => u.unidadeId === id)) {
    return res.status(400).json({ erro: 'Há moradores vinculados a esta unidade' });
  }

  db.unidades = db.unidades.filter((u) => u.id !== id);
  writeDB(db);
  res.status(204).end();
});

module.exports = router;
