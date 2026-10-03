// Smoke test da API: auth JWT Bearer + regras de acesso que antes eram RLS + fluxo de encomendas.
// Cria os próprios condomínios/usuários e apaga tudo no fim — não depende do seed. Rode: npm test
require('dotenv').config();
const assert = require('assert');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/models/prisma');
const { codigo: codigoCheckin } = require('../src/services/assembleias.service');
const { gerarTokenSenha } = require('../src/utils/jwt');

const sufixo = Date.now();
const email = (nome) => `smoke-${nome}-${sufixo}@teste.local`;

async function limpar() {
  const condominioIds = (
    await prisma.profile.findMany({ where: { email: { endsWith: `-${sufixo}@teste.local` } }, select: { condominioId: true } })
  )
    .map((p) => p.condominioId)
    .filter(Boolean);
  const where = { condominioId: { in: condominioIds } };
  await prisma.mapaItem.deleteMany({ where });
  await prisma.assinaturaPagamento.deleteMany({ where });
  await prisma.ordemServico.deleteMany({ where });
  await prisma.manutencao.deleteMany({ where }); // histórico e vínculos com prestadores caem em cascata
  await prisma.prestador.deleteMany({ where });
  await prisma.ativo.deleteMany({ where });
  await prisma.assembleia.deleteMany({ where }); // presenças, pautas, opções e votantes caem em cascata
  await prisma.encomenda.deleteMany({ where });
  await prisma.tarefaExecucao.deleteMany({ where }); // fotos caem em cascata
  await prisma.tarefa.deleteMany({ where });
  await prisma.reserva.deleteMany({ where });
  await prisma.aviso.deleteMany({ where });
  await prisma.profile.deleteMany({ where }); // chamados/comentários caem em cascata
  await prisma.unidade.deleteMany({ where });
  await prisma.area.deleteMany({ where });
  await prisma.condominio.deleteMany({ where: { id: { in: condominioIds } } });
  await prisma.profile.deleteMany({ where: { email: { endsWith: `-${sufixo}@teste.local` } } }); // admin (sem condomínio)
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

    // --- Síndico redefine a senha de quem esqueceu (vazia = mantém) ---
    const idMorador = moradoresLista.find((m) => m.email === email('morador')).id;
    assert.equal((await api('PUT', `/moradores/${idMorador}`, { token: sindico, body: { senha: '123' } })).status, 400, 'senha curta');
    assert.equal((await api('PUT', `/moradores/${idMorador}`, { token: sindico, body: { nome: 'morador' } })).status, 204);
    assert.ok(await login(email('morador'), senha), 'sem senha no corpo, a senha não muda');
    assert.equal((await api('PUT', `/moradores/${idMorador}`, { token: sindico, body: { senha: 'nova-senha-1' } })).status, 204);
    assert.ok(!(await login(email('morador'), senha)), 'senha antiga deixa de valer');
    assert.ok(await login(email('morador'), 'nova-senha-1'), 'entra com a nova');
    assert.equal((await api('PUT', `/moradores/${idMorador}`, { token: sindico, body: { senha } })).status, 204);
    assert.equal((await api('PUT', `/moradores/${idMorador}`, { token: morador, body: { senha: 'hack-123' } })).status, 403, 'só síndico');

    // --- Mapa do condomínio: peças (unidade, prédio, áreas) salvas em lote numa transação ---
    const outra = (await api('POST', '/unidades', { token: sindico, body: { numero: '102', bloco: 'A' } })).json;
    const { randomUUID } = require('crypto');
    const [pecaA, pecaB, rua, predio] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const salvarMapa = (body, token = sindico) => api('PUT', '/mapa', { token, body });
    assert.equal(
      (await salvarMapa({
        itens: [
          { id: pecaA, camada: 'bloco:A', tipo: 'unidade', unidadeId: unidade.id, x: 0, y: 0 },
          { id: pecaB, camada: 'bloco:A', tipo: 'unidade', unidadeId: outra.id, x: 1, y: 0 },
          { id: rua, camada: 'geral', tipo: 'rua', rotulo: 'Rua das Flores', x: 0, y: 3, largura: 6, altura: 1 },
          { id: predio, camada: 'geral', tipo: 'bloco', bloco: 'A', x: 0, y: 0, largura: 2, altura: 2 }
        ]
      })).status,
      204
    );
    // troca de lugar + apaga a rua no mesmo envio
    assert.equal(
      (await salvarMapa({
        itens: [
          { id: pecaA, camada: 'bloco:A', tipo: 'unidade', unidadeId: unidade.id, x: 1, y: 0 },
          { id: pecaB, camada: 'bloco:A', tipo: 'unidade', unidadeId: outra.id, x: 0, y: 0 }
        ],
        removidos: [rua]
      })).status,
      204
    );
    let pecas = (await api('GET', '/mapa', { token: sindico })).json;
    assert.equal(pecas.length, 3, 'rua removida');
    assert.equal(pecas.find((p) => p.id === pecaA).x, 1);
    assert.equal(pecas.find((p) => p.id === predio).largura, 2);
    assert.equal((await salvarMapa({ itens: [{ id: rua, camada: 'geral', tipo: 'foguete', x: 0, y: 0 }] })).status, 400, 'tipo inválido');
    assert.equal((await salvarMapa({ itens: [{ id: rua, camada: 'geral', tipo: 'rua', x: 0, y: 0, largura: 99 }] })).status, 400, 'tamanho inválido');
    assert.equal(
      (await salvarMapa({ itens: [{ id: randomUUID(), camada: 'geral', tipo: 'unidade', unidadeId: randomUUID(), x: 5, y: 5 }] })).status,
      400,
      'unidade de outro condomínio'
    );
    assert.equal((await salvarMapa({ itens: [{ id: rua, camada: 'geral', tipo: 'rua', x: 0, y: 0 }] }, morador)).status, 403, 'só síndico mexe no mapa');
    const segundaPeca = await salvarMapa({ itens: [{ id: randomUUID(), camada: 'bloco:A', tipo: 'unidade', unidadeId: unidade.id, x: 3, y: 3 }] });
    assert.equal(segundaPeca.status, 400, 'unidade que já tem peça');
    assert.match(segundaPeca.json.erro, /já está no mapa/);
    // reaproveitando o id da peça (ex.: unidade mudou de bloco) dá certo
    assert.equal((await salvarMapa({ itens: [{ id: pecaA, camada: 'bloco:B', tipo: 'unidade', unidadeId: unidade.id, x: 0, y: 0 }] })).status, 204);
    assert.equal((await salvarMapa({ itens: [{ id: pecaA, camada: 'bloco:A', tipo: 'unidade', unidadeId: unidade.id, x: 1, y: 0 }] })).status, 204);
    assert.equal((await api('GET', '/mapa', { token: morador })).status, 403);
    let lista = (await api('GET', '/unidades', { token: sindico })).json;
    assert.equal(typeof lista[0].encomendasAguardando, 'number', 'síndico vê pendências');
    lista = (await api('GET', '/unidades', { token: morador })).json;
    assert.equal(lista[0].encomendasAguardando, undefined, 'morador não vê pendências das outras unidades');

    // --- Escopo síndico x morador x funcionário ---
    assert.equal((await api('GET', '/prestadores', { token: morador })).status, 403);
    assert.equal((await api('POST', '/avisos', { token: morador, body: { titulo: 'x', mensagem: 'y' } })).status, 403);
    assert.equal((await api('POST', '/moradores', { token: morador, body: { nome: 'x', email: email('x'), senha } })).status, 403);
    assert.equal((await api('GET', '/chamados', { token: portaria })).status, 403, 'funcionário fora de chamados');

    // --- Manutenção: um plano pode ter mais de um prestador ---
    const prestA = await api('POST', '/prestadores', { token: sindico, body: { nome: 'João', email: email('presta') } });
    assert.equal(prestA.status, 201);
    const prestB = await api('POST', '/prestadores', { token: sindico, body: { nome: 'Maria', email: email('prestb') } });
    assert.equal(prestB.status, 201);
    const planoBase = { titulo: 'Elevador', ultimaManutencao: '2030-01-01', frequenciaUnidade: 'mensal' };
    assert.equal(
      (await api('POST', '/manutencoes', { token: sindico, body: { ...planoBase, prestadorIds: [] } })).status,
      400,
      'precisa de ao menos 1 prestador'
    );
    assert.equal(
      (await api('POST', '/manutencoes', { token: sindico, body: { ...planoBase, prestadorIds: ['00000000-0000-0000-0000-000000000000'] } }))
        .status,
      400,
      'prestador inválido'
    );
    const plano = await api('POST', '/manutencoes', {
      token: sindico,
      body: { ...planoBase, prestadorIds: [prestA.json.id, prestB.json.id] }
    });
    assert.equal(plano.status, 201);
    const planoDe = async (token = sindico) =>
      (await api('GET', '/manutencoes', { token })).json.find((m) => m.id === plano.json.id);
    let planoListado = await planoDe();
    assert.equal(planoListado.prestadores.length, 2);
    assert.ok(planoListado.prestadorNome.includes('João') && planoListado.prestadorNome.includes('Maria'));

    // atualizar troca o conjunto inteiro (não acumula)
    assert.equal(
      (await api('PUT', `/manutencoes/${plano.json.id}`, { token: sindico, body: { ...planoBase, prestadorIds: [prestA.json.id] } })).status,
      204
    );
    planoListado = await planoDe();
    assert.deepEqual(planoListado.prestadores.map((p) => p.id), [prestA.json.id]);

    // notificar manda e-mail pra todos os prestadores com e-mail cadastrados no plano
    assert.equal(
      (await api('PUT', `/manutencoes/${plano.json.id}`, {
        token: sindico,
        body: { ...planoBase, prestadorIds: [prestA.json.id, prestB.json.id] }
      })).status,
      204
    );
    const notif = await api('POST', `/manutencoes/${plano.json.id}/notificar`, { token: sindico });
    assert.equal(notif.status, 200);
    assert.equal(notif.json.para.length, 2);

    // remover prestador só tira ele do plano — o plano continua existindo com o(s) outro(s)
    assert.equal((await api('DELETE', `/prestadores/${prestA.json.id}`, { token: sindico })).status, 204);
    planoListado = await planoDe();
    assert.ok(planoListado, 'plano continua existindo depois de remover 1 dos prestadores');
    assert.deepEqual(planoListado.prestadores.map((p) => p.id), [prestB.json.id]);

    // --- Ordem de serviço: anexos de nota fiscal / orçamento (PDF, imagens) ---
    const osAnexo = await api('POST', '/ordens-servico', { token: sindico, body: { descricao: 'Troca de lâmpadas' } });
    assert.equal(osAnexo.status, 201);
    const osId = osAnexo.json.id;
    const pdfB64 = Buffer.from('%PDF-1.4 fake').toString('base64');
    const webpB64Anexo = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]).toString('base64');
    const anexar = (token, body) => api('POST', `/ordens-servico/${osId}/anexos`, { token, body });
    assert.equal(
      (await anexar(morador, { tipo: 'nota_fiscal', nome: 'nf.pdf', arquivo: `data:application/pdf;base64,${pdfB64}` })).status,
      403,
      'só síndico anexa'
    );
    assert.equal(
      (await anexar(sindico, { tipo: 'invalido', nome: 'x.pdf', arquivo: `data:application/pdf;base64,${pdfB64}` })).status,
      400,
      'tipo inválido'
    );
    assert.equal(
      (await anexar(sindico, { tipo: 'nota_fiscal', nome: 'x.exe', arquivo: 'data:application/x-msdownload;base64,AAAA' })).status,
      400,
      'formato não aceito'
    );
    assert.equal(
      (await anexar(sindico, { tipo: 'nota_fiscal', nome: 'nf-fake.pdf', arquivo: `data:application/pdf;base64,${webpB64Anexo}` })).status,
      400,
      'assinatura não bate com o mimetype informado'
    );
    const nf = await anexar(sindico, { tipo: 'nota_fiscal', nome: 'nf.pdf', arquivo: `data:application/pdf;base64,${pdfB64}` });
    assert.equal(nf.status, 201);
    const orc = await anexar(sindico, { tipo: 'orcamento', nome: 'orcamento.webp', arquivo: `data:image/webp;base64,${webpB64Anexo}` });
    assert.equal(orc.status, 201);
    const listaAnexos = (await api('GET', `/ordens-servico/${osId}/anexos`, { token: sindico })).json;
    assert.equal(listaAnexos.length, 2);
    assert.ok(!('arquivo' in listaAnexos[0]), 'lista não traz os bytes');
    const baixarAnexo = (anexoId, token) =>
      fetch(`${base}/ordens-servico/${osId}/anexos/${anexoId}`, { headers: { Authorization: `Bearer ${token}` } });
    const resNf = await baixarAnexo(nf.json.id, sindico);
    assert.equal(resNf.status, 200);
    assert.equal(resNf.headers.get('content-type'), 'application/pdf');
    assert.equal((await baixarAnexo(nf.json.id, morador)).status, 403, 'morador fora de ordens de serviço');
    assert.equal((await api('DELETE', `/ordens-servico/${osId}/anexos/${nf.json.id}`, { token: sindico })).status, 204);
    assert.equal((await api('GET', `/ordens-servico/${osId}/anexos`, { token: sindico })).json.length, 1);

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

    // --- Ocorrências: morador registra (com ou sem foto), só o síndico ou o próprio autor vê a foto ---
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]).toString('base64');
    const ocSemFoto = await api('POST', '/ocorrencias', { token: morador, body: { titulo: 'Vazamento', descricao: 'teste' } });
    assert.equal(ocSemFoto.status, 201);
    const ocComFoto = await api('POST', '/ocorrencias', {
      token: morador,
      body: { titulo: 'Barulho', descricao: 'teste com foto', foto: webp }
    });
    assert.equal(ocComFoto.status, 201);
    const listaMorador = (await api('GET', '/ocorrencias', { token: morador })).json;
    assert.equal(listaMorador.find((o) => o.id === ocSemFoto.json.id).temFoto, false);
    assert.equal(listaMorador.find((o) => o.id === ocComFoto.json.id).temFoto, true);
    const fotoOcorrencia = (id, token) => fetch(`${base}/ocorrencias/${id}/foto`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await fotoOcorrencia(ocComFoto.json.id, morador)).status, 200);
    assert.equal((await fotoOcorrencia(ocSemFoto.json.id, morador)).status, 404, 'sem foto');
    assert.equal((await fotoOcorrencia(ocComFoto.json.id, sindico)).status, 200, 'síndico vê qualquer foto');

    // --- Encomendas: portaria registra com foto, só o morador vê o código, retirada exige código ---
    const pacote = {
      unidadeId: unidade.id,
      observacao: 'Caixa teste',
      codigoRastreio: ' aa123456789br ',
      volumeGrande: true,
      foto: webp
    };
    assert.equal((await api('POST', '/encomendas', { token: morador, body: pacote })).status, 403);
    assert.equal((await api('POST', '/encomendas', { token: zelador, body: pacote })).status, 403, 'só porteiro registra');
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
    // Síndico: sem unidade não vê o código; morando na unidade, vê o das encomendas dela
    const codigoDoSindico = async () =>
      (await api('GET', '/encomendas', { token: sindico })).json.find((e) => e.id === criada.json.id).codigoRetirada;
    assert.equal(await codigoDoSindico(), undefined);
    const vincularSindico = (unidadeId) => api('PUT', `/moradores/${me.json.usuario.id}`, { token: sindico, body: { unidadeId } });
    assert.equal((await vincularSindico(unidade.id)).status, 204);
    assert.equal(await codigoDoSindico(), codigo);
    await vincularSindico(null);
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

    // --- Encomendas: retirada principal pelo QR (portaria gera, o próprio morador confirma) ---
    const pacote2 = await api('POST', '/encomendas', { token: portaria, body: { ...pacote, observacao: 'Caixa QR' } });
    assert.equal(pacote2.status, 201);
    const gerarQr = (token) => api('POST', `/encomendas/${pacote2.json.id}/qr-retirada`, { token });
    assert.equal((await gerarQr(morador)).status, 403, 'só a portaria gera o QR');
    const qr1 = await gerarQr(portaria);
    assert.equal(qr1.status, 200);
    assert.equal(typeof qr1.json.token, 'string');
    const retirarQr = (token, qrToken) => api('POST', '/encomendas/retirar-qr', { token, body: { token: qrToken } });
    assert.equal((await retirarQr(morador, 'lixo')).status, 400, 'token inválido');
    assert.equal((await retirarQr(portaria, qr1.json.token)).status, 403, 'portaria não mora na unidade');
    assert.equal((await retirarQr(morador, qr1.json.token)).status, 204);
    const viaQr = (await api('GET', '/encomendas', { token: portaria })).json.find((e) => e.id === pacote2.json.id);
    assert.equal(viaQr.status, 'entregue');
    assert.equal(viaQr.recebidoPor, 'morador');
    assert.deepEqual(viaQr.liberadoPor, { nome: 'portaria', papel: 'funcionario', cargo: 'porteiro' });
    assert.equal((await retirarQr(morador, qr1.json.token)).status, 404, 'QR de uso único');

    // --- Tarefas: síndico cria por cargo, funcionário do cargo conclui com foto ---
    const tarefa = await api('POST', '/tarefas', {
      token: sindico,
      body: { titulo: 'Lavar a garagem', cargo: 'zelador', recorrencia: 'diaria' }
    });
    assert.equal(tarefa.status, 201);
    assert.equal((await api('POST', '/tarefas', { token: sindico, body: { titulo: 'x', cargo: 'zelador', recorrencia: 'semanal', diasSemana: [] } })).status, 400);
    assert.equal((await api('POST', '/tarefas', { token: zelador, body: { titulo: 'x', cargo: 'zelador', recorrencia: 'diaria' } })).status, 403);
    assert.equal((await api('GET', '/tarefas/hoje', { token: morador })).status, 403, 'condômino fora de tarefas');
    const doZelador = (await api('GET', '/tarefas/hoje', { token: zelador })).json;
    assert.match(doZelador.data, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(doZelador.tarefas.some((t) => t.id === tarefa.json.id && !t.execucao));
    assert.ok(!(await api('GET', '/tarefas/hoje', { token: portaria })).json.tarefas.some((t) => t.id === tarefa.json.id), 'porteiro não vê tarefa de zelador');
    const concluir = (token, body) => api('POST', `/tarefas/${tarefa.json.id}/concluir`, { token, body });
    assert.equal((await concluir(portaria, { fotos: [webp] })).status, 403, 'outro cargo');
    assert.equal((await concluir(zelador, { fotos: [] })).status, 400, 'foto obrigatória');
    assert.equal((await concluir(zelador, { fotos: [Buffer.from('jpeg').toString('base64')] })).status, 400);
    assert.equal((await concluir(zelador, { fotos: [webp, webp], observacao: 'feito' })).status, 201);
    assert.equal((await concluir(zelador, { fotos: [webp] })).status, 409, 'uma vez por dia');
    const feita = (await api('GET', '/tarefas/hoje', { token: zelador })).json.tarefas.find((t) => t.id === tarefa.json.id);
    assert.equal(feita.execucao.concluidaPor.nome, 'zelador');
    assert.equal(feita.execucao.fotos.length, 2);
    const hist = (await api('GET', '/tarefas/execucoes', { token: sindico })).json;
    assert.equal(hist[0].tarefa.titulo, 'Lavar a garagem');
    assert.equal((await api('GET', '/tarefas/execucoes', { token: zelador })).status, 403);
    assert.equal((await api('GET', `/tarefas/execucoes?tarefaId=${tarefa.json.id}&dia=${doZelador.data}`, { token: sindico })).json.length, 1);
    assert.equal((await api('GET', '/tarefas/execucoes?dia=2000-01-01', { token: sindico })).json.length, 0);
    assert.equal((await api('POST', '/tarefas', { token: sindico, body: { titulo: '   ', cargo: 'zelador', recorrencia: 'diaria' } })).status, 400);
    assert.equal((await api('POST', '/tarefas', { token: sindico, body: { titulo: 'x', cargo: 'zelador', recorrencia: 'mensal', diaMes: 5.5 } })).status, 400);
    assert.equal((await api('POST', '/tarefas', { token: sindico, body: { titulo: 'x', cargo: 'zelador', recorrencia: 'unica', data: 'amanha' } })).status, 400);
    assert.equal(
      (await api('PUT', `/tarefas/${tarefa.json.id}`, { token: sindico, body: { titulo: 'x', cargo: 'zelador', recorrencia: 'semanal', diasSemana: [1] } })).status,
      409,
      'agenda travada depois de executada'
    );
    const fotoRes = await fetch(`${base}/tarefas/fotos/${hist[0].fotos[0]}`, { headers: { Authorization: `Bearer ${zelador}` } });
    assert.equal(fotoRes.headers.get('content-type'), 'image/webp');
    const perdidas = await api('GET', '/tarefas/perdidas', { token: sindico });
    assert.equal(perdidas.status, 200);
    assert.ok(!perdidas.json.tarefas.some((t) => t.id === tarefa.json.id), 'criada hoje: nenhum dia perdido ainda');
    assert.equal((await api('GET', '/tarefas/perdidas?de=ontem', { token: sindico })).status, 400);
    assert.equal((await api('GET', '/tarefas/perdidas', { token: zelador })).status, 403);
    assert.equal((await api('DELETE', `/tarefas/${tarefa.json.id}`, { token: sindico })).status, 409, 'com histórico não exclui');
    assert.equal(
      (await api('PUT', `/tarefas/${tarefa.json.id}`, { token: sindico, body: { titulo: 'Lavar a garagem', cargo: 'zelador', recorrencia: 'diaria', ativa: false } })).status,
      204
    );
    assert.ok(!(await api('GET', '/tarefas/hoje', { token: zelador })).json.tarefas.some((t) => t.id === tarefa.json.id), 'desativada some');

    // --- Assembleia: check-in com código fixo, 1 voto secreto por unidade ---
    const assembleia = await api('POST', '/assembleias', {
      token: sindico,
      body: { titulo: 'AGO', pautas: [{ titulo: 'Pintar a fachada', opcoes: ['Verde', 'Azul', 'Não pintar'] }] }
    });
    assert.equal(assembleia.status, 201);
    assert.equal((await api('POST', '/assembleias', { token: morador, body: { titulo: 'x' } })).status, 403);
    assert.equal((await api('GET', '/assembleias', { token: zelador })).status, 403, 'funcionário fora');
    const rotaA = `/assembleias/${assembleia.json.id}`;
    let estado = (await api('GET', rotaA, { token: morador })).json;
    const pauta = estado.pautas[0];
    assert.deepEqual(pauta.opcoes.map((o) => o.texto), ['Verde', 'Azul', 'Não pintar']);
    assert.equal(estado.codigo, undefined, 'condômino não vê o código');
    assert.equal(estado.minhaUnidade.presente, false);
    const votar = (token, opcaoId) => api('POST', `/assembleias/pautas/${pauta.id}/votar`, { token, body: { opcaoId } });
    assert.equal((await votar(morador, pauta.opcoes[0].id)).status, 400, 'pauta ainda em rascunho');
    assert.equal((await api('PATCH', `/assembleias/pautas/${pauta.id}`, { token: sindico, body: { status: 'votando' } })).status, 204);
    assert.equal((await votar(morador, pauta.opcoes[0].id)).status, 403, 'sem check-in');
    const { codigo: codigoTela } = (await api('GET', rotaA, { token: sindico })).json;
    const { segredo } = await prisma.assembleia.findUnique({ where: { id: assembleia.json.id } });
    assert.equal(codigoTela, codigoCheckin(segredo));
    assert.equal((await api('GET', rotaA, { token: sindico })).json.codigo, codigoTela, 'código fixo, não muda entre consultas');
    const codigoErrado = codigoTela === '000000' ? '000001' : '000000';
    assert.equal((await api('POST', `${rotaA}/checkin`, { token: morador, body: { codigo: codigoErrado } })).status, 400, 'código errado');
    const { qr } = (await api('GET', rotaA, { token: sindico })).json;
    assert.equal((await api('POST', `${rotaA}/checkin`, { token: morador, body: { qr: codigoTela } })).status, 400, 'número não serve como QR');
    assert.equal((await api('POST', `${rotaA}/checkin`, { token: morador, body: { qr } })).status, 204, 'check-in pelo QR');
    assert.equal((await api('POST', `${rotaA}/checkin`, { token: morador, body: { codigo: codigoTela } })).status, 204, 'repetir não dá erro');
    assert.equal((await votar(morador, pauta.opcoes[1].id)).status, 204);
    assert.equal((await votar(morador, pauta.opcoes[0].id)).status, 409, 'unidade já votou');
    // voto pela mesa: unidade sem celular, síndico marca presença e entrega o aparelho
    const semCelular = (await api('POST', '/unidades', { token: sindico, body: { numero: '102', bloco: 'A' } })).json;
    const pelaMesa = (unidadeId) =>
      api('POST', `/assembleias/pautas/${pauta.id}/votar`, { token: sindico, body: { opcaoId: pauta.opcoes[2].id, unidadeId } });
    assert.equal((await pelaMesa(semCelular.id)).status, 403, 'mesa exige presença marcada');
    assert.equal((await api('POST', `${rotaA}/presencas`, { token: sindico, body: { unidadeId: semCelular.id } })).status, 204);
    assert.equal((await pelaMesa(semCelular.id)).status, 204);
    assert.equal((await pelaMesa(semCelular.id)).status, 409, 'mesa também é 1 voto por unidade');
    assert.equal((await pelaMesa(unidade.id)).status, 409, 'unidade que já votou pelo celular');
    estado = (await api('GET', rotaA, { token: sindico })).json;
    assert.deepEqual(estado.pautas[0].opcoes.map((o) => o.votos), [null, null, null], 'placar escondido durante a votação');
    assert.equal(estado.pautas[0].votantes, 2);
    assert.equal(estado.presentes, 2);
    assert.ok(!JSON.stringify(estado.pautas).includes(unidade.id), 'placar não liga voto a unidade');
    assert.ok(!JSON.stringify(estado.pautas).includes(semCelular.id));
    assert.deepEqual((await api('GET', rotaA, { token: morador })).json.minhaUnidade, { presente: true, pautasVotadas: [pauta.id] });
    assert.equal((await api('PATCH', `/assembleias/pautas/${pauta.id}`, { token: sindico, body: { status: 'rascunho' } })).status, 400, 'não volta');
    // limite de tentativas: 5 erros e nem o código certo passa (por 1 minuto)
    for (let i = 0; i < 5; i++) {
      assert.equal((await api('POST', `${rotaA}/checkin`, { token: morador, body: { codigo: '000000' } })).status, 400);
    }
    assert.equal((await api('POST', `${rotaA}/checkin`, { token: morador, body: { codigo: codigoTela } })).status, 429, 'bloqueado');

    // desfazer: pauta em rascunho se edita/exclui; aberta não
    const extra = await api('POST', `${rotaA}/pautas`, { token: sindico, body: { titulo: 'Tipo errado' } });
    const rotaExtra = `/assembleias/pautas/${extra.json.id}`;
    assert.equal((await api('PUT', rotaExtra, { token: sindico, body: { titulo: 'Trocar portão', opcoes: ['Sim', 'Não'] } })).status, 204);
    estado = (await api('GET', rotaA, { token: sindico })).json;
    assert.deepEqual(estado.pautas[1].opcoes.map((o) => o.texto), ['Sim', 'Não']);
    assert.equal(estado.pautas[1].titulo, 'Trocar portão');
    assert.equal((await api('DELETE', rotaExtra, { token: morador })).status, 403);
    assert.equal((await api('DELETE', rotaExtra, { token: sindico })).status, 204);
    assert.equal((await api('PUT', `/assembleias/pautas/${pauta.id}`, { token: sindico, body: { titulo: 'x' } })).status, 400, 'aberta não edita');
    // presença marcada por engano sai; de quem já votou, não
    const engano = (await api('POST', '/unidades', { token: sindico, body: { numero: '103', bloco: 'A' } })).json;
    await api('POST', `${rotaA}/presencas`, { token: sindico, body: { unidadeId: engano.id } });
    assert.equal((await api('DELETE', `${rotaA}/presencas/${engano.id}`, { token: sindico })).status, 204);
    assert.equal((await api('DELETE', `${rotaA}/presencas/${semCelular.id}`, { token: sindico })).status, 409, 'já votou');
    // assembleia com votos não se exclui; sem votos, sim
    assert.equal((await api('DELETE', rotaA, { token: sindico })).status, 409);
    const vazia = await api('POST', '/assembleias', { token: sindico, body: { titulo: 'Criada por engano' } });
    assert.equal((await api('DELETE', `/assembleias/${vazia.json.id}`, { token: sindico })).status, 204);

    // síndico que também é morador vota pela própria unidade, sem marcar presença antes
    const doSindicoUnidade = (await api('POST', '/unidades', { token: sindico, body: { numero: '104', bloco: 'A' } })).json;
    await prisma.profile.update({ where: { email: email('sindico') }, data: { unidadeId: doSindicoUnidade.id } });
    const votoSindico = await api('POST', `/assembleias/pautas/${pauta.id}/votar`, {
      token: sindico,
      body: { opcaoId: pauta.opcoes[0].id }
    });
    assert.equal(votoSindico.status, 204);
    assert.deepEqual((await api('GET', rotaA, { token: sindico })).json.minhaUnidade, { presente: true, pautasVotadas: [pauta.id] });
    await prisma.profile.update({ where: { email: email('sindico') }, data: { unidadeId: null } });

    assert.equal((await api('POST', `${rotaA}/encerrar`, { token: sindico })).status, 204);
    assert.equal((await pelaMesa(engano.id)).status, 400, 'pauta encerrada não recebe voto');
    estado = (await api('GET', rotaA, { token: sindico })).json;
    assert.equal(estado.pautas[0].status, 'encerrada');
    assert.deepEqual(estado.pautas[0].opcoes.map((o) => o.votos), [1, 1, 1], 'placar aparece ao encerrar');
    assert.equal(estado.codigo, undefined, 'encerrada não tem código');
    assert.equal(estado.qr, undefined);
    // voto deixou de ser secreto: depois de encerrada, dá pra ver quem votou em quê
    const votoDe = (unidadeId) => estado.pautas[0].votosPorUnidade.find((v) => v.unidade.id === unidadeId)?.opcaoId;
    assert.equal(votoDe(unidade.id), pauta.opcoes[1].id, 'morador votou na opção 2');
    assert.equal(votoDe(semCelular.id), pauta.opcoes[2].id, 'voto pela mesa');
    assert.equal(votoDe(doSindicoUnidade.id), pauta.opcoes[0].id, 'síndico votando pela própria unidade');
    const estadoMorador = (await api('GET', rotaA, { token: morador })).json;
    assert.deepEqual(estadoMorador.pautas[0].votosPorUnidade, estado.pautas[0].votosPorUnidade, 'morador também vê');

    // --- pesoVotoPor: condomínio escolhe qual campo da unidade decide o peso do voto/quórum ---
    assert.equal(
      (await api('PATCH', '/condominios/peso-voto', { token: morador, body: { pesoVotoPor: 'fracaoIdeal' } })).status,
      403,
      'só síndico muda'
    );
    assert.equal((await api('PATCH', '/condominios/peso-voto', { token: sindico, body: { pesoVotoPor: 'invalido' } })).status, 400);
    assert.equal((await api('PATCH', '/condominios/peso-voto', { token: sindico, body: { pesoVotoPor: 'fracaoIdeal' } })).status, 204);
    assert.equal(
      (await api('PUT', `/unidades/${unidade.id}`, { token: sindico, body: { numero: unidade.numero, bloco: unidade.bloco, fracaoIdeal: '10' } })).status,
      204
    );
    assert.equal(
      (await api('PUT', `/unidades/${semCelular.id}`, { token: sindico, body: { numero: semCelular.numero, bloco: semCelular.bloco, fracaoIdeal: '5' } })).status,
      204
    );
    const assembleia2 = await api('POST', '/assembleias', {
      token: sindico,
      body: { titulo: 'Extra', pautas: [{ titulo: 'Teste de peso', opcoes: ['Sim', 'Não'] }] }
    });
    const rotaA2 = `/assembleias/${assembleia2.json.id}`;
    let estado2 = (await api('GET', rotaA2, { token: sindico })).json;
    assert.equal(estado2.pesoVotoPor, 'fracaoIdeal');
    assert.equal(estado2.pesoTotal, 15, 'soma da fração ideal de todas as unidades (10 + 5 + 0 + 0)');
    const pautaExtra = estado2.pautas[0];
    assert.equal((await api('PATCH', `/assembleias/pautas/${pautaExtra.id}`, { token: sindico, body: { status: 'votando' } })).status, 204);
    const { codigo: codigoExtra } = (await api('GET', rotaA2, { token: sindico })).json;
    assert.equal((await api('POST', `${rotaA2}/checkin`, { token: morador, body: { codigo: codigoExtra } })).status, 204);
    assert.equal(
      (await api('POST', `/assembleias/pautas/${pautaExtra.id}/votar`, { token: morador, body: { opcaoId: pautaExtra.opcoes[0].id } })).status,
      204
    );
    estado2 = (await api('GET', rotaA2, { token: sindico })).json;
    assert.equal(estado2.pesoPresente, 10, 'peso pela fração ideal da unidade, não pela contagem simples');
    assert.equal((await api('POST', `${rotaA2}/encerrar`, { token: sindico })).status, 204);
    estado2 = (await api('GET', rotaA2, { token: sindico })).json;
    assert.equal(Number(estado2.pautas[0].opcoes[0].pesoVotos), 10, 'voto pesou pela fração ideal, não 1');
    // trocar pra pontos muda o cálculo na hora, sem precisar de nova assembleia
    assert.equal(
      (await api('PUT', `/unidades/${unidade.id}`, { token: sindico, body: { numero: unidade.numero, bloco: unidade.bloco, fracaoIdeal: '10', pontos: '7' } }))
        .status,
      204
    );
    assert.equal((await api('PATCH', '/condominios/peso-voto', { token: sindico, body: { pesoVotoPor: 'pontos' } })).status, 204);
    estado2 = (await api('GET', rotaA2, { token: sindico })).json;
    assert.equal(estado2.pesoVotoPor, 'pontos');
    assert.equal(estado2.pesoPresente, 7, 'trocou a métrica: agora usa pontos, não mais fração ideal');
    assert.equal((await api('PATCH', '/condominios/peso-voto', { token: sindico, body: { pesoVotoPor: 'peso' } })).status, 204);

    // --- Isolamento entre condomínios ---
    const outro = await api('POST', '/auth/cadastro', {
      body: { tipo: 'sindico', email: email('outro'), senha, nome: 'Outro', condominioNome: 'Smoke B' }
    });
    const tokenOutro = outro.json.token;
    assert.equal(
      (await api('PUT', '/mapa', { token: tokenOutro, body: { itens: [{ id: pecaA, camada: 'geral', tipo: 'rua', x: 0, y: 0 }] } })).status,
      400,
      'id de peça de outro condomínio'
    );
    assert.equal((await api('GET', '/chamados', { token: tokenOutro })).json.length, 0);
    assert.equal((await api('GET', '/unidades', { token: tokenOutro })).json.length, 0);
    assert.equal((await api('GET', '/encomendas', { token: tokenOutro })).json.length, 0);
    assert.equal((await api('GET', '/tarefas/execucoes', { token: tokenOutro })).json.length, 0);
    assert.equal((await api('GET', `/assembleias/${assembleia.json.id}`, { token: tokenOutro })).status, 404);
    assert.equal(
      (await api('PATCH', `/chamados/${doSindico.json.id}/status`, { token: tokenOutro, body: { status: 'concluido' } })).status,
      404
    );

    // --- Admin da plataforma: cria condomínio + síndico, trava e destrava o acesso ---
    await prisma.profile.create({
      data: { nome: 'Admin', email: email('admin'), senhaHash: await bcrypt.hash(senha, 10), papel: 'admin' }
    });
    const admin = await login(email('admin'), senha);
    assert.equal((await api('GET', '/admin/condominios', { token: sindico })).status, 403, 'síndico não é admin');
    const novo = await api('POST', '/admin/condominios', {
      token: admin,
      body: { nome: 'Smoke Admin', sindicoNome: 'S', sindicoEmail: email('sindico-admin'), sindicoSenha: senha }
    });
    assert.equal(novo.status, 201);
    const sindicoNovo = await login(email('sindico-admin'), senha);
    assert.equal((await api('GET', '/chamados', { token: sindicoNovo })).status, 200);
    const travar = (motivo) => api('PATCH', `/admin/condominios/${novo.json.id}`, { token: admin, body: { bloqueadoMotivo: motivo } });
    assert.equal((await travar('Mensalidade em atraso')).json.bloqueadoMotivo, 'Mensalidade em atraso');
    assert.equal((await api('GET', '/chamados', { token: sindicoNovo })).status, 423, 'bloqueado não entra');
    assert.equal((await api('PUT', '/condominios/atual', { token: sindicoNovo, body: {} })).status, 423, 'nem pelo onboarding');
    assert.equal((await api('GET', '/auth/me', { token: sindicoNovo })).json.condominio.bloqueadoMotivo, 'Mensalidade em atraso');
    assert.equal((await api('GET', '/chamados', { token: sindico })).status, 200, 'outro condomínio segue liberado');
    assert.equal((await travar('')).json.bloqueadoMotivo, null);
    assert.equal((await api('GET', '/chamados', { token: sindicoNovo })).status, 200, 'destravado volta a entrar');
    assert.ok((await api('GET', '/admin/condominios', { token: admin })).json.some((c) => c.id === novo.json.id));
    const editar = (body) => api('PATCH', `/admin/condominios/${novo.json.id}`, { token: admin, body });
    const editado = await editar({ nome: ' Smoke Editado ', endereco: 'Rua X, 1' });
    assert.equal(editado.json.nome, 'Smoke Editado');
    assert.equal(editado.json.endereco, 'Rua X, 1');
    assert.equal((await editar({ nome: '' })).status, 400, 'nome não pode ficar vazio');
    assert.equal((await editar({ endereco: null })).json.endereco, '', 'null vira vazio, não erro 500');

    // Assinatura: registra pagamento, o vigente aparece na lista, exclui
    const pagar = (body) => api('POST', `/admin/condominios/${novo.json.id}/pagamentos`, { token: admin, body });
    assert.equal((await pagar({ valor: 0, pagoEm: '2026-10-01', validoAte: '2026-11-01' })).status, 400, 'valor zero');
    const semCondominio = { token: admin, body: { valor: 1, pagoEm: '2026-10-01', validoAte: '2026-11-01' } };
    assert.equal((await api('POST', `/admin/condominios/${require('crypto').randomUUID()}/pagamentos`, semCondominio)).status, 404);
    assert.equal((await pagar({ valor: 99, pagoEm: '2026-10-01', validoAte: '2026-09-01' })).status, 400, 'vale antes de pagar');
    await pagar({ valor: 199.9, pagoEm: '2026-09-01', validoAte: '2026-10-01' });
    const pago = await pagar({ valor: 199.9, pagoEm: '2026-10-01', validoAte: '2026-11-01' });
    assert.equal(pago.status, 201);
    const comPagamento = (await api('GET', '/admin/condominios', { token: admin })).json.find((c) => c.id === novo.json.id);
    assert.deepEqual(comPagamento.pagamentos[0], { valor: 199.9, pagoEm: '2026-10-01', validoAte: '2026-11-01' }, 'vigente = maior validoAte');
    assert.equal((await api('DELETE', `/admin/pagamentos/${pago.json.id}`, { token: admin })).status, 204);
    assert.equal((await api('GET', `/admin/condominios/${novo.json.id}/pagamentos`, { token: admin })).json.length, 1);

    // Suporte: admin entra como o síndico (mesmo bloqueado), mas esse token não é admin
    const usuariosNovo = (await api('GET', `/admin/condominios/${novo.json.id}/usuarios`, { token: admin })).json;
    assert.equal(usuariosNovo.length, 1);
    await travar('Mensalidade em atraso');
    const suporte = (await api('POST', `/admin/usuarios/${usuariosNovo[0].id}/acessar`, { token: admin })).json;
    assert.equal(suporte.usuario.email, email('sindico-admin'));
    assert.equal((await api('GET', '/chamados', { token: suporte.token })).status, 200, 'suporte passa pelo bloqueio');
    assert.equal((await api('GET', '/admin/condominios', { token: suporte.token })).status, 403);
    assert.equal((await api('POST', `/admin/usuarios/${usuariosNovo[0].id}/acessar`, { token: sindico })).status, 403);
    await travar('');

    // Link do convite: define a senha, já entra logado, e não vale de novo (sem e-mail de verdade aqui)
    const linkSenha = gerarTokenSenha(await prisma.profile.findUnique({ where: { email: email('sindico-admin') } }));
    const definir = (token, s) => api('POST', '/auth/definir-senha', { body: { token, senha: s } });
    assert.equal((await definir(linkSenha, '123')).status, 400, 'senha curta');
    assert.equal((await definir(sindico, 'nova-senha-2')).status, 400, 'token de sessão não serve de convite');
    const definida = await definir(linkSenha, 'nova-senha-2');
    assert.equal(definida.status, 200);
    assert.equal((await api('GET', '/chamados', { token: definida.json.token })).status, 200);
    assert.ok(await login(email('sindico-admin'), 'nova-senha-2'));
    assert.equal((await definir(linkSenha, 'outra-senha')).status, 400, 'link usado não vale de novo');

    // Dashboard
    const dash = (await api('GET', '/dashboard', { token: sindico })).json;
    assert.equal(dash.chamados.aberto, 1);
    assert.equal(dash.totais.moradores, 2, 'síndico + morador; funcionário não conta');
    assert.equal(dash.totais.funcionarios, 2);
    assert.equal(typeof dash.sindico.tarefasHoje.total, 'number');
    assert.ok(Array.isArray(dash.sindico.proximasManutencoes));
    assert.equal((await api('GET', '/dashboard', { token: morador })).json.sindico, null, 'resumo do síndico não vaza pro morador');

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
