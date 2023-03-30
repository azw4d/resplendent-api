const express = require("express");
const moment = require("moment");
const axios = require("axios");
const request = require("request");
const weather = require("weather-js");
const playStore = require("google-play-scraper");
const translate = require("node-google-translate-skidz");
const math = require("mathjs");
import("isomorphic-fetch");

const app = express();
const port = 80;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/weather", async (req, res) => {
  var { query } = req.query;

  if (!query) {
    return res
      .status(400)
      .json({ error: "Please provide a city or a country." });
  }

  // Check if the query is a country
  try {
    const { data } = await axios.get(
      `https://restcountries.com/v2/name/${query}`
    );
    query = data[0].capital; // Use the capital city as the new query
    weather.find({ search: query, degreeType: "C" }, (error, result) => {
      if (error) {
        return res
          .status(500)
          .json({ error: "Something went wrong. Please try again later." });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: `Location not found: ${query}` });
      }

      const { current, location } = result[0];

      const resultObj = {
        location: {
          city: location.name,
          country: location.country,
          latitude: location.lat,
          longitude: location.long,
        },
        weather: {
          temperature: Math.round(current.temperature),
          feels_like: Math.round(current.feelslike),
          pressure: current.pressure,
          humidity: current.humidity,
          visibility: current.visibility,
          wind_speed: current.winddisplay.split(" ")[0],
          wind_direction: current.winddisplay.split(" ")[1],
          description: current.skytext,
          icon: current.imageUrl,
        },
      };

      res.json(resultObj);
    });
  } catch (error) {
    console.log('');
    weather.find({ search: query, degreeType: "C" }, (error, result) => {
      if (error) {
        console.log('');
        return res
          .status(500)
          .json({ error: "Something went wrong. Please try again later." });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: `Location not found: ${query}` });
      }

      const { current, location } = result[0];

      const resultObj = {
        location: {
          city: location.name,
          country: location.country,
          latitude: location.lat,
          longitude: location.long,
        },
        weather: {
          temperature: Math.round(current.temperature),
          feels_like: Math.round(current.feelslike),
          pressure: current.pressure,
          humidity: current.humidity,
          visibility: current.visibility,
          wind_speed: current.winddisplay.split(" ")[0],
          wind_direction: current.winddisplay.split(" ")[1],
          description: current.skytext,
          icon: current.imageUrl,
        },
      };

      res.json(resultObj);
    });
  }
});

app.get("/translate/:fromLang/:toLang/:text", async (req, res) => {
  const { fromLang, toLang, text } = req.params;

  try {
    const translation = await translate({
      text,
      source: fromLang,
      target: toLang,
    });
    res.status(200).send(translation);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while translating the text");
  }
});

app.get("/snapcode", (req, res) => {
  const username = req.query.username;
  const snapcodeUrl = `https://app.snapchat.com/web/deeplink/snapcode?username=${username}&type=PNG&size=1024`;

  request.get(
    {
      url: snapcodeUrl,
      encoding: null,
    },
    (error, response, body) => {
      if (error || response.statusCode !== 200) {
        res.status(500).send("Failed to generate Snapcode");
        return;
      }

      res.set("Content-Type", "image/png");
      res.send(body);
    }
  );
});

