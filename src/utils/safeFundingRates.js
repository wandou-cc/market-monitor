async function safeFundingRates(exchange, symbols, type) {
  if (!symbols || symbols.length === 0) return {};

  try {
    const raw = {};
    const batchSize = 400;

    const symbolBatches = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
      symbolBatches.push(symbols.slice(i, i + batchSize));
    }

    const results = await Promise.allSettled(
      symbolBatches.map((batch) => exchange.fetchFundingRates(batch))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        Object.assign(raw, result.value);
      } else {
        console.error("Batch failed:", result.reason);
      }
    }

    if (typeof raw !== "object" || raw === null) {
      throw new Error(`[${exchange.id}][${type}] fetchFundingRates 返回异常格式`);
    }

    const filtered = {};

    for (const [symbol, ticker] of Object.entries(raw)) {
      filtered[symbol] = ticker;
    }

    return filtered;
  } catch (err) {
    console.error(
      `[${exchange.id}][${type}] fetchFundingRates 出错: ${err.message}`
    );
    return {};
  }
}

module.exports = { safeFundingRates };
