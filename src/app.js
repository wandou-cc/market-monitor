const express = require('express');
const app = express();
const pricesRoute = require('./api/prices');

app.use('/api', pricesRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
