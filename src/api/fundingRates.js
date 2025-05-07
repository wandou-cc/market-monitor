const express = require('express');
const router = express.Router();
const { fetchFundingRates, initExchanges } = require('../services/fetchAll');
const exchangesJson = require('../../config/exchanges.json');

function getFundingArbitrageOpportunities(data) {
	const symbolMap = {};
  
	// Step 1: 聚合各交易所的 fundingRate 和 markPrice
	for (const [exchange, { swap }] of Object.entries(data)) {
	  for (const [symbol, market] of Object.entries(swap)) {
		if (!symbolMap[symbol]) {
		  symbolMap[symbol] = [];
		}
  
		const fundingRate = market.fundingRate ?? 0;
		const markPrice = market.markPrice ?? 0;
		const diffMs = Number(market.diffMs ?? Infinity);
  
		symbolMap[symbol].push({
		  exchange,
		  fundingRate,
		  markPrice,
		  diffMs,
		});
	  }
	}
  
	const results = [];
  
	// Step 2: 处理每个币种的套利机会
	for (const [symbol, markets] of Object.entries(symbolMap)) {
	  if (markets.length < 2) continue;
  
	  const sorted = [...markets].sort((a, b) => b.fundingRate - a.fundingRate);
	  const a = sorted[0];
	  const b = sorted[sorted.length - 1];
  
	  let longExchange, shortExchange;
  
	  // 智能判断做多做空策略
	  if (a.fundingRate < 0 && b.fundingRate >= 0) {
		longExchange = a;
		shortExchange = b;
	  } else if (a.fundingRate >= 0 && b.fundingRate < 0) {
		longExchange = b;
		shortExchange = a;
	  } else if (a.fundingRate < 0 && b.fundingRate < 0) {
		// 两者都为负，绝对值大的做多
		if (Math.abs(a.fundingRate) > Math.abs(b.fundingRate)) {
		  longExchange = a;
		  shortExchange = b;
		} else {
		  longExchange = b;
		  shortExchange = a;
		}
	  } else {
		// 两者都为正，值小的做多
		if (a.fundingRate < b.fundingRate) {
		  longExchange = a;
		  shortExchange = b;
		} else {
		  longExchange = b;
		  shortExchange = a;
		}
	  }
  
	  const netFundingRate = shortExchange.fundingRate - longExchange.fundingRate;
	  const priceDifferenceRate =
		(shortExchange.markPrice - longExchange.markPrice) / longExchange.markPrice;
  
	  results.push({
		symbol,
		longPositionExchange: longExchange.exchange,
		shortPositionExchange: shortExchange.exchange,
  
		longFundingRate: longExchange.fundingRate,
		shortFundingRate: shortExchange.fundingRate,
		netFundingRate,
		priceDifferenceRate,
  
		diffMs: Math.min(longExchange.diffMs, shortExchange.diffMs),
  
		// 可选：格式化展示字段
		longFundingRateFormat: (longExchange.fundingRate * 100).toFixed(4) + '%',
		shortFundingRateFormat: (shortExchange.fundingRate * 100).toFixed(4) + '%',
		netFundingRateFormat: (netFundingRate * 100).toFixed(4) + '%',
		priceDifferenceRateFormat: (priceDifferenceRate * 100).toFixed(4) + '%',
	  });
	}
  
	// Step 3: 排序，先 diffMs 升序，再 netFundingRate 降序
	return results.sort((a, b) => {
	  if (a.diffMs === b.diffMs) {
		return b.netFundingRate - a.netFundingRate;
	  }
	  return a.diffMs - b.diffMs;
	});
}

router.get('/getFundingRates', async (req, res) => {
  const results = {};
  await initExchanges(); // 获取市场数据
  for (const exchangeId of exchangesJson.exchanges) {
    const result = await fetchFundingRates(exchangeId);
    results[exchangeId] = result
  }
  res.json(results);
});

module.exports = router;

