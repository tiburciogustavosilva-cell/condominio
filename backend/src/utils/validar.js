const HttpError = require('./httpError');

function obrigatorio(valor, campo) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    throw new HttpError(400, `Campo obrigatório: ${campo}`);
  }
  return valor;
}

function umDe(valor, opcoes, campo) {
  if (!opcoes.includes(valor)) throw new HttpError(400, `${campo} inválido`);
  return valor;
}

// Campos @db.Date: o frontend manda "YYYY-MM-DD", o Prisma quer Date.
const paraData = (valor) => (valor ? new Date(String(valor).slice(0, 10)) : null);

const numeroOuNull = (valor) => (valor === '' || valor === null || valor === undefined ? null : Number(valor));

// Copia só as chaves presentes (PATCH parcial), aplicando conversões por campo.
function parcial(dados, campos) {
  const saida = {};
  for (const [campo, converter] of Object.entries(campos)) {
    if (dados[campo] !== undefined) saida[campo] = converter ? converter(dados[campo]) : dados[campo];
  }
  return saida;
}

module.exports = { obrigatorio, umDe, paraData, numeroOuNull, parcial };
