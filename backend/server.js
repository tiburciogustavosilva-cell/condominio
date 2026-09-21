const fs = require('fs');
const path = require('path');

// Cria o .env automaticamente na primeira execução, a partir do .env.example.
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('Arquivo .env criado a partir de .env.example');
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const perfilRoutes = require('./routes/perfil');
const moradoresRoutes = require('./routes/moradores');
const unidadesRoutes = require('./routes/unidades');
const chamadosRoutes = require('./routes/chamados');
const avisosRoutes = require('./routes/avisos');
const reservasRoutes = require('./routes/reservas');
const encomendasRoutes = require('./routes/encomendas');
const prestadoresRoutes = require('./routes/prestadores');
const dashboardRoutes = require('./routes/dashboard');
const { iniciarAgendador } = require('./lib/lembretes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/moradores', moradoresRoutes);
app.use('/api/unidades', unidadesRoutes);
app.use('/api/chamados', chamadosRoutes);
app.use('/api/avisos', avisosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/encomendas', encomendasRoutes);
app.use('/api/prestadores', prestadoresRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.json({ ok: true, mensagem: 'API do sistema de condomínio no ar' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hora: new Date().toISOString() });
});

// Handler de erro genérico para não derrubar o servidor.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  iniciarAgendador();
});
