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

/** CPF só com dígitos, validado pelos dígitos verificadores. */
function cpf(valor) {
  const d = String(valor || '').replace(/\D/g, '');
  const digito = (n) => {
    const soma = [...d.slice(0, n)].reduce((acc, c, i) => acc + Number(c) * (n + 1 - i), 0);
    return ((soma * 10) % 11) % 10;
  };
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d) || digito(9) !== Number(d[9]) || digito(10) !== Number(d[10])) {
    throw new HttpError(400, 'CPF inválido');
  }
  return d;
}

module.exports = { obrigatorio, umDe, paraData, numeroOuNull, parcial, cpf };
