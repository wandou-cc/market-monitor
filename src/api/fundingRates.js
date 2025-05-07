const express = require('express');
const router = express.Router();
const { fetchFundingRates, initExchanges } = require('../services/fetchAll');
const exchangesJson = require('../../config/exchanges.json');

function formatRate(rate) {
	return (rate * 100).toFixed(4) + '%';
}


function findArbitrageOpportunities(data) {
	const symbolMap = {};
	for (const [exchange, symbols] of Object.entries(data)) {
	  for (const [symbol, info] of Object.entries(symbols)) {
		const fr = info.fundingRate;
		const mp = info.markPrice;
		if (typeof fr !== 'number' || typeof mp !== 'number') continue;
		if (!symbolMap[symbol]) symbolMap[symbol] = [];
		symbolMap[symbol].push({ exchange, fundingRate: fr, markPrice: mp });
	  }
	}
  
	const bestOpportunities = {};
	const usedSymbols = new Set();
	const usedPairs = new Set();
  
	for (const [symbol, items] of Object.entries(symbolMap)) {
	  if (items.length < 2) continue;
  
	  let maxProfitOpportunity = null;
  
	  for (let i = 0; i < items.length; i++) {
		for (let j = i + 1; j < items.length; j++) {
		  const e1 = items[i];
		  const e2 = items[j];
		  const fr1 = e1.fundingRate;
		  const fr2 = e2.fundingRate;
  
		  let shortEx, longEx;
  
		  if (fr1 >= 0 && fr2 < 0) {
			shortEx = e1; longEx = e2;
		  } else if (fr2 >= 0 && fr1 < 0) {
			shortEx = e2; longEx = e1;
		  } else if (fr1 > 0 && fr2 > 0) {
			if (fr1 > fr2) { shortEx = e1; longEx = e2; }
			else           { shortEx = e2; longEx = e1; }
		  } else if (fr1 < 0 && fr2 < 0) {
			if (fr1 > fr2) { shortEx = e1; longEx = e2; }
			else           { shortEx = e2; longEx = e1; }
		  } else {
			continue;
		  }
  
		  const profitMargin = shortEx.fundingRate - longEx.fundingRate;
		  const netFundingRate = shortEx.fundingRate + longEx.fundingRate;
		  const priceSpread = Math.abs(shortEx.markPrice - longEx.markPrice);
		  const avgPrice = (shortEx.markPrice + longEx.markPrice) / 2;
		  const priceSpreadRate = priceSpread / avgPrice;
  
		  if (priceSpreadRate < 0.0001) continue;
  
		  const key1 = symbol + '-' + shortEx.exchange;
		  const key2 = symbol + '-' + longEx.exchange;
		  const pairKey = key1 + '-' + key2;
  
		  const opportunity = {
			symbol,
			shortExchange: shortEx.exchange,
			// shortRate: shortEx.fundingRate,
			shortRateFormat: formatRate(shortEx.fundingRate),
			longExchange: longEx.exchange,
			// longRate: longEx.fundingRate,
			longRateFormat: formatRate(longEx.fundingRate),
			profitMargin,
			profitMarginFormat: formatRate(profitMargin),
			// netFundingRate,
			// netFundingRateFormat: formatRate(netFundingRate),
			priceSpreadRate,
			priceSpreadRateFormat: formatRate(priceSpreadRate)
		  };
  
		  if (
			(!maxProfitOpportunity || opportunity.profitMargin > maxProfitOpportunity.profitMargin) &&
			!usedPairs.has(pairKey) &&
			!usedSymbols.has(symbol)
		  ) {
			maxProfitOpportunity = opportunity;
		  }
		}
	  }
  
	  if (maxProfitOpportunity) {
		const key1 = maxProfitOpportunity.symbol + '-' + maxProfitOpportunity.shortExchange;
		const key2 = maxProfitOpportunity.symbol + '-' + maxProfitOpportunity.longExchange;
		const pairKey = key1 + '-' + key2;
  
		usedSymbols.add(maxProfitOpportunity.symbol);
		usedPairs.add(pairKey);
		bestOpportunities[maxProfitOpportunity.symbol] = maxProfitOpportunity;
	  }
	}
  
	return Object.values(bestOpportunities)
	  .filter(op => op.priceSpreadRate >= 0.0001)
	  .sort((a, b) => b.profitMargin - a.profitMargin)
	  .slice(0, 20);
  }
  
  
  

router.get('/getAllFundingRates', async (req, res) => {
	const results = {};
	await initExchanges(); // 获取市场数据
	for (const exchangeId of exchangesJson.exchanges) {
		const result = await fetchFundingRates(exchangeId);
		results[exchangeId] = result
	}
	console.table(findArbitrageOpportunities(results))
	res.json(findArbitrageOpportunities(results));
});




module.exports = router;

