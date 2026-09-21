const express = require('express');
const { readDB, writeDB, nextId } = require('../db');
const { autenticar, apenasSindico } = require('../middleware/auth');

const router = express.Router();

// Lista avisos do mural (qualquer usuario logado). Fixados vem primeiro.
router.get('/', autenticar, (req, res) => {
  const db = readDB();
  const autores = Object.fromEntries(db.usuarios.map((u) => [u.id, u.nome]));
  const lista = [...db.avisos]
    .sort((a, b) => {
      if (!!b.fixado !== !!a.fixado) return b.fixado ? 1 : -1;
      return new Date(b.criadoEm) - new Date(a.criadoEm);
    })
    .map((a) => ({ ...a, autorNome: autores[a.autorId] || 'Síndico' }));
  res.json(lista);
});

// Publica um novo aviso (somente sindico)
router.post('/', autenticar, apenasSindico, (req, res) => {
  const { titulo, mensagem, fixado } = req.body;
  if (!titulo || !mensagem) {
    return res.status(400).json({ erro: 'Título e mensagem são obrigatórios' });
  }

  const db = readDB();
  const novo = {
    id: nextId(db.avisos),
    titulo,
    mensagem,
    fixado: !!fixado,
    autorId: req.usuario.id,
    criadoEm: new Date().toISOString()
  };

  db.avisos.push(novo);
  writeDB(db);
  res.status(201).json(novo);
});

// Edita um aviso (somente sindico)
router.patch('/:id', autenticar, apenasSindico, (req, res) => {
  const db = readDB();
  const aviso = db.avisos.find((a) => a.id === Number(req.params.id));
  if (!aviso) return res.status(404).json({ erro: 'Aviso não encontrado' });

  const { titulo, mensagem, fixado } = req.body;
  if (titulo !== undefined) aviso.titulo = titulo;
  if (mensagem !== undefined) aviso.mensagem = mensagem;
  if (fixado !== undefined) aviso.fixado = !!fixado;
  writeDB(db);
  res.json(aviso);
});

// Remove um aviso (somente sindico)
router.delete('/:id', autenticar, apenasSindico, (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  if (!db.avisos.some((a) => a.id === id)) {
    return res.status(404).json({ erro: 'Aviso não encontrado' });
  }
  db.avisos = db.avisos.filter((a) => a.id !== id);
  writeDB(db);
  res.status(204).end();
});

module.exports = router;
