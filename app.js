const express = require('express');
require('dotenv').config();
const axios = require('axios');

const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
const app = express();
app.use(express.json());

var twitchAccess;



async function getTwitchAccessToken() {
    const endpoint = "https://id.twitch.tv/oauth2/token";
  
    try {
      const response = await axios.post(endpoint, null, {
        params: {
          client_id: clientId,
          client_secret: accessToken,
          grant_type: 'client_credentials'
        }
      });
  
      console.log(response.data.access_token); // Ici tu auras ton access token
      return response.data.access_token; // Tu peux retourner le token pour l'utiliser plus tard
    } catch (error) {
      console.error('Error fetching access token:', error.message);
    }
  }
  async function searchGamesByName(gameName) {
    const endpoint = 'https://api.igdb.com/v4/games';
    const accessToken = await getTwitchAccessToken();
  
    if (!accessToken) {
      console.error('Failed to retrieve access token');
      return;
    }
  
    const data = `fields name, cover.url, platforms.name, genres.name; search "${gameName}"; limit 10;`;
  
    try {
      const response = await axios({
        url: endpoint,
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${await twitchAccess}`,
          'Accept': 'application/json',
          'Content-Type': 'text/plain'
        },
        data
      });
  
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error searching games by name:', error.message);
    }
  }

  app.get('/search-by-name', async (req, res) => {
    const query = req.query.query;
    console.log("query : ", req.query.query);
    res.send(JSON.stringify(await searchGamesByName(query)));
});

app.get('/get-details', async (req, res) => {
    res.send(await getGameDetailsById(req.query.id));
});

function getGameDetailsById(gameId){
    const endpoint = "https://api.igdb.com/v4/games/"+gameId;
    return axios.get(endpoint)
    .then(response => {
      // Process the successful response
      const gameData = response.data;
      console.log(gameData);
    })
}
  // Appelle la fonction pour obtenir le token
  twitchAccess = getTwitchAccessToken();
  console.log(twitchAccess);
const apiCall = async () => {
    const endpoint = 'https://api.igdb.com/v4/games';
    const data = `fields name, genres.name, platforms.name; where platforms = (48,49); limit 10;`;
  
    try {
      const response = await axios({
        url: endpoint,
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${await twitchAccess}`,
          'Accept': 'application/json',
          'Content-Type': 'text/plain',
        },
        data: data
      });
  
      console.log(response.data(0));
    } catch (error) {
      console.error('Error making API call:', error.message);
    }
  };
  
  apiCall();



const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});