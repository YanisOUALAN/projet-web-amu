const express = require('express');
require('dotenv').config();
const axios = require('axios');

const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
const igdbManager = require('./model/igdb-manager.js')
const app = express();
app.use(express.json());

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
      console.log('Jeux populaires:', games);
  }
});
  // Appelle la fonction pour obtenir le token
  twitchAccess = igdbManager.getTwitchAccessToken();
  console.log(twitchAccess);

  
  igdbManager.apiCall();



const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});