const express = require('express');
const router = express.Router();
const { fetchAllPrices } = require('../services/fetchAll');
const config = require('../../config/exchanges.json');

router.get('/markets', async (req, res) => {
  const results = {};
  for (const exchangeId of config.exchanges) {
    const result = await fetchAllPrices(exchangeId);
    results[exchangeId] = result
  }
  res.json(results);
});

router.get('/markets/:exchangeId', async (req, res) => {
  const exchangeId = req.params.exchangeId;
  const result = await fetchAllPrices(exchangeId);
  res.json(result);
});

module.exports = router;
