const OpenAI = require("openai").default;
const fs = require('fs/promises');
const igdbManager = require('./igdb-manager.js');
const openai = new OpenAI();

const assistant = openai.beta.assistants.retrieve(
  "asst_RLsCfsBD8AKcd5j8ywtZjf1O"
);

async function getGameRecommandation(userGames, popularGames) {
    await assistant;
    const thread = await openai.beta.threads.create();
    


  const tools = [
    {
      type: "function",
      function: {
        name: "get_popular_games",
        description:
          "Return a list of current popular games, with informations about them",
        parameters: {
          all_games: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "integer",
                  description: "Id of the game",
                },
                name: {
                  type: "string",
                  description: "Name of the game",
                },
                genres: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description: "List of game genres",
                },
                rating: {
                  type: "double",
                  description: "Rating on a scale of 100",
                },
                summary: {
                  type: "string",
                  description: "Brief summary of the game",
                },
              },
              required: ["id", "name"],
            },
          },
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
  ];
  assistant.tools = tools;
  assistant.tool_choice = "auto";
  console.log("assistant id : " , await assistant);
  const message = await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: JSON.stringify(userGames),
  });
  let run = await openai.beta.threads.runs.createAndPoll(
    thread.id,
    { 
      assistant_id: "asst_RLsCfsBD8AKcd5j8ywtZjf1O",
      instructions: await fs.readFile("./assistantdirectives", "utf-8"),
      tools: tools
    }
  );
  openai.beta.threads.messages.create(thread.id, {
    role:"user",
    content: JSON.stringify(userGames)
  });
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(
      run.thread_id
    );
    for (const message of messages.data.reverse()) {
      console.log(`${message.role} > ${message.content[0].text.value}`);
    }
  } else {
    console.log(run.status);
  }
  
}


module.exports = {getGameRecommandation};
