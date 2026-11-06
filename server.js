// Execução local (npm start). Na Vercel o ponto de entrada é api/index.js.
require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'COTOU API iniciada');
});
