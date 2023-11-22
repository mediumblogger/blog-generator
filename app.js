const express = require('express');

const { PORT } = require('./configs/serverConfig');


const app = express();
app.use(express.json());


// express server setup
app.listen(PORT, ()=>{
    console.log(`Application is running on server: http://localhost/${PORT}`);
})