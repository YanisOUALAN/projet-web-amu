const express = require('express');
require('dotenv').config();
const axios = require('axios');

const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
const igdbManager = require('./model/igdb-manager.js')
const openaiManager = require('./model/openai-manager.js')
const app = express();
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

var twitchAccess;

  app.get('/search-by-name', async (req, res) => {
    const query = req.query.query;
    console.log("query : ", req.query.query);
    res.send(JSON.stringify(await igdbManager.searchGamesByName(query)));
});

app.get('/get-details', async (req, res) => {
    res.send(await igdbManager.getGameDetailsById(req.query.id));
});

// Utilisation de la fonction
igdbManager.fetchPopularGames().then(games => {
  if (games) {
      console.log('Jeux populaires:', JSON.stringify(games));
  }
});
  // Appelle la fonction pour obtenir le token
  twitchAccess = igdbManager.getTwitchAccessToken();
  console.log(twitchAccess);

console.log(openaiManager.getGameRecommandation(igdbManager.getGameDetailsById(115), igdbManager.fetchPopularGames()));
  igdbManager.apiCall();

console.log(JSON.stringify(igdbManager.getGameDetailsById(115)))

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});