const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { isSindico, condominioDe, exigirAfetado, CARGOS } = require('../utils/acesso');
const { obrigatorio, umDe, paraData } = require('../utils/validar');
const { lerFotoWebp } = require('../utils/foto');

const TZ = process.env.TZ_CONDOMINIO || 'America/Sao_Paulo';
const RECORRENCIAS = ['diaria', 'semanal', 'mensal', 'unica'];
const MAX_FOTOS = 5;
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;
const PESSOA = { select: { nome: true, papel: true, cargo: true } };

/** "YYYY-MM-DD" no fuso do condomínio (o servidor pode estar em UTC). */
const diaNoFuso = (instante = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(instante);
const diaDe = (data) => data.toISOString().slice(0, 10); // coluna @db.Date

/** A tarefa cai no dia `dia` ("YYYY-MM-DD")? */
function venceNoDia(t, dia) {
  const d = new Date(`${dia}T00:00:00Z`);
  switch (t.recorrencia) {
    case 'diaria':
      return true;
    case 'semanal':
      return t.diasSemana.includes(d.getUTCDay());
    case 'mensal': {
      // dia 31 em mês curto vira o último dia do mês
      const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      return d.getUTCDate() === Math.min(t.diaMes, ultimo);
    }
    case 'unica':
      return !!t.data && diaDe(t.data) === dia;
    default:
      return false;
  }
}

const somarDias = (dia, n) => {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Dias em que a tarefa venceu e não foi feita, entre `de` e `ate` (inclusive, "YYYY-MM-DD").
 * `feitas` = Set de "tarefaId|YYYY-MM-DD". Não conta dias antes de a tarefa existir.
 */
function diasPerdidos(tarefa, feitas, de, ate) {
  const criada = diaNoFuso(tarefa.criadoEm);
  const inicio = criada > de ? criada : de;
  const perdidos = [];
  if (tarefa.recorrencia === 'unica') {
    const dia = tarefa.data && diaDe(tarefa.data);
    if (dia && dia >= inicio && dia <= ate && !feitas.has(`${tarefa.id}|${dia}`)) perdidos.push(dia);
    return perdidos;
  }
  for (let dia = inicio; dia <= ate; dia = somarDias(dia, 1)) {
    if (venceNoDia(tarefa, dia) && !feitas.has(`${tarefa.id}|${dia}`)) perdidos.push(dia);
  }
  return perdidos;
}

/** Valida o payload completo do formulário e zera os campos que não se aplicam à recorrência. */
function campos(d) {
  const recorrencia = umDe(d.recorrencia, RECORRENCIAS, 'recorrencia');
  const diasSemana =
    recorrencia === 'semanal' ? [...new Set((d.diasSemana || []).map(Number))].filter((n) => n >= 0 && n <= 6).sort() : [];
  if (recorrencia === 'semanal' && !diasSemana.length) throw new HttpError(400, 'Escolha ao menos um dia da semana');
  const diaMes = recorrencia === 'mensal' ? Number(d.diaMes) : null;
  if (recorrencia === 'mensal' && !(Number.isInteger(diaMes) && diaMes >= 1 && diaMes <= 31)) {
    throw new HttpError(400, 'Dia do mês inválido');
  }
  if (recorrencia === 'unica' && !DIA_RE.test(String(obrigatorio(d.data, 'data')).slice(0, 10))) {
    throw new HttpError(400, 'Data inválida');
  }
  return {
    titulo: obrigatorio(String(d.titulo ?? '').trim(), 'titulo'),
    descricao: d.descricao || '',
    cargo: umDe(d.cargo, CARGOS, 'cargo'),
    recorrencia,
    diasSemana,
    diaMes,
    data: recorrencia === 'unica' ? paraData(d.data) : null,
    ativa: d.ativa === undefined ? true : !!d.ativa
  };
}

// ---------- Síndico: cadastro ----------

async function listar(usuario) {
  const tarefas = await prisma.tarefa.findMany({
    where: { condominioId: condominioDe(usuario) },
    include: { _count: { select: { execucoes: true } } },
    orderBy: [{ ativa: 'desc' }, { cargo: 'asc' }, { titulo: 'asc' }]
  });
  return tarefas.map(({ _count, ...t }) => ({ ...t, execucoes: _count.execucoes }));
}

function criar(usuario, d) {
  return prisma.tarefa.create({ data: { ...campos(d), condominioId: condominioDe(usuario) } });
}

/** A agenda (repetição/dias/data) de tarefa já executada fica travada: mudar reescreveria o relatório de perdidas. */
async function atualizar(usuario, id, d) {
  const condominioId = condominioDe(usuario);
  const novo = campos(d);
  const atual = await prisma.tarefa.findFirst({ where: { id, condominioId }, include: { _count: { select: { execucoes: true } } } });
  if (!atual) throw new HttpError(404, 'Tarefa não encontrada');
  const agenda = (t) => JSON.stringify([t.recorrencia, t.diasSemana, t.diaMes, t.data && diaDe(t.data)]);
  if (atual._count.execucoes && agenda(atual) !== agenda(novo)) {
    throw new HttpError(409, 'Essa tarefa já foi feita antes: para mudar a repetição, pause esta e crie outra');
  }
  exigirAfetado(await prisma.tarefa.updateMany({ where: { id, condominioId }, data: novo }));
}

async function remover(usuario, id) {
  try {
    exigirAfetado(await prisma.tarefa.deleteMany({ where: { id, condominioId: condominioDe(usuario) } }));
  } catch (err) {
    if (err.code === 'P2003') throw new HttpError(409, 'A tarefa já tem execuções registradas — desative em vez de excluir');
    throw err;
  }
}

// ---------- Execução (funcionário) ----------

const formatarExecucao = ({ fotos, ...e }) => ({ ...e, fotos: fotos.map((f) => f.id) });

/**
 * Tarefas do dia: funcionário vê as do próprio cargo; síndico vê todas.
 * Tarefa única aparece a partir da data até ser concluída (atrasada se passou do dia).
 */
async function doDia(usuario) {
  const hoje = diaNoFuso();
  const tarefas = await prisma.tarefa.findMany({
    where: { condominioId: condominioDe(usuario), ativa: true, ...(isSindico(usuario) ? {} : { cargo: usuario.cargo }) },
    include: {
      execucoes: {
        orderBy: { data: 'desc' },
        take: 1,
        include: { concluidaPor: PESSOA, fotos: { select: { id: true } } }
      }
    },
    orderBy: [{ cargo: 'asc' }, { titulo: 'asc' }]
  });

  const lista = [];
  for (const { execucoes, ...t } of tarefas) {
    const ultima = execucoes[0];
    if (t.recorrencia === 'unica') {
      const devidaEm = diaDe(t.data);
      if (devidaEm > hoje) continue;
      // concluída: some no dia seguinte ao da conclusão
      if (ultima && diaNoFuso(ultima.concluidaEm) !== hoje) continue;
      lista.push({ ...t, devidaEm, atrasada: !ultima && devidaEm < hoje, execucao: ultima ? formatarExecucao(ultima) : null });
    } else if (venceNoDia(t, hoje)) {
      const feita = ultima && diaDe(ultima.data) === hoje ? ultima : null;
      lista.push({ ...t, devidaEm: hoje, atrasada: false, execucao: feita ? formatarExecucao(feita) : null });
    }
  }
  lista.sort((a, b) => Number(!!a.execucao) - Number(!!b.execucao)); // pendentes primeiro
  return { data: hoje, agora: new Date(), tarefas: lista };
}

/** Só funcionário do cargo da tarefa conclui, com 1 a MAX_FOTOS fotos .webp (já carimbadas no app). */
async function concluir(usuario, id, { observacao, fotos }) {
  const condominioId = condominioDe(usuario);
  const tarefa = await prisma.tarefa.findFirst({ where: { id, condominioId, ativa: true } });
  if (!tarefa) throw new HttpError(404, 'Tarefa não encontrada');
  if (usuario.papel !== 'funcionario' || usuario.cargo !== tarefa.cargo) {
    throw new HttpError(403, 'Essa tarefa é de outro cargo');
  }

  const hoje = diaNoFuso();
  const devidaEm = tarefa.recorrencia === 'unica' ? diaDe(tarefa.data) : hoje;
  if (tarefa.recorrencia === 'unica' ? devidaEm > hoje : !venceNoDia(tarefa, hoje)) {
    throw new HttpError(400, 'Essa tarefa não é para hoje');
  }
  if (!Array.isArray(fotos) || !fotos.length) throw new HttpError(400, 'Envie pelo menos uma foto do serviço');
  if (fotos.length > MAX_FOTOS) throw new HttpError(400, `No máximo ${MAX_FOTOS} fotos`);
  const buffers = fotos.map(lerFotoWebp);

  try {
    const execucao = await prisma.tarefaExecucao.create({
      data: {
        tarefaId: id,
        data: new Date(devidaEm),
        concluidaPorId: usuario.id,
        observacao: observacao || '',
        condominioId,
        fotos: { create: buffers.map((foto) => ({ foto, condominioId })) }
      },
      select: { id: true }
    });
    return execucao;
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, 'Essa tarefa já foi concluída');
    throw err;
  }
}

/** Histórico recente (síndico), com as fotos de cada execução. Filtros opcionais: tarefa e dia ("YYYY-MM-DD"). */
async function historico(usuario, { limite = 50, tarefaId, dia } = {}) {
  if (dia && !DIA_RE.test(dia)) throw new HttpError(400, 'Data inválida');
  const execucoes = await prisma.tarefaExecucao.findMany({
    where: { condominioId: condominioDe(usuario), ...(tarefaId && { tarefaId }), ...(dia && { data: new Date(dia) }) },
    include: {
      tarefa: { select: { titulo: true, cargo: true } },
      concluidaPor: PESSOA,
      fotos: { select: { id: true } }
    },
    orderBy: { concluidaEm: 'desc' },
    take: Math.min(Number(limite) || 50, 200)
  });
  return execucoes.map(formatarExecucao);
}


/**
 * Relatório de dias não feitos (síndico). Padrão: últimos 30 dias até ontem — hoje ainda dá tempo.
 * ponytail: tarefa pausada sai inteira do relatório (não guardamos quando foi pausada); guardar `pausadaEm` se precisar.
 */
async function perdidas(usuario, { de, ate } = {}) {
  const condominioId = condominioDe(usuario);
  const ontem = somarDias(diaNoFuso(), -1);
  if ((de && !DIA_RE.test(de)) || (ate && !DIA_RE.test(ate))) throw new HttpError(400, 'Data inválida');
  const fim = !ate || ate > ontem ? ontem : ate;
  const inicio = de || somarDias(fim, -29);
  if (inicio > fim) return { de: inicio, ate: fim, tarefas: [] };
  if (somarDias(inicio, 366) < fim) throw new HttpError(400, 'Período máximo de 1 ano');

  const [tarefas, execucoes] = await Promise.all([
    prisma.tarefa.findMany({ where: { condominioId, ativa: true }, orderBy: [{ cargo: 'asc' }, { titulo: 'asc' }] }),
    prisma.tarefaExecucao.findMany({
      where: { condominioId, data: { gte: new Date(inicio), lte: new Date(fim) } },
      select: { tarefaId: true, data: true }
    })
  ]);
  const feitas = new Set(execucoes.map((e) => `${e.tarefaId}|${diaDe(e.data)}`));

  const lista = tarefas
    .map((t) => ({ ...t, diasPerdidos: diasPerdidos(t, feitas, inicio, fim) }))
    .filter((t) => t.diasPerdidos.length)
    .sort((a, b) => b.diasPerdidos.length - a.diasPerdidos.length);
  return { de: inicio, ate: fim, tarefas: lista };
}

async function foto(usuario, fotoId) {
  const registro = await prisma.tarefaFoto.findFirst({
    where: { id: fotoId, condominioId: condominioDe(usuario) },
    select: { foto: true }
  });
  if (!registro) throw new HttpError(404, 'Foto não encontrada');
  return registro.foto;
}

module.exports = { listar, criar, atualizar, remover, doDia, concluir, historico, perdidas, foto, venceNoDia, diasPerdidos };
