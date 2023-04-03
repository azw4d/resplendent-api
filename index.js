const express = require("express");
const moment = require("moment");
const axios = require("axios");
const request = require("request");
const weather = require("weather-js");
const playStore = require("google-play-scraper");
const translate = require("node-google-translate-skidz");
const math = require("mathjs");
const whois = require("whois-json");

const app = express();
const port = 80;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/", async (req, res) => {
  res.send({ Ok: "Ok" });
});

app.get("/proxy", async (req, res) => {
  const originalUrl = req.query.url;

  if (!originalUrl) {
    return res.status(400).send("URL parameter is missing");
  }

  // Check if originalUrl is a valid URL
  try {
    new URL(originalUrl);
  } catch (err) {
    console.error(err);
    return res.status(400).send("Invalid URL");
  }

  try {
    // Fetch the proxied HTML response
    const response = await axios.get(originalUrl, { responseType: "text" });

    // Modify all href and src attributes
    const modifiedHtml = response.data
      .replace(/href="\/\/(.*?)"/g, `href="https://$1"`)
      .replace(/src="\/\/(.*?)"/g, `src="https://$1"`)
      .replace(/href="\/(.*?)"/g, `href="${originalUrl}/$1"`)
      .replace(/src="\/(.*?)"/g, `src="${originalUrl}/$1"`);

    // Send the modified HTML response
    res.send(modifiedHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

app.get("/fake-name", async (req, res) => {
  try {
    const query = req.query;
    const url = "https://api.namefake.com/";

    // Set up the request parameters
    const params = {};
    if (query.full_name) {
      params.name = query.full_name;
    }
    if (query.address) {
      params.address = query.address;
    }
    if (query.email) {
      params.email = query.email;
    }
    if (query.username) {
      params.username = query.username;
    }
    if (query.password) {
      params.password = query.password;
    }
    if (query.gender) {
      params.gender = query.gender;
    }
    if (query.title) {
      params.title = query.title;
    }
    if (query.birth_date) {
      params.birth_date = query.birth_date;
    }
    if (query.phone) {
      params.phone = query.phone;
    }
    if (query.country) {
      params.country = query.country;
    }
    if (query.credit_card_type) {
      params.credit_card_type = query.credit_card_type;
    }
    if (query.credit_card_number) {
      params.credit_card_number = query.credit_card_number;
    }
    if (query.expires) {
      params.expires = query.expires;
    }
    if (query.cv2) {
      params.cv2 = query.cv2;
    }
    if (query.company) {
      params.company = query.company;
    }
    if (query.industry) {
      params.industry = query.industry;
    }
    if (query.catch_phrase) {
      params.catch_phrase = query.catch_phrase;
    }
    if (query.bs) {
      params.bs = query.bs;
    }
    if (query.description) {
      params.description = query.description;
    }

    // Make the request
    const response = await axios.get(url, { params });

    // Send the response
    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

app.get("/weather", async (req, res) => {
  const { query } = req.query;

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
    const [country] = data;
    query = country.capital; // Use the capital city as the new query
  } catch (error) {
    // Query is not a country, continue with the original query
  }

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
});

app.get("/math", (req, res) => {
  const { expression } = req.query;

  if (!expression) {
    res.status(400).send("No expression provided");
    return;
  }

  try {
    // Evaluate the mathematical expression using mathjs
    const result = math.evaluate(expression);

    // Send the result as the response
    res.json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error evaluating expression");
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

app.get("/liveshot", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      throw new Error("Missing required query parameter: url");
    }
    // Validate URL format
    const urlRegex =
      /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i;
    if (!urlRegex.test(url)) {
      throw new Error("Invalid URL format");
    }
    const response = await axios.get(
      `https://urlscan.io/liveshot/?url=${encodeURIComponent(url)}`,
      {
        responseType: "arraybuffer",
      }
    );
    const imageBuffer = Buffer.from(response.data, "binary");
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": imageBuffer.length,
    });
    res.end(imageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
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

app.get("/youtube", async function (req, res) {
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

app.get("/urban", async function (req, res) {
  const search = req.query.word;
  if (!search) {
    res.status(400).send({ error: "Word parameter is missing" });
    return;
  }

  try {
    const response = await fetch(
      `http://api.urbandictionary.com/v0/define?term=${search}`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/urban", async function (req, res) {
  const search = req.query.word;
  if (!search) {
    res.status(400).send({ error: "Word parameter is missing" });
    return;
  }

  try {
    const response = await fetch(
      `http://api.urbandictionary.com/v0/define?term=${search}`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/dictionary", async function (req, res) {
  const search = req.query.word;
  if (!search) {
    res.status(400).send({ error: "Word parameter is missing" });
    return;
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${search}`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/discord/invite/:invite", async function (req, res) {
  const invite = req.params.invite;
  if (!invite) {
    res.status(400).send({ error: "Invite parameter is missing" });
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

app.get("/wikipedia", async function (req, res) {
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

app.get("/whois", async (req, res) => {
  const { domain } = req.query;

  if (!domain) {
    res.status(400).send("No domain provided");
    return;
  }

  try {
    const result = await whois(domain);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error looking up WHOIS information");
  }
});

app.get("/playstore", async (req, res) => {
  const query = req.query.search;

  try {
    const results = await playStore.search({
      term: query,
      num: 10, // limit the number of results to 10
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

app.get("/medicine", async function (req, res) {
  const search = req.query.search;
  if (!search) {
    res.status(400).send({ error: "Search parameter is missing" });
    return;
  }

  try {
    const response = await fetch(
      `https://api.fda.gov/drug/label.json?search=${search}`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/roblox/groups", async function (req, res) {
  const search = req.query.search;
  if (!search) {
    res.status(400).send({ error: "Search parameter is missing" });
    return;
  }

  try {
    const response = await fetch(
      `https://groups.roblox.com/v1/groups/search?keyword=${search}`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/roblox/user", async (req, res) => {
  const { username } = req.query;

  if (!username) {
    res.status(400).send("No keyword provided");
    return;
  }

  try {
    // Search for the user using the Roblox API
    const userSearchResponse = await axios.get(
      `https://users.roblox.com/v1/users/search?keyword=${username}`
    );

    if (userSearchResponse.data.data.length === 0) {
      res.status(404).send(`No Roblox user found with keyword '${username}'`);
      return;
    }

    // Retrieve the first user from the search response
    const user = userSearchResponse.data.data[0];

    // Retrieve the detailed user information using the user ID
    const userResponse = await axios.get(
      `https://users.roblox.com/v1/users/${user.id}`
    );

    // Retrieve the user's avatar from the Roblox API
    const avatarResponse = await axios.get(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png&isCircular=false`
    );

    // Retrieve the games created by the user
    const gamesResponse = await axios.get(
      `https://games.roblox.com/v2/users/${user.id}/games`
    );

    // Retrieve the user's favorite games
    const favoritesResponse = await axios.get(
      `https://games.roblox.com/v2/users/${user.id}/favorite/games`
    );

    // Send the user information and avatar URL, as well as game information, as the response
    res.json({
      id: userResponse.data.id,
      username: userResponse.data.name,
      description: userResponse.data.description,
      created: userResponse.data.created,
      isBanned: userResponse.data.isBanned,
      avatarUrl: avatarResponse.data.data[0].imageUrl,
      games: gamesResponse.data.data,
      favoriteGames: favoritesResponse.data.data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error searching for Roblox user");
  }
});

app.get("/minecraft/user", async (req, res) => {
  const { username } = req.query;

  if (!username) {
    res.status(400).send("No username provided");
    return;
  }

  try {
    const uuidResponse = await axios.get(
      `https://api.mojang.com/users/profiles/minecraft/${username}`
    );
    const uuid = uuidResponse.data.id;

    const profileResponse = await axios.get(
      `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
    );
    const profile = JSON.parse(
      Buffer.from(profileResponse.data.properties[0].value, "base64").toString()
    );

    const skinResponse = await axios.get(
      `https://crafatar.com/renders/body/${uuid}?size=512&default=MHF_Steve&overlay`
    );

    res.json({
      username: profile.name,
      uuid: profile.id,
      skinUrl: skinResponse.request.res.responseUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error searching for Minecraft user");
  }
});

app.get("/minecraft/server", async (req, res) => {
  const { ip } = req.query;

  if (!ip) {
    res.status(400).send("No IP address provided");
    return;
  }

  try {
    const statusResponse = await axios.get(`https://api.mcsrvstat.us/2/${ip}`);

    const { online, players, version, motd } = statusResponse.data;

    let playerList = [];
    if (players && players.list) {
      playerList = players.list;
    }

    res.json({
      online,
      playerCount: playerList.length,
      players: playerList,
      version,
      motd,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error searching for Minecraft server");
  }
});

app.get("/currency-convert", async (req, res) => {
  const { from, to, amount } = req.query;

  if (!from || !to || !amount) {
    res.status(400).send("Invalid parameters");
    return;
  }

  try {
    const response = await axios.get(
      `https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/${from}/${to}.json`
    );

    const conversionRate = response.data[to];
    const convertedAmount = amount * conversionRate;

    res.json({
      from,
      to,
      amount: parseFloat(amount),
      convertedAmount: parseFloat(convertedAmount.toFixed(2)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});

app.get("/genshin/:category", async (req, res) => {
  const { category } = req.params;
  const apiUrl = `https://api.genshin.dev/${category}`;

  try {
    const response = await axios.get(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      types: [
        "artifacts",
        "boss",
        "characters",
        "consumables",
        "domains",
        "elements",
        "enemies",
        "materials",
        "nations",
        "weapons",
      ],
    });
  }
});

app.get("/trivia", async (req, res) => {
  try {
    const response = await axios.get("https://opentdb.com/api.php", {
      params: {
        ...req.query,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error getting trivia data");
  }
});

app.get("/pokemon*", async (req, res) => {
  try {
    const original = req.originalUrl;
    const defined = original.replace("/pokemon", "");
    const url = `https://pokeapi.co/api/v2/${defined}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(error.response.status || 500).send(error.message);
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

process.on("uncaughtException", function (err) {
  console.log("NOT STOPPING: " + err);
});
