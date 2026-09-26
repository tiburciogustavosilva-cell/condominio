const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe } = require('../utils/acesso');
const { obrigatorio } = require('../utils/validar');

function administradoraDe(usuario) {
  if (usuario.papel !== 'administradora' || !usuario.administradoraId) {
    throw new HttpError(403, 'Apenas uma administradora com empresa cadastrada pode fazer isso');
  }
  return usuario.administradoraId;
}

function listarDaAdministradora(usuario) {
  return prisma.condominio.findMany({ where: { administradoraId: administradoraDe(usuario) }, orderBy: { nome: 'asc' } });
}

/** Cria sob a administradora e já torna o condomínio ativo. */
async function criar(usuario, { nome, endereco, cnpj }) {
  const administradoraId = administradoraDe(usuario);
  return prisma.$transaction(async (tx) => {
    const { id } = await tx.condominio.create({
      data: { nome: obrigatorio(nome, 'nome'), endereco: endereco || '', cnpj: cnpj || '', administradoraId }
    });
    await tx.profile.update({ where: { id: usuario.id }, data: { condominioId: id } });
    return { id };
  });
}

async function ativar(usuario, id) {
  const administradoraId = administradoraDe(usuario);
  const condominio = await prisma.condominio.findFirst({ where: { id, administradoraId } });
  if (!condominio) throw new HttpError(404, 'Condomínio não pertence à sua administradora');
  await prisma.profile.update({ where: { id: usuario.id }, data: { condominioId: id } });
}

/** Perguntas de onboarding do condomínio ativo (+ cria as áreas de reserva escolhidas). */
function responderOnboarding(usuario, r) {
  const id = condominioDe(usuario);
  const qtd = (tem, valor) => (tem ? Number(valor) || 0 : null);
  const areas = (r.temAreasReserva ? r.areas || [] : []).map((n) => String(n).trim()).filter(Boolean);

  return prisma.$transaction(async (tx) => {
    const condominio = await tx.condominio.update({
      where: { id },
      data: {
        temBlocos: !!r.temBlocos,
        qtdBlocos: qtd(r.temBlocos, r.qtdBlocos),
        temComercio: !!r.temComercio,
        qtdComercio: qtd(r.temComercio, r.qtdComercio),
        temAreasReserva: !!r.temAreasReserva,
        temPorteiro: !!r.temPorteiro,
        onboardingConcluido: true
      }
    });
    if (areas.length) await tx.area.createMany({ data: areas.map((nome) => ({ nome, condominioId: id })) });
    return condominio;
  });
}

module.exports = { listarDaAdministradora, criar, ativar, responderOnboarding };
