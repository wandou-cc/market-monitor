const { createExchange } = require("../createExchange");
const { safeFetchTickers } = require("@utils/safeFetchTickers");
const { safeFundingRates } = require("@utils/safeFundingRates");
const { formatTime, getNextFundingTimestamp } = require("@utils/utils");

class Gate {
  static exchange = null;
  constructor(markets) {
    this.markets = markets;
  }

  // 初始化市场信息
  static async fetchMarkets() {
    const exchange = createExchange("gate");
    Gate.exchange = exchange;
    const markets = await exchange.loadMarkets(true);
    return new Gate(markets);
  }

  // 获取资金费率的所有信息 
  async fetchCurrentFundingRates() {
    const swapSymbols = Object.values(this.markets)
      .filter(
        (item) => item.type === "swap" && item.symbol.endsWith("/USDT:USDT")
      )
      .map((item) => item.symbol);

    const allSwapFundingRates = await safeFundingRates(
      Gate.exchange,
      swapSymbols,
      "swap"
    );

    return allSwapFundingRates;
  }

  // 获取解析好的资金费信息
  async fetchFundingRates() {
    const results = {};
    const swapSymbols = Object.values(this.markets)
      .filter(
        (item) => item.type === "swap" && item.symbol.endsWith("/USDT:USDT")
      )
      .map((item) => item.symbol);

    const allSwapFundingRates = await safeFundingRates(
      Gate.exchange,
      swapSymbols,
      "swap"
    );

    const swapFundingRates = Object.fromEntries(
      Object.entries(allSwapFundingRates).filter(
        ([_, value]) => value.estimatedSettlePrice !== 0 && value.interval.match(/^(\d+)([hm])$/)
      )
    );

    for (const [symbol, ticker] of Object.entries(swapFundingRates)) {
      const nextFundingTime = getNextFundingTimestamp(ticker.interval).timestamp;
      results[symbol] = {
        exchange: "gate",
        symbol: ticker.symbol,
        markPrice: ticker.markPrice,
        fundingRate: ticker.fundingRate,
        fundingRateFormat: (ticker.fundingRate * 100).toFixed(4) + "%",
        interval: ticker.interval,
        nextFundingTime: nextFundingTime,
        nextFundingTimeFormat: formatTime(nextFundingTime, "HH:mm:ss"),
      };
    }
    return results;
  }

  async fetchMarketsSpot() {
    const spotSymbols = Object.values(this.markets)
      .filter((item) => item.type === "spot" && item.symbol.endsWith("/USDT"))
      .map((item) => item.symbol);

    const spotTickers = await safeFetchTickers(
      Gate.exchange,
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
      Gate.exchange,
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
module.exports = Gate;
