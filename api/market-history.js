const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "..")));

app.get("/api/market-history", async (req, res) => {
  const symbol = req.query.symbol?.trim();

  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol" });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing Twelve Data API key" });
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1month");
  url.searchParams.set("outputsize", "120");
  url.searchParams.set("format", "JSON");
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());
    const json = await response.json();

    if (!json || !Array.isArray(json.values)) {
      return res.status(502).json({
        error: "Upstream data unavailable",
        details: json?.message || json?.status || null
      });
    }

    const series = json.values
      .map((point) => ({
        date: point.datetime,
        close: Number(point.close)
      }))
      .filter((point) => Number.isFinite(point.close))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      symbol,
      source: "Twelve Data",
      interval: "1month",
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