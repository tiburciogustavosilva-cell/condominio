const express = require('express');
const bcrypt = require('bcryptjs');
const { readDB, writeDB } = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Dados do usuario logado
router.get('/', autenticar, (req, res) => {
  const db = readDB();
  const usuario = db.usuarios.find((u) => u.id === req.usuario.id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const unidade = db.unidades.find((x) => x.id === usuario.unidadeId) || null;
  res.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone || null,
    papel: usuario.papel,
    unidade
  });
});

// Atualiza nome/telefone do proprio usuario
router.patch('/', autenticar, (req, res) => {
  const db = readDB();
  const usuario = db.usuarios.find((u) => u.id === req.usuario.id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const { nome, telefone } = req.body;
  if (nome !== undefined) usuario.nome = nome;
  if (telefone !== undefined) usuario.telefone = telefone || null;
  writeDB(db);
  res.json({ id: usuario.id, nome: usuario.nome, telefone: usuario.telefone || null });
});

// Troca de senha
router.patch('/senha', autenticar, (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ erro: 'Informe a senha atual e a nova senha' });
  }
  if (String(novaSenha).length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres' });
  }

  const db = readDB();
  const usuario = db.usuarios.find((u) => u.id === req.usuario.id);
  if (!usuario || !bcrypt.compareSync(senhaAtual, usuario.senhaHash)) {
    return res.status(400).json({ erro: 'Senha atual incorreta' });
  }

  usuario.senhaHash = bcrypt.hashSync(novaSenha, 8);
  writeDB(db);
  res.json({ ok: true });
});

module.exports = router;
