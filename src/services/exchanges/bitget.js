const pLimit = require("p-limit").default;

const { createExchange } = require("../createExchange");
const { safeFetchTickers } = require("@utils/safeFetchTickers");
const { safeFundingRates } = require("@utils/safeFundingRates");
const { formatTime } = require("@utils/utils");

async function fetchFundingRatesIndividuallyWithLimit(
  exchange,
  symbols,
  concurrency = 10
) {
  const limit = pLimit(concurrency);
  const results = {};
  const batchSize = 10; // Process symbols in smaller batches for better fault tolerance
  const symbolBatches = [];
  const maxRetries = 3;
  
  // Create smaller batches of symbols
  for (let i = 0; i < symbols.length; i += batchSize) {
    symbolBatches.push(symbols.slice(i, i + batchSize));
  }

  // Process batches concurrently with limit
  const tasks = symbolBatches.map((batch) =>
    limit(async () => {
      const batchPromises = batch.map(async (symbol) => {
        let retries = 0;
        while (retries < maxRetries) {
          try {
            const rate = await exchange.fetchFundingRate(symbol);
            results[symbol] = rate;
            return;
          } catch (err) {
            retries++;
            if (retries >= maxRetries) {
              console.warn(
                `[${exchange.id}] 获取 ${symbol} fundingRate 失败 (重试 ${retries}/${maxRetries}): ${err.message}`
              );
            } else {
              // Wait exponentially longer between retries
              await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries - 1)));
            }
          }
        }
      });
      
      await Promise.allSettled(batchPromises);
    })
  );

  await Promise.allSettled(tasks);
  return results;
}

class Bitget {
  static exchange = null;
  constructor(markets) {
    this.markets = markets;
  }

  static async fetchMarkets() {
    const exchange = createExchange("bitget");
    Bitget.exchange = exchange;
    const markets = await exchange.loadMarkets(true);
    return new Bitget(markets);
  }

  async fetchFundingRates() {
    const results = {};
    const swapSymbols = Object.values(this.markets)
      .filter(
        (item) => item.type === "swap" && item.symbol.endsWith("/USDT:USDT")
      )
      .map((item) => item.symbol);

    // Try to get bulk funding rates first 
    let allSwapFundingRates = {};
    try {
      allSwapFundingRates = await safeFundingRates(
        Bitget.exchange,
        swapSymbols,
        "swap"
      );
    } catch (err) {
      console.warn(`[bitget] Bulk funding rates failed: ${err.message}, falling back to individual requests`);
    }

    // const symbolsToFetch = swapSymbols.filter(symbol => 
    //   !allSwapFundingRates[symbol] || 
    //   !allSwapFundingRates[symbol].nextFundingTime
    // );

    // let individualFundingRates = {};
    // if (symbolsToFetch.length > 0) {
    //   individualFundingRates = await fetchFundingRatesIndividuallyWithLimit(
    //     Bitget.exchange,
    //     symbolsToFetch,
    //     30
    //   );
    // }

    const swapFundingRates = Object.fromEntries(
      Object.entries(allSwapFundingRates).filter(
        ([_, value]) => value.estimatedSettlePrice !== 0
      )
    );

    for (const [symbol, ticker] of Object.entries(swapFundingRates)) {
      // const nextFundingTimeInfo = individualFundingRates[symbol]?.info?.nextUpdate ||
      //                            ticker.nextFundingTime || 
      //                            0;
      
      results[symbol] = {
        exchange: "bitget",
        symbol: ticker.symbol,
        markPrice: ticker.markPrice,
        fundingRate: ticker.fundingRate,
        fundingRateFormat: (ticker.fundingRate * 100).toFixed(4) + "%",
        // interval: individualFundingRates[symbol]?.info.fundingRateInterval,
        // nextFundingTime: nextFundingTimeInfo,
        // nextFundingTimeFormat: nextFundingTimeInfo ? formatTime(
        //   nextFundingTimeInfo,
        //   "HH:mm:ss"
        // ) : 'N/A',
        interval: '-',
        nextFundingTime: '-',
        nextFundingTimeFormat: '-',
      };
    }
    return results;
  }

  async fetchMarketsSpot() {
    const spotSymbols = Object.values(this.markets)
      .filter((item) => item.type === "spot" && item.symbol.endsWith("/USDT"))
      .map((item) => item.symbol);

    const spotTickers = await safeFetchTickers(
      Bitget.exchange,
      spotSymbols,
      "spot"
    );
    const results = {};
    for (const [symbol, ticker] of Object.entries(spotTickers)) {
      results[symbol] = ticker;
    }

    return results;
  }

  async fetchMarketsSwap() {
    const swapSymbols = Object.values(this.markets)
      .filter(
        (item) => item.type === "swap" && item.symbol.endsWith("/USDT:USDT")
      )
      .map((item) => item.symbol);

    const swapTickers = await safeFetchTickers(
      Bitget.exchange,
      swapSymbols,
      "swap"
    );
    const results = {};
    for (const [symbol, ticker] of Object.entries(swapTickers)) {
      results[symbol] = ticker;
    }

    return results;
  }

  async fetchMarkets() {
    const spot = await this.fetchMarketsSpot();
    const swap = await this.fetchMarketsSwap();
    return {
      spot,
      swap,
    };
  }
}
module.exports = Bitget;
