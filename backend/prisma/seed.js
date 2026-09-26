// Dados de demonstração — o mesmo cenário do antigo db.json. Idempotente: não faz nada se já houver usuários.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/models/prisma');

const dia = (delta) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return new Date(d.toISOString().slice(0, 10));
};

async function main() {
  if (await prisma.profile.count()) return console.log('Banco já tem usuários — seed ignorado.');

  const cond = await prisma.condominio.create({
    data: {
      nome: 'Residencial Jardim das Palmeiras',
      endereco: 'Rua das Palmeiras, 100 - Centro',
      cnpj: '00.000.000/0001-00',
      temBlocos: true,
      qtdBlocos: 2,
      temComercio: true,
      qtdComercio: 1,
      temPorteiro: true,
      temAreasReserva: true,
      onboardingConcluido: true
    }
  });
  const condominioId = cond.id;

  const unidades = [];
  for (const [numero, bloco, tipo, fracaoIdeal] of [
    ['101', 'A', 'apartamento', 2.5],
    ['102', 'A', 'apartamento', 2.5],
    ['201', 'A', 'apartamento', 2.5],
    ['101', 'B', 'apartamento', 3],
    ['Loja 1', 'B', 'comercial', 4]
  ]) {
    unidades.push(await prisma.unidade.create({ data: { numero, bloco, tipo, fracaoIdeal, condominioId } }));
  }

  const areas = {};
  for (const [nome, descricao, capacidade, taxa, horario] of [
    ['Salão de festas', 'Capacidade para 40 pessoas, com cozinha de apoio.', 40, 150, '10h às 23h'],
    ['Churrasqueira', 'Área gourmet coberta com churrasqueira e pia.', 15, 60, '10h às 22h'],
    ['Quadra poliesportiva', 'Uso mediante agendamento, sem taxa.', 20, 0, '08h às 22h']
  ]) {
    areas[nome] = await prisma.area.create({ data: { nome, descricao, capacidade, taxa, horario, condominioId } });
  }

  const sindico = await prisma.profile.create({
    data: {
      nome: 'Síndico Admin',
      email: 'sindico@condominio.com',
      telefone: '(11) 90000-0001',
      senhaHash: await bcrypt.hash('admin123', 10),
      papel: 'sindico',
      condominioId,
      tutorialVistoEm: new Date()
    }
  });
  const morador = await prisma.profile.create({
    data: {
      nome: 'Morador Exemplo',
      email: 'morador@condominio.com',
      telefone: '(11) 90000-0002',
      senhaHash: await bcrypt.hash('morador123', 10),
      papel: 'condomino',
      unidadeId: unidades[0].id,
      condominioId,
      tutorialVistoEm: new Date()
    }
  });

  await prisma.profile.create({
    data: {
      nome: 'Portaria',
      email: 'portaria@condominio.com',
      senhaHash: await bcrypt.hash('portaria123', 10),
      papel: 'funcionario',
      cargo: 'porteiro',
      condominioId,
      tutorialVistoEm: new Date()
    }
  });

  await prisma.chamado.create({
    data: {
      titulo: 'Lâmpada queimada no corredor do 1º andar',
      descricao: 'A lâmpada próxima ao apartamento 102 está piscando há dias.',
      categoria: 'eletrica',
      usuarioId: morador.id,
      unidadeId: morador.unidadeId,
      condominioId
    }
  });
  await prisma.chamado.create({
    data: {
      titulo: 'Vazamento na garagem',
      descricao: 'Poça de água constante perto da vaga 14.',
      categoria: 'hidraulica',
      status: 'em_andamento',
      prioridade: 'alta',
      usuarioId: morador.id,
      unidadeId: morador.unidadeId,
      condominioId,
      comentarios: { create: { autorId: sindico.id, texto: 'Encanador agendado para esta semana.', condominioId } }
    }
  });

  await prisma.aviso.createMany({
    data: [
      { titulo: 'Assembleia geral ordinária', mensagem: 'Convocação para a assembleia no dia 20, às 19h, no salão de festas.', fixado: true, autorId: sindico.id, condominioId },
      { titulo: 'Manutenção da caixa d’água', mensagem: 'O fornecimento de água será interrompido na quinta-feira, das 9h às 12h.', autorId: sindico.id, condominioId }
    ]
  });

  await prisma.reserva.create({
    data: {
      areaId: areas['Churrasqueira'].id,
      usuarioId: morador.id,
      unidadeId: morador.unidadeId,
      data: dia(7),
      periodo: 'tarde',
      observacao: 'Aniversário de 5 anos.',
      condominioId
    }
  });

  await prisma.encomenda.create({
    data: {
      unidadeId: morador.unidadeId,
      descricao: 'Caixa média - Mercado Livre',
      remetente: 'Correios',
      entregadorNome: 'João Entregador',
      entregadorCpf: '52998224725',
      codigoRetirada: '12345',
      condominioId
    }
  });

  const extintores = await prisma.prestador.create({
    data: {
      nome: 'Extintores Brasil',
      empresa: 'Extintores Brasil Ltda',
      servico: 'Extintores e hidrantes',
      email: 'contato@extintoresbrasil.exemplo',
      telefone: '(11) 3333-1000',
      condominioId
    }
  });
  const elevadores = await prisma.prestador.create({
    data: {
      nome: 'JE Elevadores',
      empresa: 'JE Manutenção de Elevadores',
      servico: 'Elevadores',
      email: 'contato@jeelevadores.exemplo',
      telefone: '(11) 98888-2000',
      observacao: 'Contrato de manutenção mensal.',
      condominioId
    }
  });
  await prisma.manutencao.createMany({
    data: [
      {
        prestadorId: extintores.id,
        titulo: 'Recarga e teste dos extintores',
        descricao: 'Conferir carga, lacre, validade e sinalização de todos os extintores.',
        ultimaManutencao: dia(-125),
        frequenciaUnidade: 'mensal',
        frequenciaIntervalo: 4,
        diasAntecedencia: 15,
        condominioId
      },
      {
        prestadorId: elevadores.id,
        titulo: 'Manutenção preventiva dos elevadores',
        descricao: 'Vistoria mensal obrigatória com emissão de relatório (ART).',
        ultimaManutencao: dia(-20),
        frequenciaUnidade: 'mensal',
        frequenciaIntervalo: 1,
        diasAntecedencia: 7,
        condominioId
      }
    ]
  });

  console.log('Seed concluído: sindico@ / admin123, morador@ / morador123, portaria@ / portaria123 (@condominio.com)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
