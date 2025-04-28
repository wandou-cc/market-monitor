const express = require('express');
const router = express.Router();
// const { fetchMarketPrices } = require('../services/fetchMarketPrices');
const { fetchBinancePrices } = require('../services/exchanges/binance');

const config = require('../../config/exchanges.json');

router.get('/prices', async (req, res) => {
  const results = [];
  for (const exchangeId of config.exchanges) {
    const result = await fetchBinancePrices(exchangeId);
    results.push(result);
  }
  res.json(results);
});

module.exports = router;
