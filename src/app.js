const express = require('express');
const app = express();
require('module-alias/register');
const dotenv = require('dotenv');
dotenv.config();

app.use((req, res, next) => {
  const start = Date.now();

  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);
  });

  next();
});


const markets = require('./api/markets');
const fundingRates = require('./api/fundingRates');
app.use('/api', markets);
app.use('/api', fundingRates);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
