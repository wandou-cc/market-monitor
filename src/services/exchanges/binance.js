const { createExchange } = require('../createExchange');
const { safeFetchTickers } = require('../../../utils/fetchSafe')

async function fetchBinancePrices() {
  const results = {
    spot: {},
    swap: {},
  };

  try {
    const exchange = createExchange('binance');
    // 现货
    const spotMarkets = await exchange.loadMarkets(true);
    const spotSymbols = Object.values(spotMarkets)
      .filter(m => m.spot && m.symbol.endsWith('/USDT'))
      .map(m => m.symbol);

    const spotTickers = await safeFetchTickers(exchange, spotSymbols, 'spot');
    console.log(spotTickers)
    for (const [symbol, ticker] of Object.entries(spotTickers)) {
      results.spot[symbol] = ticker.last;
      results.spot[symbol] = {
        price: ticker.last,
        type: ticker.type
      };
    }

    // 合约
    const swapMarkets = await exchange.loadMarkets(true);
    const swapSymbols = Object.values(swapMarkets)
      .filter(m => (m.future || m.swap) && m.symbol.endsWith('/USDT:USDT'))
      .map(m => m.symbol);

    const swapTickers = await safeFetchTickers(exchange, swapSymbols, 'swap');
    // console.log(swapTickers)
    for (const [symbol, ticker] of Object.entries(swapTickers)) {
      results.swap[symbol.replace(':USDT', '')] = {
        price:  ticker.last,
        type: ticker.type
      };  // 🔥 统一去掉冒号
    }

  } catch (err) {
    console.error(`[Binance] fetchPrices 出错: ${err.message}`);
  }

  return results;
}


module.exports = { fetchBinancePrices };
