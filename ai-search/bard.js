const utils = require("../stdLib/utils");
const moment = require("moment");
let puppeteerhelper = require('../stdLib/puppeteerhelper');
const logins = require('../stdLib/domain-logins');

class Bard{
    constructor(){
        this.pFlag = false;
        this.domain = 'bard';
        this.login = logins.getLoginCreds('google');
        this.timestamp = moment().format('DD-MM-YYYY_HH-mm-ss');
        this.logger = utils.winstonLogger(`bard-${this.timestamp}`);
    }

    async initiate(){
        try {
            this.browser = await puppeteerhelper.instantiateBrowser(this.pFlag, this.domain, this.logger, false);
            this.page = await this.browser.newPage();
            await this.page.setDefaultNavigationTimeout(90 * 1000);

            await this.page.goto('https://bard.google.com/?hl=en', {
                waitUntil: 'domcontentloaded',
            });
            await utils.sleep(utils.getRandomInt(2, 5) * 1000);

            // clicking on signin page
            await this.page.click('a[aria-label="Sign in"]');
            await utils.sleep(utils.getRandomInt(2, 5) * 1000);

            // Enter email and enter
            await this.page.keyboard.type(this.login.email, {
                delay: 100
            });
            await this.page.keyboard.press('Enter');
            await utils.sleep(utils.getRandomInt(2, 5) * 1000);

            // Enter pwd and enter
            await this.page.keyboard.type(this.login.password, {
                delay: 100
            });
            await this.page.keyboard.press('Enter');
            await utils.sleep(utils.getRandomInt(2, 5) * 1000);

            // bypass popup pages
            // await this.page.evaluate(async ()=>{
            //     function sleep(ms) {
            //         return new Promise(resolve => setTimeout(resolve, ms));
            //     }
            //     if(document.querySelectorAll('[data-is-touch-wrapper="true"] button[jsname="bySMBb"]')){
            //         document.querySelectorAll('[data-is-touch-wrapper="true"] button[jsname="bySMBb"]').click();
            //         await sleep(3 * 1000);
            //     }
            // });

            await this.page.goto('https://bard.google.com/?hl=en', {
                waitUntil: 'networkidle',
            });
            await utils.sleep(utils.getRandomInt(2, 5) * 1000);

            this.bardInitialized = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    async search(keyword){
        if(!this.bardInitialized){
            return '';
        }

        await this.page.focus('rich-textarea');
        await this.page.keyboard.type(keyword, {
            delay: 100
        });
        await this.page.keyboard.press('Enter');
    }
}
module.exports = Bard;
