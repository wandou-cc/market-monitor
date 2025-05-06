const express = require('express');
const app = express();
require('module-alias/register');
const dotenv = require('dotenv');
dotenv.config();

const markets = require('./api/markets');
app.use('/api', markets);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
