const puppeteerex = require('puppeteer-extra');
const { firefox } = require('playwright');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteerex.use(StealthPlugin())
const puppeteer = require("puppeteer");
const utils = require('./utils');
// const logincredentials = require('./stdLib/domain-logins').logincredentials;
const { executablePath } = require('puppeteer')
 
module.exports.instantiateBrowser = instantiateBrowser;
async function instantiateBrowser(pFlag = false, domain, logger, forceHeadless, incognito, retrylaunch = 0, returnProxy = false) {
    let retry = 0;
    let proxyDetails, proxy, proxySet = false;
    let browserLogString = '';
    if (pFlag) {
        browserLogString += `instantiateBrowser() Value of pflag - ${pFlag} (Proxy IP). `;
    } else {
        browserLogString += `instantiateBrowser() Value of pflag - ${pFlag} (LocalComputer). `;
    }
    // console.log(`instantiateBrowser() Value of pflag - ${pFlag} - Represents Proxy Flag. True uses a Proxy IP, false uses LocalComputer.`);
    // if (logger) logger.info(`Value of pflag - ${pFlag}`);
    let args = ["--lang=en-US,en", "--no-sandbox", '--disable-setuid-sandbox', '--ignore-certificate-errors',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu']

    if (incognito) {
        // if(logger) logger.info(`Setting incognito: ${incognito}`);
        browserLogString += `Setting incognito: ${incognito}. `;
        args.push("--incognito");
    }

    var options = {
        // executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 
        // devtools: true,
        // slowMo: 25,
        headless: false,//forceHeadless || (process.env.NODE_ENV != 'dev' ? true : false),
        // headless: true,
        // devtools: true,
        // args: proxy ? ["--lang=en-US,en", "--proxy-server=" + proxy] : ["--lang=en-US,en"]
        args,
    };
 
    let firefoxDomain = [];
    if (firefoxDomain.includes((domain || '').toLowerCase())) {
        console.log('launching firefox ', options.headless)
        options.product = 'firefox'
    }

    var browser;
    try {
        // console.log("instantiateBrowser() attempting create browser");
        let playwrightDomains = [
            'bard'
        ];
        let puppeteerExDomains = [

        ];
 
        options['ignoreDefaultArgs'] = ["--enable-automation", '--disable-extensions']; // Akamai block in linux Access Denied
 
        if (puppeteerExDomains.includes((domain || '').toLowerCase())) {
            options.executablePath = executablePath();
            console.log('using puppeteerex with headless ', options.headless)
            browser = await puppeteerex.launch(options);
        } else if (playwrightDomains.includes((domain || '').toLowerCase())) {
            console.log('using playwright with headless ', options.headless)
            let playwrightProxyObj = {};
            
            // options.proxy = playwrightProxyObj;
            options.args = [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-first-run',
                '--no-sandbox',
                '--no-zygote',
                '--disable-web-security',
                '--deterministic-fetch',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials',
                '--single-process',]
 
            browser = await firefox.launch(options);
            browser.useplaywright = true;
        } else {
            browser = await puppeteer.launch(options);
        }
 
    } catch (err) {
        console.log(`-instantiateBrowser Failed, err = ${err}`);
        if (retrylaunch < 4) {
            return await instantiateBrowser(pFlag = false, domain, logger, forceHeadless, incognito, ++retrylaunch);
        } else {
            console.log("Browser Instantiation: Puppeteer Launch Failed");
            return "Browser Instantiation: Puppeteer Launch Failed";
        }
    }
 
    if (incognito) {
        // console.log("returning incog browser");
        browserLogString += `, returning incog browser`;
        if (logger) {
            logger.info(browserLogString);
        } else {
            console.log(browserLogString);
        }
        return await browser.createIncognitoBrowserContext();
    } else {
        // console.log("returning browser");
        browserLogString += `returning browser`;
        if (logger) {
            logger.info(browserLogString);
        } else {
            console.log(browserLogString);
        }
 
        if (returnProxy) {
            return {
                proxyDetails,
                browser
            }
        } else {
            return browser;
        }
    }
}