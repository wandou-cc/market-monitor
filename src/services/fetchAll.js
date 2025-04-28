const { fetchBinancePrices } = require('./exchanges/binance');

const exchangeMap = {
  binance: fetchBinancePrices,
};

async function fetchAllPrices(exchangeList) {
  const tasks = exchangeList.map(async (exchangeId) => {
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
  });

  return Promise.all(tasks);
}

module.exports = { fetchAllPrices };
