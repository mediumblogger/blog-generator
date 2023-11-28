const express = require('express');
// const bard = require('./ai-search/bard')
const { PORT } = require('./config/serverConfig');


const app = express();
app.use(express.json());

// (async () => {
//     const test = new bard();
//    await test.initiate();
//     await test.search('education')
// })()



// express server setup
app.listen(PORT, ()=>{
    console.log(`Application is running on server: http://localhost/${PORT}`);
})