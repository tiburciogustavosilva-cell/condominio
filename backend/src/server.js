require('dotenv').config();
const app = require('./app');
const { iniciarAgendador } = require('./integrations/lembretes');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}/api`);
  iniciarAgendador();
});
