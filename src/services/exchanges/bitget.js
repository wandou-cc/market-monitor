
const { createExchange } = require("../createExchange");
const { safeFetchTickers } = require("@utils/safeFetchTickers");
const { safeFundingRates } = require("@utils/safeFundingRates");
const { fetchFundingRatesIndividuallyWithLimit } = require("@utils/utils");

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

  async fetchCurrentFundingRates() {
    const swapSymbols = Object.values(this.markets)
      .filter(
        (item) => item.type === "swap" && item.symbol.endsWith("/USDT:USDT")
      )
      .map((item) => item.symbol);
    return fetchFundingRatesIndividuallyWithLimit(Bitget.exchange, swapSymbols);
  }

  async fetchFundingRates() {
    const results = {};
    const swapSymbols = Object.values(this.markets)
      .filter(
        (item) => item.type === "swap" && item.symbol.endsWith("/USDT:USDT")
      )
      .map((item) => item.symbol);

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
