const OpenAI = require("openai").default;
const fs = require('fs/promises');
const igdbManager = require('./igdb-manager.js');
const openai = new OpenAI();

const assistant = openai.beta.assistants.retrieve(
  "asst_RLsCfsBD8AKcd5j8ywtZjf1O"
);

async function getGameRecommandation(userGames, popularGames, gameCount) {
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
    openai.beta.threads.messages.create(thread.id, {
    role:"user",
    content: JSON.stringify(userGames)
  });
  
  
  let run = await openai.beta.threads.runs.createAndPoll(
    thread.id,
    { 
      assistant_id: "asst_RLsCfsBD8AKcd5j8ywtZjf1O",
      instructions: await fs.readFile("./assistantdirectives" , "utf-8") + " You need to recommend " + gameCount + " games",
      tools: tools
    }
  );


   
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(
      run.thread_id
    );
    for (const message of messages.data.reverse()) {
      console.log(`${message.role} > ${message.content[0].text.value}`);
    }
  }else if(run.status ==='requires_action'){
    let toolsOutput = [];
    if(await run.required_action.submit_tool_outputs.tool_calls[0].function.name === 'get_popular_games'){
        const output = popularGames;
        console.log("output : ", await output)
        toolsOutput.push({
          tool_call_id: await run.required_action.submit_tool_outputs.tool_calls[0].id,
          output: JSON.stringify(await output)
      });
    }
    console.log("adding.. ", toolsOutput)
    await openai.beta.threads.runs.submitToolOutputsAndPoll(
      thread.id,
      run.id,
      { tool_outputs: await toolsOutput }
  );
  

  console.log("tools submited");
  const messages = await openai.beta.threads.messages.list(
    run.thread_id
  );
  for (const message of messages.data.reverse()) {
    console.log(`${message.role} > ${message.content[0].text.value}`);
    if(message.role === "assistant"){
        try{
            result = JSON.parse(message.content[0].text.value);
            console.log("parsed ", result);
            console.log("for toolsOuput : ", JSON.stringify(toolsOutput));
            return result;
        }catch(e){
            console.log("did not parse ", message.content[0].text.value)
        }
    }
  }
  
  } else {
    console.log(run.status);
  }
  console.log(run.status);
}


module.exports = {getGameRecommandation};
