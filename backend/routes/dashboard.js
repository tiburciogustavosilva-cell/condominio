const express = require('express');
const { readDB } = require('../db');
const { autenticar } = require('../middleware/auth');
const { statusManutencao } = require('../lib/recorrencia');

const router = express.Router();

router.get('/', autenticar, (req, res) => {
  const db = readDB();
  const ehSindico = req.usuario.papel === 'sindico';
  const hoje = new Date().toISOString().slice(0, 10);

  const chamados = ehSindico
    ? db.chamados
    : db.chamados.filter((c) => c.usuarioId === req.usuario.id);
  const reservas = ehSindico
    ? db.reservas
    : db.reservas.filter((r) => r.usuarioId === req.usuario.id);
  const encomendas = ehSindico
    ? db.encomendas
    : db.encomendas.filter((e) => e.unidadeId === req.usuario.unidadeId);

  const manutStatus = ehSindico
    ? db.manutencoes.filter((m) => m.ativo).map((m) => statusManutencao(m, hoje).status)
    : [];

  res.json({
    chamados: {
      aberto: chamados.filter((c) => c.status === 'aberto').length,
      em_andamento: chamados.filter((c) => c.status === 'em_andamento').length,
      concluido: chamados.filter((c) => c.status === 'concluido').length
    },
    reservas: {
      pendentes: reservas.filter((r) => r.status === 'pendente').length,
      proximas: reservas.filter((r) => r.status === 'aprovada' && r.data >= hoje).length
    },
    encomendas: {
      aguardando: encomendas.filter((e) => e.status === 'aguardando').length
    },
    manutencoes: ehSindico
      ? {
          vencidas: manutStatus.filter((s) => s === 'vencida').length,
          proximas: manutStatus.filter((s) => s === 'proxima').length
        }
      : null,
    totais: ehSindico
      ? { unidades: db.unidades.length, moradores: db.usuarios.length }
      : null,
    avisos: [...db.avisos]
      .sort((a, b) => {
        if (!!b.fixado !== !!a.fixado) return b.fixado ? 1 : -1;
        return new Date(b.criadoEm) - new Date(a.criadoEm);
      })
      .slice(0, 4)
  });
});

module.exports = router;
