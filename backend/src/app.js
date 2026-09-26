const express = require('express');
const cors = require('cors');
const rotas = require('./routes');
const tratarErro = require('./middlewares/erro');
const { jsonReplacer } = require('./utils/json');

const app = express();
app.set('json replacer', jsonReplacer);
app.use(cors());
app.use(express.json({ limit: '3mb' })); // foto da encomenda vem em base64
app.use('/api', rotas);
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
app.use(tratarErro);

module.exports = app;
