const express = require("express");
const router = express.Router();
const { createExchange } = require("../services/createExchange");
const { fetchFundingRates, initExchanges, fetchCurrentFundingRates } = require("../services/fetchAll");
const { fetchFundingRatesIndividuallyWithLimit } = require("@utils/utils");
const exchangesJson = require("../../config/exchanges.json");


function formatRate(rate) {
  return (rate * 100).toFixed(4) + "%";
}
// 获取套利机会
function findArbitrageOpportunities(data) {
  const symbolMap = {};
  for (const [exchange, symbols] of Object.entries(data)) {
    for (const [symbol, info] of Object.entries(symbols)) {
      const fr = info.fundingRate;
      const mp = info.markPrice;
      if (typeof fr !== "number" || typeof mp !== "number") continue;
      if (!symbolMap[symbol]) symbolMap[symbol] = [];
      symbolMap[symbol].push({
        exchange,
        fundingRate: fr,
        markPrice: mp,
        nextFundingTime: info.nextFundingTime,
      });
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
          shortEx = e1;
          longEx = e2;
        } else if (fr2 >= 0 && fr1 < 0) {
          shortEx = e2;
          longEx = e1;
        } else if (fr1 > 0 && fr2 > 0) {
          if (fr1 > fr2) {
            shortEx = e1;
            longEx = e2;
          } else {
            shortEx = e2;
            longEx = e1;
          }
        } else if (fr1 < 0 && fr2 < 0) {
          if (fr1 > fr2) {
            shortEx = e1;
            longEx = e2;
          } else {
            shortEx = e2;
            longEx = e1;
          }
        } else {
          continue;
        }

        const profitMargin = shortEx.fundingRate - longEx.fundingRate;
        const priceSpread = Math.abs(shortEx.markPrice - longEx.markPrice);
        const avgPrice = (shortEx.markPrice + longEx.markPrice) / 2;
        const priceSpreadRate = priceSpread / avgPrice;

        if (priceSpreadRate < 0.0001) continue;

        const key1 = symbol + "-" + shortEx.exchange;
        const key2 = symbol + "-" + longEx.exchange;
        const pairKey = key1 + "-" + key2;

        const opportunity = {
          symbol,
          shortExchange: shortEx.exchange,
          shortNextFundingTime: shortEx.nextFundingTime,
          shortRate: shortEx.fundingRate,
          shortRateFormat: formatRate(shortEx.fundingRate),
          shortMarkPrice: shortEx.markPrice,

          longExchange: longEx.exchange,
          longRate: longEx.fundingRate,
          longRateFormat: formatRate(longEx.fundingRate),
          longNextFundingTime: longEx.nextFundingTime,
          longMarkPrice: longEx.markPrice,

          profitMargin,
          profitMarginFormat: formatRate(profitMargin),
          priceSpreadRate,
          priceSpreadRateFormat: formatRate(priceSpreadRate),
        };

        if (
          (!maxProfitOpportunity ||
            opportunity.profitMargin > maxProfitOpportunity.profitMargin) &&
          !usedPairs.has(pairKey) &&
          !usedSymbols.has(symbol)
        ) {
          maxProfitOpportunity = opportunity;
        }
      }
    }

    if (maxProfitOpportunity) {
      const key1 =
        maxProfitOpportunity.symbol + "-" + maxProfitOpportunity.shortExchange;
      const key2 =
        maxProfitOpportunity.symbol + "-" + maxProfitOpportunity.longExchange;
      const pairKey = key1 + "-" + key2;

      usedSymbols.add(maxProfitOpportunity.symbol);
      usedPairs.add(pairKey);
      bestOpportunities[maxProfitOpportunity.symbol] = maxProfitOpportunity;
    }
  }

  return Object.values(bestOpportunities)
    .filter((op) => op.priceSpreadRate >= 0.0005)
    .sort((a, b) => b.profitMargin - a.profitMargin)
    .slice(0, 20);
}

router.get("/getAllFundingRates", async (req, res) => {
  const results = {};
  await initExchanges(); // 获取市场数据
  for (const exchangeId of exchangesJson.exchanges) {
    const result = await fetchFundingRates(exchangeId);
    results[exchangeId] = result;
  }
  res.json(results);
});

router.get("/arbitrageFunding", async (req, res) => {
  const results = {};
  await initExchanges(); // 获取市场数据

  for (const exchangeId of exchangesJson.exchanges) {
    const result = await fetchFundingRates(exchangeId);
    results[exchangeId] = result;
  }

    //  进行排序过滤
  const arbitrageExchange = findArbitrageOpportunities(results);
    //   bitget 特殊处理
  const bitgetSymbol = arbitrageExchange.filter((item) => item.shortExchange == "bitget" || item.longExchange == "bitget").map((item) => item.symbol);
  if (bitgetSymbol.length !== 0) {
    const bitgetExchange = createExchange("bitget");
    // 单独获取资金费率
    const bitgetFundingInfo = await fetchFundingRatesIndividuallyWithLimit(
      bitgetExchange,
      bitgetSymbol
    );
    arbitrageExchange.map(item => {
        if(item.shortExchange == "bitget") {
            item.shortNextFundingTime = bitgetFundingInfo[item.symbol]?.info?.nextUpdate
        } else if (item.longExchange == "bitget") {
            item.longNextFundingTime = bitgetFundingInfo[item.symbol]?.info?.nextUpdate
        }
        return item
    })
  }
  res.json(arbitrageExchange);
});

router.get("/getExchangeFunding/:exchangeId", async (req, res) => {
  const exchangeId = req.params.exchangeId;
  await initExchanges(exchangeId); // 获取市场数据
  const result = await fetchCurrentFundingRates(exchangeId);
  res.json(result);
});

module.exports = router;
