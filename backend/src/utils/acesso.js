const HttpError = require('./httpError');

// O que antes era RLS no Supabase: tudo filtra pelo condomínio ativo do usuário.
const isSindico = (usuario) => usuario.papel === 'sindico' || usuario.papel === 'administradora';
// Cargos de funcionário; o cargo define o acesso.
const CARGOS = ['porteiro', 'zelador', 'limpeza', 'jardineiro', 'manutencao', 'seguranca', 'outro'];
const CARGOS_PORTARIA = ['porteiro']; // registram e liberam encomendas

// Equipe da portaria: quem registra e libera encomendas.
const isEquipe = (usuario) =>
  isSindico(usuario) || (usuario.papel === 'funcionario' && CARGOS_PORTARIA.includes(usuario.cargo));

function condominioDe(usuario) {
  if (!usuario.condominioId) throw new HttpError(400, 'Nenhum condomínio ativo');
  return usuario.condominioId;
}

module.exports = { isSindico, isEquipe, condominioDe, CARGOS };

// updateMany/deleteMany com filtro de condomínio: 0 linhas = não existe *para este usuário*.
function exigirAfetado({ count }) {
  if (!count) throw new HttpError(404, 'Registro não encontrado');
}

module.exports.exigirAfetado = exigirAfetado;
