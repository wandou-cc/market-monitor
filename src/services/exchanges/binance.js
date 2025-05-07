const { createExchange } = require("../createExchange");
const { safeFetchTickers } = require("@utils/safeFetchTickers");
const { safeFundingRates } = require("@utils/safeFundingRates");
const { formatTime } = require("@utils/utils");

class Binance {
  static exchange = null;
  constructor(markets) {
    this.markets = markets;
  }

  static async fetchMarkets() {
    const exchange = createExchange("binance");
    Binance.exchange = exchange;
    const markets = await exchange.loadMarkets(true);
    return new Binance(markets);
  }

  async fetchFundingRates() {
    const results = {};
    const swapSymbols = Object.values(this.markets)
      .filter(
        (item) => item.type === "swap" && item.symbol.endsWith("/USDT:USDT")
      )
      .map((item) => item.symbol);

    const allSwapFundingRates = await safeFundingRates(
      Binance.exchange,
      swapSymbols,
      "swap"
    );

    const swapFundingRates = Object.fromEntries(
      Object.entries(allSwapFundingRates).filter(
        ([_, value]) => value.estimatedSettlePrice !== 0
      )
    );

    for (const [symbol, ticker] of Object.entries(swapFundingRates)) {
      results[symbol] = {
        exchange: "binance",
        symbol: ticker.symbol,
        markPrice: ticker.markPrice,
        fundingRate: ticker.fundingRate,
        fundingRateFormat: (ticker.fundingRate * 100).toFixed(4) + "%",
        nextFundingTime: ticker?.info?.nextFundingTime,
        nextFundingTimeFormat: formatTime(
          ticker?.info?.nextFundingTime,
          "HH:mm:ss"
        )
      };
    }
    return results;
  }

  async fetchMarketsSpot() {
    const spotSymbols = Object.values(this.markets)
      .filter((item) => item.type === "spot" && item.symbol.endsWith("/USDT"))
      .map((item) => item.symbol);

    const spotTickers = await safeFetchTickers(
      Binance.exchange,
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
      this.exchange,
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
module.exports = Binance;
