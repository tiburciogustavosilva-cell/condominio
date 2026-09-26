// Smoke test da API: auth JWT Bearer + regras de acesso que antes eram RLS + fluxo de encomendas.
// Cria os próprios condomínios/usuários e apaga tudo no fim — não depende do seed. Rode: npm test
require('dotenv').config();
const assert = require('assert');
const app = require('../src/app');
const prisma = require('../src/models/prisma');

const sufixo = Date.now();
const email = (nome) => `smoke-${nome}-${sufixo}@teste.local`;

async function limpar() {
  const condominioIds = (
    await prisma.profile.findMany({ where: { email: { endsWith: `-${sufixo}@teste.local` } }, select: { condominioId: true } })
  )
    .map((p) => p.condominioId)
    .filter(Boolean);
  const where = { condominioId: { in: condominioIds } };
  await prisma.encomenda.deleteMany({ where });
  await prisma.reserva.deleteMany({ where });
  await prisma.aviso.deleteMany({ where });
  await prisma.profile.deleteMany({ where }); // chamados/comentários caem em cascata
  await prisma.unidade.deleteMany({ where });
  await prisma.area.deleteMany({ where });
  await prisma.condominio.deleteMany({ where: { id: { in: condominioIds } } });
}

async function main() {
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}/api`;
  const api = async (metodo, rota, { token, body } = {}) => {
    const res = await fetch(base + rota, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, json: res.status === 204 ? null : await res.json() };
  };
  const login = async (e, senha) => (await api('POST', '/auth/login', { body: { email: e, senha } })).json?.token;
  const senha = 'segredo1';

  try {
    // --- Cadastro + login (JWT Bearer) ---
    const cad = await api('POST', '/auth/cadastro', {
      body: { tipo: 'sindico', email: email('sindico'), senha, nome: 'Síndico', condominioNome: 'Smoke A' }
    });
    assert.equal(cad.status, 201);
    assert.equal(cad.json.tokenType, 'Bearer');
    assert.ok(!cad.json.usuario.senhaHash);

    assert.equal((await api('POST', '/auth/login', { body: { email: email('sindico'), senha: 'errada' } })).status, 401);
    const sindico = await login(email('sindico'), senha);
    assert.ok(sindico);
    assert.equal((await api('GET', '/chamados')).status, 401, 'sem Bearer');
    assert.equal((await api('GET', '/chamados', { token: sindico + 'x' })).status, 401, 'token adulterado');
    const me = await api('GET', '/auth/me', { token: sindico });
    assert.equal(me.json.usuario.email, email('sindico'));
    assert.equal(me.json.condominio.nome, 'Smoke A');

    // --- Síndico monta o condomínio: unidade, morador, portaria ---
    const unidade = (await api('POST', '/unidades', { token: sindico, body: { numero: '101', bloco: 'A' } })).json;
    const criarPessoa = (nome, papel, extra = {}) =>
      api('POST', '/moradores', { token: sindico, body: { nome, email: email(nome), senha, papel, ...extra } });
    assert.equal((await criarPessoa('morador', 'condomino', { unidadeId: unidade.id })).status, 201);
    const criarFuncionario = (nome, cargo) =>
      api('POST', '/funcionarios', { token: sindico, body: { nome, email: email(nome), senha, cargo } });
    assert.equal((await criarFuncionario('portaria', 'porteiro')).status, 201);
    assert.equal((await criarFuncionario('zelador', 'zelador')).status, 201);
    assert.equal((await criarFuncionario('x', 'astronauta')).status, 400, 'cargo fora da lista');
    assert.equal((await criarPessoa('y', 'funcionario')).status, 400, 'funcionário não se cria por Moradores');
    const moradoresLista = (await api('GET', '/moradores', { token: sindico })).json;
    assert.ok(!moradoresLista.some((m) => m.papel === 'funcionario'), 'Moradores não lista funcionários');
    assert.equal((await api('GET', '/funcionarios', { token: sindico })).json.length, 2);
    const morador = await login(email('morador'), senha);
    const portaria = await login(email('portaria'), senha);
    const zelador = await login(email('zelador'), senha);
    assert.ok(morador && portaria && zelador, 'criados pelo síndico conseguem logar');
    assert.equal((await api('GET', '/funcionarios', { token: portaria })).status, 403);

    // --- Escopo síndico x morador x funcionário ---
    assert.equal((await api('GET', '/prestadores', { token: morador })).status, 403);
    assert.equal((await api('POST', '/avisos', { token: morador, body: { titulo: 'x', mensagem: 'y' } })).status, 403);
    assert.equal((await api('POST', '/moradores', { token: morador, body: { nome: 'x', email: email('x'), senha } })).status, 403);
    assert.equal((await api('GET', '/chamados', { token: portaria })).status, 403, 'funcionário fora de chamados');

    const doSindico = await api('POST', '/chamados', {
      token: sindico,
      body: { titulo: 'Chamado do síndico', descricao: 'teste', prioridade: 'baixa' }
    });
    assert.equal(doSindico.status, 201);
    const vistosMorador = (await api('GET', '/chamados', { token: morador })).json;
    assert.ok(!vistosMorador.some((c) => c.id === doSindico.json.id), 'morador não vê chamado alheio');
    assert.equal((await api('GET', `/chamados/${doSindico.json.id}`, { token: morador })).status, 404);

    // Datas @db.Date saem como YYYY-MM-DD e Decimal como number
    await api('PUT', '/condominios/atual', { token: sindico, body: { temPorteiro: true, temAreasReserva: true, areas: ['Salão'] } });
    const { areas } = (await api('GET', '/reservas', { token: morador })).json;
    assert.equal((await api('POST', '/reservas', { token: morador, body: { areaId: areas[0].id, data: '2030-01-15', periodo: 'tarde' } })).status, 201);
    const { reservas } = (await api('GET', '/reservas', { token: morador })).json;
    assert.equal(reservas[0].data, '2030-01-15');
    assert.equal(typeof areas[0].taxa, 'number');

    // --- Encomendas: portaria registra com foto, só o morador vê o código, retirada exige código ---
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]).toString('base64');
    const pacote = {
      unidadeId: unidade.id,
      descricao: 'Caixa teste',
      codigoRastreio: ' aa123456789br ',
      entregadorNome: 'Zé',
      entregadorCpf: '529.982.247-25',
      volumeGrande: true,
      foto: webp
    };
    assert.equal((await api('POST', '/encomendas', { token: morador, body: pacote })).status, 403);
    assert.equal((await api('POST', '/encomendas', { token: zelador, body: pacote })).status, 403, 'só porteiro registra');
    assert.equal((await api('POST', '/encomendas', { token: portaria, body: { ...pacote, entregadorCpf: '111.111.111-11' } })).status, 400);
    assert.equal((await api('POST', '/encomendas', { token: portaria, body: { ...pacote, foto: Buffer.from('jpeg').toString('base64') } })).status, 400);
    const criada = await api('POST', '/encomendas', { token: portaria, body: pacote });
    assert.equal(criada.status, 201);
    assert.equal(criada.json.codigoRetirada, undefined);
    const naPortaria = (await api('GET', '/encomendas', { token: portaria })).json.find((e) => e.id === criada.json.id);
    assert.equal(naPortaria.codigoRetirada, undefined, 'portaria não vê o código');
    assert.equal(naPortaria.temFoto, true);
    assert.equal(naPortaria.volumeGrande, true);
    assert.equal(naPortaria.perecivel, false);
    assert.equal(naPortaria.codigoRastreio, 'AA123456789BR');
    assert.deepEqual(naPortaria.registradoPor, { nome: 'portaria', papel: 'funcionario', cargo: 'porteiro' });
    const codigo = (await api('GET', '/encomendas', { token: morador })).json.find((e) => e.id === criada.json.id).codigoRetirada;
    assert.match(codigo, /^\d{5}$/);
    const retirar = (token, body) => api('PATCH', `/encomendas/${criada.json.id}/retirar`, { token, body });
    assert.equal((await retirar(morador, { codigo, retiradoPor: 'Eu' })).status, 403);
    // 5 códigos errados bloqueiam; nem o código certo passa até o síndico desbloquear
    const errado = codigo === '00000' ? '00001' : '00000';
    for (let i = 0; i < 5; i++) assert.equal((await retirar(portaria, { codigo: errado, retiradoPor: 'Maria' })).status, 400);
    assert.equal((await retirar(portaria, { codigo, retiradoPor: 'Maria' })).status, 423, 'bloqueada');
    assert.equal((await api('GET', '/encomendas', { token: portaria })).json.find((e) => e.id === criada.json.id).bloqueada, true);
    const desbloquear = (token) => api('PATCH', `/encomendas/${criada.json.id}/desbloquear`, { token });
    assert.equal((await desbloquear(portaria)).status, 403, 'só síndico desbloqueia');
    assert.equal((await desbloquear(sindico)).status, 204);
    assert.equal((await retirar(portaria, { codigo, retiradoPor: 'Maria' })).status, 204);
    const retirada = (await api('GET', '/encomendas', { token: portaria })).json.find((e) => e.id === criada.json.id);
    assert.deepEqual(retirada.liberadoPor, { nome: 'portaria', papel: 'funcionario', cargo: 'porteiro' });
    assert.equal(retirada.bloqueada, false);
    assert.equal((await retirar(portaria, { codigo, retiradoPor: 'Maria' })).status, 404, 'não retira duas vezes');

    // --- Isolamento entre condomínios ---
    const outro = await api('POST', '/auth/cadastro', {
      body: { tipo: 'sindico', email: email('outro'), senha, nome: 'Outro', condominioNome: 'Smoke B' }
    });
    const tokenOutro = outro.json.token;
    assert.equal((await api('GET', '/chamados', { token: tokenOutro })).json.length, 0);
    assert.equal((await api('GET', '/unidades', { token: tokenOutro })).json.length, 0);
    assert.equal((await api('GET', '/encomendas', { token: tokenOutro })).json.length, 0);
    assert.equal(
      (await api('PATCH', `/chamados/${doSindico.json.id}/status`, { token: tokenOutro, body: { status: 'concluido' } })).status,
      404
    );

    // Dashboard
    const dash = (await api('GET', '/dashboard', { token: sindico })).json;
    assert.equal(dash.chamados.aberto, 1);
    assert.equal(dash.totais.moradores, 2, 'síndico + morador; funcionário não conta');

    console.log('smoke ok');
  } finally {
    await limpar();
    server.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
