const logincredentials = {
    google: [
        {
            email: 'bloggermedium.dev@gmail.com',
            password: 'Trio@Bungee'
        }
    ]
};

module.exports.getLoginCreds = getLoginCreds;
function getLoginCreds(domain){
    let items = logincredentials[domain];
    return items[Math.floor(Math.random()*items.length)];
}


exports.logincredentials = logincredentials;