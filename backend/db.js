const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function diasAFrente(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

function dataAFrente(dias) {
  return diasAFrente(dias).slice(0, 10);
}

// Dados iniciais para você já conseguir logar e testar sem cadastrar nada.
function seedData() {
  const senhaSindico = bcrypt.hashSync('admin123', 8);
  const senhaMorador = bcrypt.hashSync('morador123', 8);
  const agora = new Date().toISOString();

  return {
    condominio: {
      nome: 'Residencial Jardim das Palmeiras',
      endereco: 'Rua das Palmeiras, 100 - Centro',
      cnpj: '00.000.000/0001-00'
    },
    unidades: [
      { id: 1, numero: '101', bloco: 'A', tipo: 'apartamento', fracaoIdeal: 2.5 },
      { id: 2, numero: '102', bloco: 'A', tipo: 'apartamento', fracaoIdeal: 2.5 },
      { id: 3, numero: '201', bloco: 'A', tipo: 'apartamento', fracaoIdeal: 2.5 },
      { id: 4, numero: '101', bloco: 'B', tipo: 'apartamento', fracaoIdeal: 3.0 },
      { id: 5, numero: 'Loja 1', bloco: 'B', tipo: 'comercial', fracaoIdeal: 4.0 }
    ],
    areas: [
      { id: 1, nome: 'Salão de festas', descricao: 'Capacidade para 40 pessoas, com cozinha de apoio.', capacidade: 40, taxa: 150, horario: '10h às 23h' },
      { id: 2, nome: 'Churrasqueira', descricao: 'Área gourmet coberta com churrasqueira e pia.', capacidade: 15, taxa: 60, horario: '10h às 22h' },
      { id: 3, nome: 'Quadra poliesportiva', descricao: 'Uso mediante agendamento, sem taxa.', capacidade: 20, taxa: 0, horario: '08h às 22h' }
    ],
    usuarios: [
      {
        id: 1,
        nome: 'Síndico Admin',
        email: 'sindico@condominio.com',
        telefone: '(11) 90000-0001',
        senhaHash: senhaSindico,
        papel: 'sindico',
        unidadeId: null,
        criadoEm: agora
      },
      {
        id: 2,
        nome: 'Morador Exemplo',
        email: 'morador@condominio.com',
        telefone: '(11) 90000-0002',
        senhaHash: senhaMorador,
        papel: 'condomino',
        unidadeId: 1,
        criadoEm: agora
      }
    ],
    chamados: [
      {
        id: 1,
        titulo: 'Lâmpada queimada no corredor do 1º andar',
        descricao: 'A lâmpada próxima ao apartamento 102 está piscando há dias.',
        categoria: 'eletrica',
        status: 'aberto',
        prioridade: 'media',
        usuarioId: 2,
        unidadeId: 1,
        comentarios: [],
        criadoEm: diasAFrente(-3),
        atualizadoEm: diasAFrente(-3)
      },
      {
        id: 2,
        titulo: 'Vazamento na garagem',
        descricao: 'Poça de água constante perto da vaga 14.',
        categoria: 'hidraulica',
        status: 'em_andamento',
        prioridade: 'alta',
        usuarioId: 2,
        unidadeId: 1,
        comentarios: [
          { id: 1, autorId: 1, texto: 'Encanador agendado para esta semana.', criadoEm: diasAFrente(-1) }
        ],
        criadoEm: diasAFrente(-6),
        atualizadoEm: diasAFrente(-1)
      }
    ],
    avisos: [
      {
        id: 1,
        titulo: 'Assembleia geral ordinária',
        mensagem: 'Convocação para a assembleia no dia 20, às 19h, no salão de festas.',
        fixado: true,
        autorId: 1,
        criadoEm: diasAFrente(-2)
      },
      {
        id: 2,
        titulo: 'Manutenção da caixa d’água',
        mensagem: 'O fornecimento de água será interrompido na quinta-feira, das 9h às 12h.',
        fixado: false,
        autorId: 1,
        criadoEm: diasAFrente(-1)
      }
    ],
    reservas: [
      {
        id: 1,
        areaId: 2,
        usuarioId: 2,
        unidadeId: 1,
        data: dataAFrente(7),
        periodo: 'tarde',
        status: 'pendente',
        observacao: 'Aniversário de 5 anos.',
        criadoEm: diasAFrente(-1),
        atualizadoEm: diasAFrente(-1)
      }
    ],
    encomendas: [
      {
        id: 1,
        unidadeId: 1,
        descricao: 'Caixa média - Mercado Livre',
        remetente: 'Correios',
        status: 'aguardando',
        recebidoPor: null,
        criadoEm: diasAFrente(-1),
        entregueEm: null
      }
    ],
    prestadores: [
      {
        id: 1,
        nome: 'Extintores Brasil',
        empresa: 'Extintores Brasil Ltda',
        servico: 'Extintores e hidrantes',
        email: 'contato@extintoresbrasil.exemplo',
        telefone: '(11) 3333-1000',
        observacao: '',
        criadoEm: agora
      },
      {
        id: 2,
        nome: 'JE Elevadores',
        empresa: 'JE Manutenção de Elevadores',
        servico: 'Elevadores',
        email: 'contato@jeelevadores.exemplo',
        telefone: '(11) 98888-2000',
        observacao: 'Contrato de manutenção mensal.',
        criadoEm: agora
      }
    ],
    manutencoes: [
      {
        id: 1,
        prestadorId: 1,
        titulo: 'Recarga e teste dos extintores',
        descricao: 'Conferir carga, lacre, validade e sinalização de todos os extintores.',
        ultimaManutencao: dataAFrente(-125),
        frequenciaUnidade: 'mensal',
        frequenciaIntervalo: 4,
        diasAntecedencia: 15,
        ativo: true,
        ultimoLembreteCiclo: null,
        historico: [],
        criadoEm: agora
      },
      {
        id: 2,
        prestadorId: 2,
        titulo: 'Manutenção preventiva dos elevadores',
        descricao: 'Vistoria mensal obrigatória com emissão de relatório (ART).',
        ultimaManutencao: dataAFrente(-20),
        frequenciaUnidade: 'mensal',
        frequenciaIntervalo: 1,
        diasAntecedencia: 7,
        ativo: true,
        ultimoLembreteCiclo: null,
        historico: [],
        criadoEm: agora
      }
    ]
  };
}

const COLECOES = [
  'unidades',
  'areas',
  'usuarios',
  'chamados',
  'avisos',
  'reservas',
  'encomendas',
  'prestadores',
  'manutencoes'
];

function ensureDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(seedData(), null, 2));
  }
}

function readDB() {
  ensureDB();
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  // Garante que coleções novas existam mesmo em um db.json antigo.
  for (const chave of COLECOES) {
    if (!Array.isArray(data[chave])) data[chave] = [];
  }
  return data;
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(list) {
  return list.length ? Math.max(...list.map((item) => item.id)) + 1 : 1;
}

module.exports = { readDB, writeDB, nextId, seedData, DB_PATH };