app.get("/time-difference", (req, res) => {
  let { startDate, endDate } = req.query;

  // Validate date format and convert to ISO 8601 if needed
  const dateFormat = [
    moment.ISO_8601,
    "YYYY-DD-MM HH:mm:ss",
    "YYYY/DD/MM HH:mm:ss",
    "YYYY.DD.MM HH:mm:ss",
    "DD-MM-YYYY HH:mm:ss",
    "DD/MM/YYYY HH:mm:ss",
    "DD.MM.YYYY HH:mm:ss",
    "YYYY-DD-MM",
    "YYYY/DD/MM",
    "YYYY.DD.MM",
    "DD-MM-YYYY",
    "DD/MM/YYYY",
    "DD.MM.YYYY",
    "MMM DD, YYYY HH:mm:ss",
    "MMM DD, YYYY",
    "MMM D, YYYY HH:mm:ss",
    "MMM D, YYYY",
    "MM/DD/YYYY HH:mm:ss",
    "MM/DD/YYYY",
    "M/D/YYYY HH:mm:ss",
    "M/D/YYYY",
    "HH:mm:ss",
  ];

  if (!moment(startDate, dateFormat, true).isValid()) {
    const parsedStartDate = moment.parseZone(startDate);
    if (!parsedStartDate.isValid()) {
      return res.status(400).json({
        error: `Invalid start date format. Please use one of the following formats: ${dateFormat.join(
          ", "
        )}`,
      });
    }
    startDate = parsedStartDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
  }

  if (!moment(endDate, dateFormat, true).isValid()) {
    const parsedEndDate = moment.parseZone(endDate);
    if (!parsedEndDate.isValid()) {
      return res.status(400).json({
        error: `Invalid end date format. Please use one of the following formats: ${dateFormat.join(
          ", "
        )}`,
      });
    }
    endDate = parsedEndDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
  }

  var start = moment(startDate);
  var end = moment(endDate);

  const diff = moment.duration(end.diff(start));

  let years = diff.years();
  let months = diff.months();
  let days = diff.days();
  let hours = diff.hours();
  let minutes = diff.minutes();
  let seconds = diff.seconds();

  // Swap start and end dates if start date is later than end date
  if (start.isAfter(end)) {
    var temp = start;
    start = end;
    end = temp;

    years = -years;
    months = -months;
    days = -days + 1;
    hours = -hours;
    minutes = -minutes;
    seconds = -seconds;
  }

  const result = {};

  if (years > 0) {
    result.years = years;
  }

  if (months > 0) {
    result.months = months;
  }

  if (days > 0) {
    result.days = days;
  }

  if (hours > 0) {
    result.hours = hours;
  }

  if (minutes > 0) {
    result.minutes = minutes;
  }

  if (seconds > 0) {
    result.seconds = seconds;
  }

  res.json(result);
});

app.get("/youtube", async function(req, res) {
  const search = req.query.search;
  if (!search) {
    res.status(400).send({ error: "Search parameter is missing" });
    return;
  }

  try {
    const response = await fetch(
      `https://ytscrape.maceratime.com/api/search?q=${search}&page=1`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/discord-invite", async function(req, res) {
  const invite = req.query.invite;
  if (!invite) {
    res.status(400).send({ error: "invite parameter is missing" });
    return;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v6/invite/${invite}?with_counts=true`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/discord/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const response = await fetch(`https://discord.com/api/v9/users/${userId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, // Replace with your Discord Bot token
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Discord user profile: ${response.status} ${response.statusText}`
      );
    }

    const userData = await response.json();
    res.status(200).send(userData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch Discord user profile");
  }
});

app.get("/wikipedia", async function(req, res) {
  const search = req.query.search;
  if (!search) {
    res.status(400).send({ error: "Search parameter is missing" });
    return;
  }

  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${search}`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/quran*", async (req, res) => {
  try {
    const { url, method } = req;
    const apiUrl = "https://api.quran.com/api/v4" + url.replace("/quran", "");
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    const query = req.query;
    if (method === "POST") {
      options.body = JSON.stringify(req.body);
    }
    const apiResponse = await fetch(
      apiUrl + "?" + new URLSearchParams(query),
      options
    );
    const json = await apiResponse.json();
    res.json(json);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/ip", async (req, res) => {
  const ip = req.query.ip || req.ip;
  const apiEndpoint = `http://ip-api.com/json/${ip}`;

  try {
    const { data } = await axios.get(apiEndpoint);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

app.get("/playstore", async (req, res) => {
  const query = req.query.search;

  try {
    const results = await playStore.search({
      term: query, // limit the number of results to 10
    });

    res.json(results);
  } catch (error) {
    res.status(500).send("Failed to search Google Play Store");
  }
});

app.get("/github/user", async (req, res) => {
  try {
    const { username } = req.query;
    const response = await axios.get(
      `https://api.github.com/users/${username}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(404).json({ message: "User not found" });
  }
});

app.get("/github/repositories", async (req, res) => {
  try {
    const { query } = req.query;
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${query}`
    );
    res.json(response.data.items);
  } catch (error) {
    res.status(404).json({ message: "No repositories found" });
  }
});

app.get("/github/code", async (req, res) => {
  try {
    const { query } = req.query;
    const response = await axios.get(
      `https://api.github.com/search/code?q=${query}`
    );
    res.json(response.data.items);
  } catch (error) {
    res.status(404).json({ message: "No code found" });
  }
});

app.get("/github/users", async (req, res) => {
  try {
    const { query } = req.query;
    const response = await axios.get(
      `https://api.github.com/search/users?q=${query}`
    );
    res.json(response.data.items);
  } catch (error) {
    res.status(404).json({ message: "No users found" });
  }
});

const localtunnel = require("localtunnel");

(async () => {
  const tunnel = await localtunnel({ port: 80, subdomain: "apiresplendent" });
  const url = tunnel.url;
  console.log(url);
})();

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

process.on("uncaughtException", function(err) {
  console.log("NOT STOPPING: " + err);
});
