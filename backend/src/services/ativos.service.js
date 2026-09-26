const prisma = require('../models/prisma');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe, paraData, numeroOuNull, parcial } = require('../utils/validar');

const CATEGORIAS = ['eletrica', 'hidraulica', 'elevadores', 'incendio', 'climatizacao', 'civil', 'outros'];

const CAMPOS = {
  codigo: null,
  nome: null,
  categoria: (v) => umDe(v, CATEGORIAS, 'categoria'),
  localizacao: null,
  fabricanteModelo: null,
  numeroSerie: null,
  dataInstalacao: paraData,
  vidaUtilAnos: numeroOuNull,
  responsavel: null,
  observacoes: null
};

function listar(usuario) {
  return prisma.ativo.findMany({ where: { condominioId: condominioDe(usuario) }, orderBy: { codigo: 'asc' } });
}

function criar(usuario, d) {
  obrigatorio(d.codigo, 'codigo');
  obrigatorio(d.nome, 'nome');
  return prisma.ativo.create({ data: { ...parcial(d, CAMPOS), condominioId: condominioDe(usuario) } });
}

async function atualizar(usuario, id, d) {
  exigirAfetado(await prisma.ativo.updateMany({ where: { id, condominioId: condominioDe(usuario) }, data: parcial(d, CAMPOS) }));
}

async function remover(usuario, id) {
  exigirAfetado(await prisma.ativo.deleteMany({ where: { id, condominioId: condominioDe(usuario) } }));
}

module.exports = { listar, criar, atualizar, remover };
