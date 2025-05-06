const { createExchange } = require('../createExchange');
const { safeFetchTickers } = require('@utils/safeFetchTickers')
const { safeFundingRates } = require('@utils/safeFundingRates')
// const { RestClientV2 } = require('bitget-api')
const { formatTime } = require('@utils/utils')
const pLimit = require('p-limit').default;

// const restClient = new RestClientV2({
//   apiKey: process.env.BITGET_API_KEY,
//   apiSecret: process.env.BITGET_SECRET_KEY,
//   apiPass: process.env.BITGET_PASSPHRASE,
// })

async function fetchFundingRatesIndividuallyWithLimit(exchange, symbols, concurrency = 5) {
  const limit = pLimit(concurrency);
  const results = {};

  const tasks = symbols.map(symbol =>
    limit(async () => {
      try {
        const rate = await exchange.fetchFundingRate(symbol);
        results[symbol] = rate;
      } catch (err) {
        console.warn(`[${exchange.id}] 获取 ${symbol} fundingRate 失败: ${err.message}`);
      }
    })
  );

  await Promise.allSettled(tasks);
  return results;
}


async function fetchBitgetPrices() {
  const results = {
    spot: {},
    swap: {},
  };

  try {
    const exchange = createExchange('bitget');
    const markets = await exchange.loadMarkets(true);
    // 现货
    const spotSymbols =  Object.values(markets)
      .filter(item => item.type === "spot" && item.symbol.endsWith('/USDT')).map(item => item.symbol)

      // 合约
    const swapSymbols = Object.values(markets)
      .filter(item => item.type === "swap" && item.symbol.endsWith('/USDT:USDT')).map(item => item.symbol)
    
    const spotTickers = await safeFetchTickers(exchange, spotSymbols, 'spot');
    for (const [symbol, ticker] of Object.entries(spotTickers)) {
      results.spot[symbol] = ticker
    }

    // 合约
    const swapFundingRates = await safeFundingRates(exchange, swapSymbols, 'swap');
    // bitget 获取下个资金费率结算周期需要一个一个获取 非常影响速度 看后续是否有必要改成只获取监听列表中的
    // const fundingRates = await fetchFundingRatesIndividuallyWithLimit(exchange, swapSymbols, 30);
    for (const [symbol, ticker] of Object.entries(swapFundingRates)) {
      results.swap[symbol] = {
        ...ticker,
        fundingRateFormat: (ticker.fundingRate * 100).toFixed(4) + "%",
        // nextFundingTimeFormat: formatTime(fundingRates[symbol]['info']['nextUpdate'],"HH:mm:ss"),
        nextFundingTimeFormat: '-',
        timeFormat: formatTime(ticker?.info?.ts, "HH:mm:ss")
      };
    }
  } catch (err) {
    console.error(`[Bitget] fetchPrices 出错: ${err.message}`);
  }

  return results;
}


module.exports = { fetchBitgetPrices };
