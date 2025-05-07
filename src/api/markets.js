const express = require('express');
const router = express.Router();
const { fetchMarkets, initExchanges } = require('../services/fetchAll');
const exchangesJson = require('../../config/exchanges.json');

router.get('/markets', async (req, res) => {
  const results = {};
  for (const exchangeId of exchangesJson.exchanges) {
    await initExchanges();
    const result = await fetchMarkets(exchangeId);
    results[exchangeId] = result
  }
  res.json(results);
});

router.get('/markets/:exchangeId', async (req, res) => {
  const exchangeId = req.params.exchangeId;
  const result = await fetchMarkets(exchangeId);
  res.json(result);
});

module.exports = router;
