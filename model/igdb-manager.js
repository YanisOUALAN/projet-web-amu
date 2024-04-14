require('dotenv').config();
const axios = require('axios');

const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
var twitchAccess = getTwitchAccessToken();
async function fetchPopularGames() {
    try {
        const response = await axios({
            url: 'https://api.igdb.com/v4/games',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-ID': clientId,
                'Authorization': `Bearer ${await twitchAccess}`
            },
            // Ici on demande les jeux les mieux notés ou très attendus
            data: 'fields name, rating, genres.name, cover.url; sort rating desc; where rating_count > 100 & release_dates.date > 1661990400 & release_dates.date < 1693526400; limit 100;'
        });
  
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la récupération des jeux populaires:', error);
        return null;
    }
  }

  const apiCall = async () => {
    const endpoint = 'https://api.igdb.com/v4/games';
    const data = `fields name, genres.name, platforms.name; where platforms = (48,49); limit 10;`;
  
    try {
      const response = await axios({
        url: endpoint,
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`,
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


  async function getGameDetailsById(gameId){
    const endpoint = "https://api.igdb.com/v4/games/"+gameId;
    return new Promise(async (resolve, reject) => {
    axios({
      url: "https://api.igdb.com/v4/games",
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          'Client-ID': clientId,
          'Authorization': `Bearer ${await twitchAccess}`
      },
      data: `fields name, summary, genres.name, platforms.name, release_dates.date; where id = ${gameId};`
  })
  .then(response => {
    console.log(response.data);
      resolve(response.data);
  })
  .catch(error => {
      console.error('Erreur lors de la requête:', error);
      reject(undefined);
  });
   });
}

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

module.exports = {searchGamesByName, getTwitchAccessToken, getGameDetailsById, apiCall, fetchPopularGames};