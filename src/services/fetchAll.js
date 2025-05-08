const Binance = require('./exchanges/binance');
const Bybit = require('./exchanges/bybit')
const Bitget = require('./exchanges/bitget')
const Gate = require('./exchanges/gate')

let exchangeMap = {};

async function initExchanges(exchangeId = null) {
  const exchangesJson = require('../../config/exchanges.json').exchanges;
  
  exchangeMap = {};

  const shouldInit = (id) => {
    return (!exchangeId && exchangesJson.includes(id)) || (exchangeId === id);
  };
  
  if (shouldInit('binance')) {
    exchangeMap.binance = await Binance.fetchMarkets();
  }
  
  if (shouldInit('bybit')) {
    exchangeMap.bybit = await Bybit.fetchMarkets();
  }
  
  if (shouldInit('gate')) {
    exchangeMap.gate = await Gate.fetchMarkets();
  }
  
  if (shouldInit('bitget')) {
    exchangeMap.bitget = await Bitget.fetchMarkets();
  }

  return exchangeMap
}

// 获取市场信息
async function fetchMarkets(exchangeId) {
  const fetcher = exchangeMap[exchangeId];

  if (!fetcher) {
    return { exchange: exchangeId, error: 'unsupported exchange' };
  }
  if (!fetcher) {
    return { exchange: exchangeId, error: 'unsupported exchange' };
  }

  try {
    const result = await fetcher.fetchMarkets();
    return result;
  } catch (error) {
    return { exchange: exchangeId, error: error.message };
  }
}

// 获取资金费率
async function fetchFundingRates(exchangeId) {
  const fetcher = exchangeMap[exchangeId];
  if (!fetcher) {
    return { exchange: exchangeId, error: 'unsupported exchange' };
  }
  try {
    const result = await fetcher.fetchFundingRates();
    return result;
  } catch (error) {
    return { exchange: exchangeId, error: error.message };
  }
}

// 获取某一个交易所的资金费率信息
async function fetchCurrentFundingRates(exchangeId) {
  const fetcher = exchangeMap[exchangeId];
  if (!fetcher) {
    return { exchange: exchangeId, error: 'unsupported exchange' };
  }
  try {
    const result = await fetcher.fetchCurrentFundingRates();
    return result;
  } catch (error) {
    return { exchange: exchangeId, error: error.message };
  }
}

module.exports = { initExchanges , fetchFundingRates,fetchMarkets,fetchCurrentFundingRates };
