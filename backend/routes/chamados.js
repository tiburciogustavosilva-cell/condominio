const express = require('express');
const { readDB, writeDB, nextId } = require('../db');
const { autenticar, apenasSindico } = require('../middleware/auth');

const router = express.Router();
const STATUS_VALIDOS = ['aberto', 'em_andamento', 'concluido'];
const PRIORIDADES = ['baixa', 'media', 'alta'];

function podeVer(chamado, usuario) {
  return usuario.papel === 'sindico' || chamado.usuarioId === usuario.id;
}

// Lista chamados: sindico ve todos, condomino ve so os proprios
router.get('/', autenticar, (req, res) => {
  const db = readDB();
  let lista = db.chamados;

  if (req.usuario.papel !== 'sindico') {
    lista = lista.filter((c) => c.usuarioId === req.usuario.id);
  }
  if (req.query.status) {
    lista = lista.filter((c) => c.status === req.query.status);
  }

  const autores = Object.fromEntries(db.usuarios.map((u) => [u.id, u.nome]));
  lista = [...lista]
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
    .map((c) => ({ ...c, autorNome: autores[c.usuarioId] || 'Desconhecido' }));

  res.json(lista);
});

// Detalhe de um chamado
router.get('/:id', autenticar, (req, res) => {
  const db = readDB();
  const chamado = db.chamados.find((c) => c.id === Number(req.params.id));
  if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
  if (!podeVer(chamado, req.usuario)) return res.status(403).json({ erro: 'Acesso negado' });
  res.json(chamado);
});

// Abre um novo chamado (qualquer usuario logado)
router.post('/', autenticar, (req, res) => {
  const { titulo, descricao, categoria, prioridade } = req.body;
  if (!titulo || !descricao) {
    return res.status(400).json({ erro: 'Título e descrição são obrigatórios' });
  }

  const db = readDB();
  const agora = new Date().toISOString();
  const novo = {
    id: nextId(db.chamados),
    titulo,
    descricao,
    categoria: categoria || 'geral',
    status: 'aberto',
    prioridade: PRIORIDADES.includes(prioridade) ? prioridade : 'media',
    usuarioId: req.usuario.id,
    unidadeId: req.usuario.unidadeId || null,
    comentarios: [],
    criadoEm: agora,
    atualizadoEm: agora
  };

  db.chamados.push(novo);
  writeDB(db);
  res.status(201).json(novo);
});

// Atualiza o status de um chamado (somente sindico)
router.patch('/:id/status', autenticar, apenasSindico, (req, res) => {
  const { status } = req.body;
  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: `Status deve ser um de: ${STATUS_VALIDOS.join(', ')}` });
  }

  const db = readDB();
  const chamado = db.chamados.find((c) => c.id === Number(req.params.id));
  if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

  chamado.status = status;
  chamado.atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.json(chamado);
});

// Adiciona um comentario (sindico ou o autor do chamado)
router.post('/:id/comentarios', autenticar, (req, res) => {
  const { texto } = req.body;
  if (!texto || !texto.trim()) return res.status(400).json({ erro: 'Comentário vazio' });

  const db = readDB();
  const chamado = db.chamados.find((c) => c.id === Number(req.params.id));
  if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
  if (!podeVer(chamado, req.usuario)) return res.status(403).json({ erro: 'Acesso negado' });

  if (!Array.isArray(chamado.comentarios)) chamado.comentarios = [];
  const comentario = {
    id: nextId(chamado.comentarios),
    autorId: req.usuario.id,
    autorNome: req.usuario.nome,
    texto: texto.trim(),
    criadoEm: new Date().toISOString()
  };
  chamado.comentarios.push(comentario);
  chamado.atualizadoEm = comentario.criadoEm;
  writeDB(db);
  res.status(201).json(comentario);
});

module.exports = router;
