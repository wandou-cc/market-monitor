const { createExchange } = require("../createExchange");
const { safeFetchTickers } = require("@utils/safeFetchTickers");
const { safeFundingRates } = require("@utils/safeFundingRates");
const { formatTime } = require("@utils/utils");

async function fetchBybitPrices() {
  const results = {
    spot: {},
    swap: {},
  };

  try {
    const exchange = createExchange("bybit");
    const markets = await exchange.loadMarkets(true);
    // 现货
    const spotSymbols = Object.values(markets)
      .filter((item) => item.type === "spot" && item.symbol.endsWith("/USDT"))
      .map((item) => item.symbol);

    // 合约
    const swapSymbols = Object.values(markets)
      .filter(
        (item) => item.type === "swap" && item.symbol.endsWith("/USDT:USDT")
      )
      .map((item) => item.symbol);

    const spotTickers = await safeFetchTickers(exchange, spotSymbols, 'spot');
    for (const [symbol, ticker] of Object.entries(spotTickers)) {
      results.spot[symbol] = ticker
    }

    // 合约
    // const swapTickers = await safeFetchTickers(exchange, swapSymbols, 'swap');
    const swapFundingRates = await safeFundingRates(
      exchange,
      swapSymbols,
      "swap"
    );
    for (const [symbol, ticker] of Object.entries(swapFundingRates)) {
      results.swap[symbol] = {
        ...ticker,
        fundingRateFormat: (ticker.fundingRate * 100).toFixed(4) + "%",
        nextFundingTimeFormat: formatTime(
          ticker?.info?.nextFundingTime,
          "HH:mm:ss"
        ),
        timeFormat: formatTime(ticker?.timestamp, "HH:mm:ss")
      };
    }
  } catch (err) {
    console.error(`[Bybit] fetchPrices 出错: ${err.message}`);
  }

  return results;
}

module.exports = { fetchBybitPrices };
