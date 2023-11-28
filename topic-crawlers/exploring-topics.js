var helper = require("../helpers/topic-crawlers");





// get topics from third party tools
async function getTopics() {
    let topics = helper.getTopics();
    return topics;
}
module.exports = { getTopics }