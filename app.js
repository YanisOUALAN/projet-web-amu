const express = require('express');
require('dotenv').config();
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcrypt');
const userManager = require('./model/user-manager.js');
const saltRounds = 10; // Nombre de cycles de hachage
const sqlite3 = require('sqlite3').verbose();
global.blacklistedUserUpdates = [];
const clientId = process.env.CLIENT_ID;
const accessToken = process.env.ACCESS_TOKEN;
const igdbManager = require('./model/igdb-manager.js');
const openaiManager = require('./model/openai-manager.js');
const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
      console.error("Erreur lors de l'ouverture de la base de données", err);
  } else {
      console.log('Base de données connectée avec succès');
      db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
      )`, (err) => {
          if (err) {
              console.error("Erreur lors de la création de la table", err);
          } else {
              console.log("Table créée avec succès");
          }
      });
      db.run(`CREATE TABLE IF NOT EXISTS user_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        gameId TEXT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )`, (err) => {
        if (err) {
            console.error("Erreur lors de la création de la table user_games", err);
        } else {
            console.log("Table user_games créée avec succès");
        }
    });
  }
});


app.use(session({
  secret: 'super_secret_key', // Clé secrète pour signer le cookie de session
  resave: false, // Évite de sauvegarder la session si elle n'a pas été modifiée
  saveUninitialized: false, // Ne crée pas de session tant que quelque chose n'est pas stocké
  cookie: { secure: false } // Options pour les cookies, `secure: true` est recommandé en production
}));

var twitchAccess;

app.post('/search-by-name', async (req, res) => {
    const query = req.body.query;

    console.log("query : ", req.query.query);
    const result = await igdbManager.searchGamesByName(query);
    for (let i = 0; i < result.length; i++) {
      if (result[i].cover && result[i].cover.url) {
        result[i].cover.url = result[i].cover.url.replaceAll("t_thumb", "t_cover_big_2x");
      }else{
        result[i].cover = {url : "undefined"};
        
      }
  }
    result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    console.log("search result : " , result);
    res.render('search-result', {username:req.session.username, isLoggedIn:req.session.isLoggedIn, hits: result, query: query});
});

  app.get('/', async (req, res) => {
    if(!req.session.isLoggedIn){
    let fygames = await igdbManager.fetchPopularGames(25);
    for (let i = 0; i < fygames.length; i++) {
      if (fygames[i].cover && fygames[i].cover.url) {
          fygames[i].cover.url = fygames[i].cover.url.replaceAll("t_thumb", "t_cover_big_2x");
      }
  }
    fygames.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    res.render('index', {username: req.session.username ?? "stranger", 
    isLoggedIn:req.session.isLoggedIn ?? false,
    popular: fygames,
  fygames:fygames});
}else{
  
  let popular = await igdbManager.fetchPopularGames(50);
  const userid = await userManager.getUserIdFromName(req.session.username, db);
  console.log("user id : " , userid );
  let favorites = await userManager.getUserPlaylist(userid, db);
  favorites = favorites.slice(-5);
  
  let result = await userManager.getRecommendationForUser(userid, db);
  
  if(result.recommendations){
    result = result.recommendations;
  }
  console.log("gpt response : ", JSON.stringify(result));
  for (let i = 0; i < result.length; i++) {
    if (result[i].cover && result[i].cover.url) {
      result[i].cover.url = result[i].cover.url.replaceAll("t_thumb", "t_cover_big_2x");
    }
}
  for (let i = 0; i < popular.length; i++) {
    if (popular[i].cover && popular[i].cover.url) {
      popular[i].cover.url = popular[i].cover.url.replaceAll("t_thumb", "t_cover_big_2x");
    }
}
  //result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  console.log("result : ", result);
  res.render('index', {username: req.session.username ?? "stranger", 
  isLoggedIn:req.session.isLoggedIn ?? false,
  fygames: result,
  popular:popular});
  
  
}
});
  app.get('/login', async (req, res) => {
    res.render('login', {username:req.session.username, isLoggedIn:req.session.isLoggedIn});
});
  app.get('/search-by-name', async (req, res) => {
    res.render('search', {username:req.session.username, isLoggedIn:req.session.isLoggedIn});
});
  app.get('/register', async (req, res) => {
    res.render('register', {username:req.session.username, isLoggedIn:req.session.isLoggedIn});
});
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          // Gérer l'erreur de destruction de session
          return console.error(err);
      }
      // Rediriger l'utilisateur vers la page de connexion ou la page d'accueil
      res.redirect('/');
  });
});

app.post('/add-game-to-playlist/:gameId', async (req, res) => {
  if (!req.session.isLoggedIn) {
      return res.status(401).send('Vous devez être connecté pour effectuer cette action.');
  }
    const gameId = req.params.gameId;
    const username = req.session.username;
    const userId = await userManager.getUserIdFromName(username, db);
    console.log("user id ", userId);
        if(userManager.addGameToUserPlaylist(userId, gameId, db)){
          console.log("added game to playlist");
          return res.send(200);

        }else{
          return res.send(500);
        }
    
});
app.post('/remove-game-from-playlist/:gameId', async (req, res) => {
  if (!req.session.isLoggedIn) {
      return res.status(401).send('Vous devez être connecté pour effectuer cette action.');
  }
    const gameId = req.params.gameId;
    const username = req.session.username;
    const userId = await userManager.getUserIdFromName(username, db);
    console.log("user id ", userId);
        if(userManager.removeGameFromUserPlaylist(userId, gameId, db)){
          console.log("removed game to playlist");
          return res.send(200);

        }else{
          return res.send(500);
        }
    
});

app.get('/playlist', async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.status(401).send('Vous devez être connecté pour effectuer cette action.');
}
  const username = await userManager.getUserIdFromName(req.session.username, db);
  let playlist = await userManager.getUserPlaylist(username, db);
  
  for (let i = 0; i < playlist.length; i++) {
    if (playlist[i].cover && playlist[i].cover.url) {
      playlist[i].cover.url = playlist[i].cover.url.replaceAll("t_thumb", "t_cover_big_2x");
    }
}
  console.log("playlist : ", JSON.stringify(playlist));
  console.log("playlist0 : ", JSON.stringify(playlist[0]));
  res.render('playlist', {username: req.session.username ?? "stranger", 
  isLoggedIn:req.session.isLoggedIn ?? false,
  playlist: playlist});
});



app.get('/game-info/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const gameDetails = await igdbManager.getGameDetailsById(gameId);
    let game = gameDetails[0];
    if (game.cover && game.cover.url) {
      game.cover.url = game.cover.url.replaceAll("t_thumb", "t_cover_big_2x");
    }

    const userId = await userManager.getUserIdFromName(req.session.username, db);
    const isInPlaylist = await userManager.isGameInPlaylist(userId, game.id, db);

    console.log("Game cover:", game);
    console.log("Is in playlist:", isInPlaylist);
    console.log("User ID:", userId);

    res.render('game-info', {
      username: req.session.username,
      isLoggedIn: req.session.isLoggedIn,
      isInPlaylist: req.session.isLoggedIn ? isInPlaylist : false,
      game: game
    });
  } catch (error) {
    console.error("Error retrieving game info:", error);
    res.status(500).send("Error loading game info");
  }
});






app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  console.log("user : ", username);
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
          console.error('Erreur lors de la recherche de l\'utilisateur', err);
          return res.status(500).send('Erreur interne du serveur');
      }
      // Vérifie si l'utilisateur existe et si le mot de passe correspond
      const match = user && await bcrypt.compare(password, user.password);
      if (match) {
          req.session.username = user.username;
          req.session.isLoggedIn = true;
          res.redirect('/');
      } else {
          // Utiliser un message d'erreur générique pour toutes les erreurs de connexion
          res.redirect('/login?error=login_failed');
      }
  });
});


app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], function(err) {
          if (err) {
              console.error(err.message);
              res.status(500).send("Échec de l'enregistrement de l'utilisateur");
          } else {
              console.log(`Un nouvel utilisateur a été ajouté avec l'ID ${this.lastID}`);
              res.send("Utilisateur enregistré avec succès");
          }
      });
  } catch (error) {
      console.error('Erreur lors du hachage du mot de passe', error);
      res.status(500).send("Erreur interne du serveur");
  }
});

app.get('/get-details', async (req, res) => {
    res.send(await igdbManager.getGameDetailsById(req.query.id));
});


app.get('/get-recommendation', async (req, res) => {
    res.send(await openaiManager.getGameRecommandation(await igdbManager.getGameDetailsById(116), await igdbManager.fetchPopularGames(), req.query.count));
});

// Utilisation de la fonction
igdbManager.fetchPopularGames().then(games => {
  if (games) {
      console.log(games)
  }
});
  // Appelle la fonction pour obtenir le token
  twitchAccess = igdbManager.getTwitchAccessToken();
  console.log(twitchAccess);
console.log(igdbManager.getGameDetailsById(115));

igdbManager.apiCall();

  

const PORT = 3000;
app.listen(PORT, () => {
  igdbManager.fetchPopularGames().then(g => {
    console.log(JSON.stringify(g));
  });
    console.log(`Server running on port ${PORT}`);
});