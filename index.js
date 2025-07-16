const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const generateController = require('./src/controllers/generateController');

app.post('/generate', generateController); 

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 