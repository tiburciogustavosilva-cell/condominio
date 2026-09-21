const express = require('express');
const bcrypt = require('bcryptjs');
const { readDB, writeDB, nextId } = require('../db');
const { autenticar, apenasSindico } = require('../middleware/auth');

const router = express.Router();

function publico(u) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone || null,
    papel: u.papel,
    unidadeId: u.unidadeId
  };
}

// Compatibilidade: lista as unidades (use /api/unidades para o CRUD completo)
router.get('/unidades', autenticar, (req, res) => {
  const db = readDB();
  res.json(db.unidades);
});

// Lista moradores (somente sindico)
router.get('/', autenticar, apenasSindico, (req, res) => {
  const db = readDB();
  res.json(db.usuarios.map(publico));
});

// Cadastra um novo morador (somente sindico)
router.post('/', autenticar, apenasSindico, (req, res) => {
  const { nome, email, senha, telefone, unidadeId, papel } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  }

  const db = readDB();
  if (db.usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ erro: 'Já existe um usuário com esse e-mail' });
  }
  if (unidadeId && !db.unidades.some((u) => u.id === Number(unidadeId))) {
    return res.status(400).json({ erro: 'Unidade informada não existe' });
  }

  const novo = {
    id: nextId(db.usuarios),
    nome,
    email,
    telefone: telefone || null,
    senhaHash: bcrypt.hashSync(senha, 8),
    papel: papel === 'sindico' ? 'sindico' : 'condomino',
    unidadeId: unidadeId ? Number(unidadeId) : null,
    criadoEm: new Date().toISOString()
  };

  db.usuarios.push(novo);
  writeDB(db);
  res.status(201).json(publico(novo));
});

// Edita um morador (somente sindico)
router.patch('/:id', autenticar, apenasSindico, (req, res) => {
  const db = readDB();
  const usuario = db.usuarios.find((u) => u.id === Number(req.params.id));
  if (!usuario) return res.status(404).json({ erro: 'Morador não encontrado' });

  const { nome, email, telefone, unidadeId, papel, senha } = req.body;
  if (email && db.usuarios.some((u) => u.id !== usuario.id && u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ erro: 'Já existe um usuário com esse e-mail' });
  }

  if (nome !== undefined) usuario.nome = nome;
  if (email !== undefined) usuario.email = email;
  if (telefone !== undefined) usuario.telefone = telefone || null;
  if (unidadeId !== undefined) usuario.unidadeId = unidadeId ? Number(unidadeId) : null;
  if (papel !== undefined) usuario.papel = papel === 'sindico' ? 'sindico' : 'condomino';
  if (senha) usuario.senhaHash = bcrypt.hashSync(senha, 8);

  writeDB(db);
  res.json(publico(usuario));
});

// Remove um morador (somente sindico, e nao pode remover a si mesmo)
router.delete('/:id', autenticar, apenasSindico, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode remover o próprio usuário' });
  }

  const db = readDB();
  const existe = db.usuarios.some((u) => u.id === id);
  if (!existe) return res.status(404).json({ erro: 'Morador não encontrado' });

  db.usuarios = db.usuarios.filter((u) => u.id !== id);
  writeDB(db);
  res.status(204).end();
});

module.exports = router;
