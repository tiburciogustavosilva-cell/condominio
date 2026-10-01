// Cria (ou promove) o admin da plataforma. Uso: npm run admin -- email senha "Nome"
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/models/prisma');
const { validarSenha, normalizarEmail } = require('../src/services/auth.service');

async function main() {
  const [emailBruto, senha, nome = 'Administrador'] = process.argv.slice(2);
  const email = normalizarEmail(emailBruto);
  validarSenha(senha);
  const dados = { papel: 'admin', senhaHash: await bcrypt.hash(senha, 10), condominioId: null, unidadeId: null };
  await prisma.profile.upsert({ where: { email }, update: dados, create: { ...dados, email, nome } });
  console.log(`Admin pronto: ${email}`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
