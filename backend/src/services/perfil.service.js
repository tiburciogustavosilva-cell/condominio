const prisma = require('../models/prisma');
const { obrigatorio } = require('../utils/validar');

async function obter(usuario) {
  const unidade = usuario.unidadeId
    ? await prisma.unidade.findUnique({ where: { id: usuario.unidadeId }, select: { bloco: true, numero: true } })
    : null;
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    papel: usuario.papel,
    unidade
  };
}

// Só nome/telefone — papel/unidade quem muda é o síndico (moradores.service).
function atualizar(usuario, { nome, telefone }) {
  return prisma.profile.update({
    where: { id: usuario.id },
    data: { nome: obrigatorio(nome, 'nome'), telefone: telefone ?? null },
    select: { nome: true, telefone: true }
  });
}

async function concluirTutorial(usuario) {
  await prisma.profile.update({ where: { id: usuario.id }, data: { tutorialVistoEm: new Date() } });
}

module.exports = { obter, atualizar, concluirTutorial };
