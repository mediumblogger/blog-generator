const fetch = require('node-fetch');


module.exports = { getTopics }
async function getTopics() {
    let topics = [];
    let pages = 100;
    for (let i = 1; i <= pages; i++) {
        let data = await getDataFromApi(`https://explodingtopics.com/api/trends?page=${i}&size=100`);
        if (data) {
            topics = data.map(topic => {
                return {
                    name: topic.title,
                    description: topic.description,
                    link: topic.url
                }
            })
        }
        if (i == 1) pages = pareInt(data.total / 100);
    }
    return topics;
}

async function getDataFromApi(url, retry = 0) {
    try {
        var options = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            gzip: true,
            body: JSON.stringify(data),
        };
      
        const fetchPromise = fetch(url, options);
        const timeoutPromise = utils.sleep(30000);
      
        // Using Promise.race to set a timeout for the fetch request
        let response = await Promise.race([fetchPromise, timeoutPromise]);
        // response = await response.json();
        // const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (err) {
        if (retry < 3) {
            return getDataFromApi(url, retry + 1);
        } else {
            return err;
        }
    }
}