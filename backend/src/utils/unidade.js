// "A - 101"; sem bloco (salvo como "-") vira só "101".
const rotuloUnidade = (u) => (!u ? null : !u.bloco || u.bloco === '-' ? u.numero : `${u.bloco} - ${u.numero}`);

module.exports = { rotuloUnidade };
