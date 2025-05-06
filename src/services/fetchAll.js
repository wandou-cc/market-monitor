const { fetchBinancePrices } = require('./exchanges/binance');
const { fetchBybitPrices } = require('./exchanges/bybit')
const { fetchBitgetPrices } = require('./exchanges/bitget')
const { fetchGatePrices } = require('./exchanges/gate')

const exchangeMap = {
  binance: fetchBinancePrices,
  bybit: fetchBybitPrices,
  bitget: fetchBitgetPrices,
  gate: fetchGatePrices
};

async function fetchAllPrices(exchangeId) {
  const fetcher = exchangeMap[exchangeId];

  if (!fetcher) {
    return { exchange: exchangeId, error: 'unsupported exchange' };
  }

  try {
    const result = await fetcher();
    return result;
  } catch (error) {
    return { exchange: exchangeId, error: error.message };
  }

  // const tasks = exchangeList.map(async (exchangeId) => {
    
  // });

  // return Promise.all(tasks);
}

module.exports = { fetchAllPrices };
