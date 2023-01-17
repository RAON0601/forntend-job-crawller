const { WebClient } = require("@slack/web-api");
const { slackToken } = require("./secret");
const slackBot = new WebClient(slackToken);

async function sendMessageToSlack(message) {
  try {
    await slackBot.chat.postMessage({
      text: message,
      channel: "일반",
    });
  } catch (e) {
    console.log("slack Message Error");
  }
}

module.exports = { sendMessageToSlack };
