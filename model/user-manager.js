const igdbManager = require('./igdb-manager.js');
const openaiManager = require('./openai-manager.js');
const fs = require('fs').promises;

function addGameToUserPlaylist(userId, gameId, db){
    try {
        //Supprimer l'utilisateur de la blacklist anti-update inutile
        global.blacklistedUserUpdates.forEach((entry, index) => {
            if (entry === userId) {
                global.blacklistedUserUpdates.splice(index, 1);
            }
          });
          console.log("blacklist : ", global.blacklistedUserUpdates);
        // Ajouter le jeu à la liste des favoris
        db.run('INSERT INTO user_games (userId, gameId) VALUES (?, ?)', [userId, gameId]);
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'ajout du jeu aux favoris:', error);
        return false;
    }
}
function removeGameFromUserPlaylist(userId, gameId, db) {
    //Supprimer l'utilisateur de la blacklist anti-update inutile
    global.blacklistedUserUpdates.forEach((entry, index) => {
        if (entry === userId) {
            global.blacklistedUserUpdates.splice(index, 1);
        }
      });
      console.log("blacklist : ", global.blacklistedUserUpdates);
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM user_games WHERE userId = ? AND gameId = ?', [userId, gameId], function(err) {
            if (err) {
                console.error('Erreur lors de la suppression du jeu de la playlist:', err);
                reject(false);
            } else if (this.changes > 0) {
                console.log('Jeu supprimé de la playlist avec succès.');
                resolve(true);
            } else {
                console.log('Aucun jeu trouvé à supprimer.');
                resolve(false);
            }
        });
    });
}


async function isGameInPlaylist(userId, gameId, db) {
    return new Promise((resolve, reject) => {
        db.get("SELECT 1 FROM user_games WHERE userId = ? AND gameId = ?", [userId, gameId], (error, result) => {
            if (error) {
                console.error(error);
                reject(error);
            } else {
                resolve(result !== undefined);
            }
        });
    });
}

async function getUserIdFromName(username, db) {
    return new Promise((resolve, reject) => {
        db.get("SELECT id FROM users WHERE username = ?", [username], (err, row) => {
            if (err) {
                console.error("Erreur lors de la recherche de l'utilisateur :", err);
                reject(err);
            } else if (row) {
                resolve(row.id);
            } else {
                console.log("No user id found for ", username);
                resolve(undefined);
            }
        });
    });
}

async function getUserPlaylist(userId, db) {
    console.log(userId);
    return new Promise((resolve, reject) => {
        db.all("SELECT gameId FROM user_games WHERE userId == ?", [userId], async (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération de la playlist:', err);
                reject(err);
            } else {
                if (rows.length > 0) {
                    console.log('Playlist récupérée avec succès.');
                    const idlist = rows.map(row => parseInt(row.gameId, 10));
                    console.log("idlist : ", idlist)
                    resolve(await igdbManager.resolveGamesFromId(idlist)); // Transforme les résultats en un tableau de gameIds
                } else {
                    console.log('Aucun jeu trouvé dans la playlist.');
                    resolve([]); // Retourne un tableau vide si aucun jeu n'est trouvé
                }
            }
        });
    });
}

async function getRecommendationForUser(userId, db) {
    try{
    const playlist = await getUserPlaylist(userId, db);
    let popular = await igdbManager.fetchPopularGames(20);
    const userfile = "./cache/recommendations/user" + userId + ".json";

    // Cette fonction gère la logique de mise à jour du fichier de recommandations
    async function updateRecommendations() {
        try{
        console.log("updating recos for userid : ", userId);
        if(global.blacklistedUserUpdates.includes(userId)){
            console.log("user ", userId, " isblacklisted");
            try {
                const data = await fs.readFile(userfile);
                return data;
              } catch (err) {
                return igdbManager.fetchPopularGames(10);
              }
              
        }
        try{
        if(!playlist){
            return igdbManager.fetchPopularGames(10);
        }
        global.blacklistedUserUpdates.push(userId);
        const recommendations = await openaiManager.getGameRecommandation(playlist, popular, 10);
        
        for(i = 0; i < recommendations.length; i++){
            recommendations[i] = igdbManager.getGameDetailsById(recommendations[i].id);
        }
        console.log("blacklist : ", global.blacklistedUserUpdates);
        try {
            console.log("sucessfully updated recos for ",userId ," : ", recommendations);
            await fs.writeFile(userfile, JSON.stringify(recommendations));
        } catch (err) {
            console.error('Erreur lors de l\'écriture du fichier:', err);
        }
    }catch(err){
        console.log("error while trying to update recos : ", err);
    }
    }catch(err){
        console.log("error while trying to update recos : ", err);
    }
}

    try {
        await fs.stat(userfile);
        // Mise à jour des recommandations en arrière-plan
        updateRecommendations();
        // Renvoie l'ancien contenu du fichier pendant la mise à jour
        return await JSON.parse(await fs.readFile(userfile, 'utf8'));
    } catch (err) {
        if (err.code === 'ENOENT') { // Le fichier n'existe pas
            // Mise à jour initiale des recommandations et retourne une valeur de fallback
            try{
            updateRecommendations();
            }catch(err){
                console.log(err);
            }
            return igdbManager.fetchPopularGames(10);
        } else {
            console.error('Erreur lors de l\'accès au fichier:', err);
            throw err; // Relance les erreurs autres que 'fichier non trouvé'
        }
    }
}catch(err){
    return igdbManager.fetchPopularGames(10);
}
}


module.exports = {getRecommendationForUser, addGameToUserPlaylist, isGameInPlaylist, getUserPlaylist, removeGameFromUserPlaylist, getUserIdFromName};