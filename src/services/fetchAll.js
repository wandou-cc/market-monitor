const Binance = require('./exchanges/binance');
const Bybit = require('./exchanges/bybit')
const Bitget = require('./exchanges/bitget')
const Gate = require('./exchanges/gate')

let exchangeMap = {};

async function initExchanges() {
  const exchangesJson = require('../../config/exchanges.json').exchanges;
  
  exchangeMap = {};
  
  if (exchangesJson.includes('binance')) {
    exchangeMap.binance = await Binance.fetchMarkets();
  }
  
  if (exchangesJson.includes('bybit')) {
    exchangeMap.bybit = await Bybit.fetchMarkets();
  }
  
  if (exchangesJson.includes('gate')) {
    exchangeMap.gate = await Gate.fetchMarkets();
  }
  
  if (exchangesJson.includes('bitget')) {
    exchangeMap.bitget = await Bitget.fetchMarkets();
  }
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

module.exports = { initExchanges , fetchFundingRates,fetchMarkets };
