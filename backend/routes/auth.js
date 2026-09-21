const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDB } = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const db = readDB();
  const usuario = db.usuarios.find((u) => u.email === email);

  if (!usuario || !bcrypt.compareSync(senha || '', usuario.senhaHash)) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
  }

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, papel: usuario.papel, unidadeId: usuario.unidadeId },
    process.env.JWT_SECRET || 'segredo_dev',
    { expiresIn: '8h' }
  );

  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel, unidadeId: usuario.unidadeId }
  });
});

module.exports = router;
