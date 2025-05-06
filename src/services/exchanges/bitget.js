const { createExchange } = require('../createExchange');
const { safeFetchTickers } = require('@utils/safeFetchTickers')
const { safeFundingRates } = require('@utils/safeFundingRates')
const { RestClientV2 } = require('bitget-api')
const { formatTime } = require('@utils/utils')


const restClient = new RestClientV2({
  apiKey: process.env.BITGET_API_KEY,
  apiSecret: process.env.BITGET_SECRET_KEY,
  apiPass: process.env.BITGET_PASSPHRASE,
})

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
    // const swapTickers = await safeFetchTickers(exchange, swapSymbols, 'swap');
    const swapFundingRates = await safeFundingRates(exchange, swapSymbols, 'swap');
    for (const [symbol, ticker] of Object.entries(swapFundingRates)) {
      results.swap[symbol] = {
        ...ticker,
        fundingRateFormat: (ticker.fundingRate * 100).toFixed(4) + "%",
        nextFundingTimeFormat: await restClient.getFuturesNextFundingTime({
          symbol: symbol.replace(':USDT', '').replace('/', ''),
          type: 'USDT-FUTURES'
        }),
        timeFormat: formatTime(ticker?.info?.ts, "HH:mm:ss")
      };
    }
  } catch (err) {
    console.error(`[Bitget] fetchPrices 出错: ${err.message}`);
  }

  return results;
}


module.exports = { fetchBitgetPrices };
