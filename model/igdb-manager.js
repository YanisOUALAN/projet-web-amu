require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
var twitchAccess = getTwitchAccessToken();
async function fetchPopularGames(gameCount) {
  const filePath = "./cache/recommendations/popular.json";

  try {
      // Vérifie si le fichier existe
      await fs.stat(filePath);
      // Si le fichier existe, lit et retourne son contenu
      const data = await fs.readFile(filePath, { encoding: 'utf8' });
      return JSON.parse(data).slice(0,gameCount);
  } catch (err) {
      // Si le fichier n'existe pas ou une autre erreur survient
      if (err.code === 'ENOENT') {
          console.log("Fichier non trouvé, récupération depuis l'API.");
      } else {
          console.error("Erreur lors de la vérification du fichier:", err);
      }

      try {
          const response = await axios({
              url: 'https://api.igdb.com/v4/games',
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
                  'Client-ID': clientId,
                  'Authorization': `Bearer ${await twitchAccess}`
              },
              data: `fields name, rating, genres.name, summary, cover.url; sort rating desc; where rating_count > 100 & release_dates.date > 1661990400 & release_dates.date < 1693526400; limit ${gameCount ?? 50};`
          });

          // Écrit les données fraîches dans le fichier pour la mise en cache
          await fs.writeFile(filePath, JSON.stringify(response.data));
          return response.data;
      } catch (error) {
          console.error('Erreur lors de la récupération des jeux populaires:', error);
          return null;
      }
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

  async function resolveGamesFromId(gamesId){
    let games = [];
    for(let id of gamesId){
        let gameDetails = await getGameDetailsById(id);
        if (gameDetails.length > 0) { // Supposant que getGameDetailsById retourne un tableau
            games.push(gameDetails[0]); // Ajouter seulement le premier élément du tableau retourné
        }
    }
    return games;
}


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
      data: `fields name, summary, genres.name, cover.url, platforms.name, release_dates.date; where id = ${gameId};`
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
  
    const data = `fields name, cover.url, rating, platforms.name, genres.name; search "${gameName}"; limit 25;`;
  
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
  
      console.log("sr : " , JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('Error searching games by name:', error.message);
    }
  }

module.exports = {searchGamesByName, resolveGamesFromId, getTwitchAccessToken, getGameDetailsById, apiCall, fetchPopularGames};