const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "..")));

app.get("/api/market-history", async (req, res) => {
  const symbol = req.query.symbol?.trim();

  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol" });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing Alpha Vantage API key" });
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_MONTHLY_ADJUSTED");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "full");
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());
    const json = await response.json();

    const timeSeries = json["Monthly Adjusted Time Series"];

    if (!timeSeries || typeof timeSeries !== "object") {
      return res.status(502).json({
        error: "Upstream data unavailable",
        details: json?.Note || json?.Information || json?.ErrorMessage || null
      });
    }

    const series = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        close: Number(values["5. adjusted close"])
      }))
      .filter((point) => Number.isFinite(point.close))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      symbol,
      source: "Alpha Vantage",
      interval: "monthly_adjusted",
      series
    });
  } catch (error) {
    return res.status(500).json({ error: "Server fetch failed" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FutureCost running on port ${PORT}`);
});