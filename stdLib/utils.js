'use strict'
const token = "fffd26992e03a0259c6497f977d042adb80ff58611ed7e5def80a5e00027c4aa";
const fs = require('fs');
const path = require('path');
const moment = require("moment");
const shell = require('shelljs');
const request = require('request');
const rp = require('request-promise');
const Jimp = require("jimp");
const archiver = require('archiver');
// const diacritics = require("./diacritics").specialCharacters;
// var DigitalOcean = require('do-wrapper').default,
  // api = new DigitalOcean(`${token}`, [1]);
// var sendEmailAlert = require('./sendEmailAlert');
// const awsTools = require("./awsResources");
// var isEqual = require('lodash.isequal');
// const s3 = awsTools.s3;
// const ec2 = awsTools.ec2;
const {
  createLogger,
  format,
  transports
} = require('winston');
var winston = require('winston');
// // var { ElasticsearchTransport } = require('winston-elasticsearch');
// const {
//   Client
// } = require('@elastic/elasticsearch');
// const s3Ops = require("./s3Ops");
// // const pricing_lb = 'productpricecrawler-c5-lb-1737216818.us-east-1.elb.amazonaws.com';
// const pricing_lb = '35.244.240.88';
// const fingerprintservice = require('@bungeetech-npm/bungee-fingerprintservice-npm');

// const client = new Client({
//   maxRetries: 5,
//   requestTimeout: 60000,
//   sniffOnStart: true,
//   node: "http://162.211.76.54:9200",
//   auth: {
//     username: 'elastic',
//     password: 'cvURtkw7TwsxhZ27'
//   }
// });
// let new_es_client = new Client({
//   log: 'info',
//   node: "http://crawlerlogs.bungeetech.com:9200",
//   auth: {
//     username: 'elastic',
//     password: '19gmk6Y5oGe5GXvj'
//   }
// });

// let new_es_client_test = new Client({
//   log: 'info',
//   node: "http://162.211.76.50:9200",
//   auth: {
//     username: 'elastic',
//     password: '19gmk6Y5oGe5GXvj'
//   }
// });

const {
  combine,
  timestamp,
  label,
  colorize,
  json,
  printf
} = format;
const mFormat = printf(({
  level,
  message,
  label,
  timestamp
}) => {
  return `${timestamp} - ${level}: ${message}`;
});

let source_arr = ['instacart', 'bevmo', 'raleys', 'sprouts', 'wegmans', 'bjs', 'bristolfarms', 'centralmarket', 'heb', 'jewelosco', 'meijer', 'roche', 'safeway', 'vons',
  'harristeeter', 'loblaws', 'shipt', 'hannaford', 'shoprite', 'giantEagle', 'target', 'trgetios', 'tesco', 'totalwine', 'vitaminshoppe', 'walmart', 'walgreens', 'cvs', 'foodland'
];

function deleteFilesInDirectory(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      const curPath = path.join(directory, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        continue;
      }

      fs.unlink(path.join(directory, file), err => {
        if (err) throw err;
      });
    }
  });
}

function getRandomInt(min, max) {
  return ~~(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

function byteLength(str) {
  // returns the byte length of an utf8 string
  var s = str.length;
  for (var i = str.length - 1; i >= 0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s += 2;
    if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
  }
  return s;
}

Promise.delay = ((time, value) => {
  return new Promise(resolve => {
      setTimeout(resolve.bind(null, value), time);
  });
});

Promise.raceAll = function(promises, timeoutTime, timeoutVal) {
  return Promise.all(promises.map(p => {
      return Promise.race([p, Promise.delay(timeoutTime, timeoutVal)])
  }));
}

function extractHostname(url) {
  var hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("://") > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

function extractRootDomain(url) {
  var domain = extractHostname(url),
    splitArr = domain.split('.'),
    arrLen = splitArr.length;

  //extracting the root domain here
  //if there is a subdomain 
  if (arrLen > 2) {
    domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
    //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
    if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
      //this is using a ccTLD
      domain = splitArr[arrLen - 3] + '.' + domain;
    }
  }
  return domain;
}

function validateInput(req, res, next) {
  if (!req.get('auth-key')) {
    res.status(401);
    res.send('Unauthorized.');
  } else if (!req.get('domain')) {
    res.status(422);
    res.send('Missing "domain" header input');
  } else if (!req.rawBody) {
    res.status(422);
    res.send('Missing HTML body input');
  } else {
    next();
  }
}


function calcCenter(rect, domain = "") {
  let x;
  if (domain.includes('allivet') || domain.includes('walmartpetrx')) {
    x = getRandomArbitrary(rect.x, rect.x + 310); // width is incorrect in allivet so 310 is taken from website only
  } else {
    x = rect.x + rect.width / 2;
  }
  // let y = rect.y + rect.height / 2;
  let y = getRandomArbitrary(rect.y, rect.y + rect.height);
  return {
    x,
    y
  };
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

async function killInstance(instanceId) {
  if (instanceId) {
    console.log('Killing instance');
    await api.droplets.deleteById(instanceId);
  }
}

async function killAWSInstance(instanceId) {
  try {
    if (instanceId) {
      console.log('Killing AWS instance');
      await ec2.terminateInstances({
        InstanceIds: [instanceId]
      }).promise()
    }
  } catch (err) {
    console.log(`Error killing AWS instance: ${err}`);
  }
}

async function killAllChrome() {
  if (process.platform === 'win32' && process.env.NODE_ENV != 'dev') {
    console.log('Killing all chromium instances')
    shell.exec('TASKKILL /IM chrome.exe /F 1>NUL');
  } else if (process.env.NODE_ENV != 'dev') {
    console.log('Killing all chromium instances')
    shell.exec('killall chrome');
    shell.exec('pkill -f chromium');
  } else {
    shell.exec('killall -9 Chromium');
  }
  await sleep(5000);
}


function killAllChromeWindows() {
  // if (process.env.NODE_ENV != 'dev') {

  // }
}

function getFingerprint(ip, country, language) {
  try {
    let fingerprint = fingerprintservice.getFingerPrint(country, language);
    return fingerprint;
  } catch (err) {
    return {};
  }
}


function clearTags(str = '') {
  try {
    str = String(str || '');
    str = str.replace(/<\/?[^>]+(>|$)/g, "");
    return str;
  } catch (e) {
    return '';
  }
}

function decodeHtmlCharCodes(str = '') {
  try {
    str = String(str || '');
    return str.replace(/(&#(\d+);)/g, function (match, capture, charCode) {
      return String.fromCharCode(charCode);
    });
  } catch (err) {
    return '';
  }
}

function removeWhiteSpaces(str = '') {
  try {
    str = String(str || '');
    str = str.replace(/ /gm, "").replace(/\s/g, '');
    return str;
  } catch (e) {
    return '';
  }
}

function isEmptyObject(obj) {
  try {
    return Object.keys(obj || {}).length === 0;
  } catch (err) {
    return true;
  }
};

function filterText(str = '') {
  try {
    str = String(str || '');
    str = str.replace(/(\r\n|\n\r|\n|\r|&nbsp|\t|\n\t|\r\t;|")/gm, " ");
    str = str.replace(/&amp;/g, "&");
    return str;
  } catch (e) {
    return '';
  }
}

function winstonLogger(logFileName) {
  // let year = moment().format('YYYY'),
  //   month = moment().format('MM'),
  //   day = moment().format('DD');
  // let esTransportOpts = {
  //   level: 'info',
  //   // clientOpts: {"node": "https://search-crawler-oe2-jrcuo5zajm6hsg4v2tyimrliwa.us-east-1.es.amazonaws.com"}, //aws elastic endpoint
  //   client: new Client({
  //     node: "http://162.211.76.54:9200",
  //     auth: {
  //       username: 'elastic',
  //       password: 'cvURtkw7TwsxhZ27'
  //     }
  //   }),
  //   index : (process.env.NODE_ENV != 'dev') ? `logs_deep_crawl_${year}.${month}.${day}` : `test_deep_crawl_${year}.${month}.${day}`,
  //   // handleExceptions: false,
  //   // json: true,
  // };
  // const esTransport = new ElasticsearchTransport(esTransportOpts);
  let json_log_file = `logs_${logFileName.replace('.log', '.json')}`;
  let transport_arr = [
    new transports.Console({
      level: 'info'
    }),
    new transports.File({
      level: 'info',
      filename: logFileName
    }),
    // new transports.File({
    //   level: 'info',
    //   filename: json_log_file,
    //   format: winston.format.json()})
  ];
  // if (process.env.NODE_ENV != 'dev') //push ONLY prod log in ES
  // transport_arr.push(esTransport) //commented out as this breaks the crawler due to issues in the module 
  var logger = winston.createLogger({
    format: format.combine(
      format.timestamp(),
      format.json(),
      mFormat
    ),
    transports: transport_arr
  });
  // Compulsory error handling
  logger.on('error', (error) => {
    console.error('Error in logger caught', error);
  });
  return logger;
}

function winstonLogger(logFileName) {
  return createLogger({
    level: 'info',
    format: combine(
      // label({ label: 'Log' }),
      timestamp(),
      colorize(),
      mFormat,
    ),
    transports: [
      new transports.Console(),
      new transports.File({
        filename: logFileName
      })
    ]
  });
}

function checkDynamoResPropetries(obj, props) {
  let noProps = props.filter((prop) => !obj.hasOwnProperty(prop));
  let blankProps = props.filter((prop) => ((obj[prop] == '-') || (!obj[prop])));
  if (blankProps.length)
    // console.log('missing props for', obj.upc)
    return noProps.length + blankProps.length;
}

function addDymanoProps(source, destination, props) {
  for (let i = 0; i < props.length; i++) {
    destination[props[i]] = source[props[i]]
  }
  return destination;
}

async function whiteListIP(key, logger, ipAddress) {
  return new Promise(async (resolve) => {
    if (!ipAddress) ipAddress = await rp(' http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address');
    console.log(`IP - ${ipAddress}`)
    var options = {
      method: 'POST',
      url: 'http://server.e3sfm2eh4k.us-east-1.elasticbeanstalk.com/addiptogetInfo3',
      headers: {
        'cache-control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: {
        ip: ipAddress,
        key: 'Bungee_Rocks2018',
        name: key
      }
    };
    request(options, async function (error, response, body) {
      if (error) {
        logger.error(`whiteListIP Failed - ${error.stack}`)
        resolve(false);
      }
      logger.info('WhiteList IP Successful, Setting PFlag to True. Whitelist Body: ' + body);
      await sleep(2 * 60 * 1000);
      logger.info('Awaited for 2 mins for whitelisting: ' + body);
      resolve(true);
    });
  })

}

async function removeWhiteListIP(key, logger) {
  var options = {
    method: 'POST',
    url: 'http://server.e3sfm2eh4k.us-east-1.elasticbeanstalk.com/removeKeyGetInfo3',
    headers: {
      'cache-control': 'no-cache',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {
      key: 'Bungee_Rocks2018',
      name: key
    }
  };
  request(options, function (error, response, body) {
    if (error) {
      logger.error(`removeWhiteListIP Failed - ${error.stack}`)
    }
    logger.info('Body - ' + body);
  });
}

function checkDuplicates(s, globalList) {
  return globalList.has(s);
}

function extractPrice(price) {
  try {
    price = price?.replace(',','');
    let regexp = RegExp(/\d+\.\d+|\d+/g);
    let finalPrice = parseFloat(price.match(regexp));
    return finalPrice;
  } catch (e) {
    return parseFloat(price) || '';
  }
}

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function formalateDataObjectForDynamo({
  audited,
  audited_by,
  brand,
  capture_date,
  category,
  currency,
  ean,
  expiration_date,
  image_url,
  isbn,
  last_audit_date,
  pack_size,
  product_description,
  product_title,
  product_url,
  screenshot,
  size,
  size_alt,
  sku,
  source_name,
  source_name_display,
  source_store,
  store_name,
  store_name_display,
  sub_subcategory,
  subcategory,
  uom,
  uom_alt,
  upc,
  dimension,
  questions_count,
  shipping_weight,
  average_search_rank,
  manufacturer_part_number,
  pack_size_alt,
  parent_sku,
  custom_sku,
  s3location,
  min_purchase_quantity,
  seller,
  quantity,
  nutritional_serving_size_details,
  nutritional_standard_serving_details,
  pet_nutrition_details
}) {
  let dataObj = {
    audited: audited || '0',
    audited_by: audited_by || '-',
    brand: brand || '-',
    capture_date: capture_date || '-',
    category: category || '-',
    currency: currency || '-',
    ean: ean || '-',
    expiration_date: expiration_date || '-',
    image_url: image_url || '-',
    isbn: isbn || '-',
    last_audit_date: last_audit_date || Date.now(),
    pack_size: pack_size || '-',
    product_description: product_description || '-',
    product_title: product_title || '-',
    product_url: product_url || '-',
    screenshot: screenshot || '-',
    size: size || '-',
    size_alt: size_alt || '-',
    sku: sku || '-',
    source_name: source_name || '-',
    source_name_display: source_name_display || '-',
    source_store: source_store || '-',
    store_name: store_name || '-',
    store_name_display: store_name_display || '-',
    sub_subcategory: sub_subcategory || '-',
    subcategory: subcategory || '-',
    uom: uom || '-',
    uom_alt: uom_alt || '-',
    upc: upc || '-',
    dimension: dimension || '-',
    questions_count: questions_count || '-',
    shipping_weight: shipping_weight || '-',
    average_search_rank: average_search_rank || '-',
    pack_size_alt: pack_size_alt || '-',
    manufacturer_part_number: manufacturer_part_number || '-',
    parent_sku: parent_sku || '-',
    custom_sku: custom_sku || '',
    s3location: s3location || '-',
    min_purchase_quantity: min_purchase_quantity || '-',
    seller: seller || '-',
    quantity: quantity || '-',
    nutritional_serving_size_details: nutritional_serving_size_details || {},
    nutritional_standard_serving_details: nutritional_standard_serving_details || {},
    pet_nutrition_details: pet_nutrition_details || {}
  }
  return dataObj;
}

// function logger(severity, message, logger) {
//   logger.details.duration = Date.now() - logger.details.start_time;
//   switch (severity) {
//     case 'warn':
//       logger.warn(message, logger.details);
//       break;
//     case 'error':
//       logger.error(message, logger.details);
//       break;
//     default:
//     logger.info(message, logger.details);
//   }
// }
async function stuckChecker(waitDuration, logger, zipcode, source, logFileName, isZip_NotSelected = false) {
  let oldItemsCompleted = logger.details.crawl_count;
  let isStuck = false;
  let log_info = {
    file: logFileName
  };
  if (!isZip_NotSelected) //Sleep for wait duration only when there is NO zip selection failure
    await sleep(waitDuration); //Time after which the crawl count should have increased
  console.log("Status ", logger.details.status);
  console.log("oldItemsCompleted ", oldItemsCompleted);
  console.log("itemsCompleted ", logger.details.crawl_count);
  if (isZip_NotSelected || (logger.details.crawl_count === oldItemsCompleted && (logger.details.status === 'Running' || logger.details.status === 'Starting'))) {
    //Program is Stuck
    isStuck = true;
    logger.details.status = 'STUCK';
    logger.details.ticket_message = isZip_NotSelected ? logger.details.ticket_message : 'Crawl Stuck'; // Message in the ticket
    logger.error('Crawl STUCK');
    try {
      log_info.link = await uploadLogsToS3(zipcode, source, logFileName, logger);
      // await raiseTicket(`${logger.details.cc_pair}: Crawl stuck! ${moment(logger.details.start_time).format('DD-MM-YYYY hh:mm:ss a')}`, logger.details, log_info);
    } catch (err) {
      logger.error('Error in StuckChecker');
      return isStuck;
    }
    return isStuck;
  } else {
    //Continue 
    return (logger.details.status === 'Running') ? stuckChecker(waitDuration, logger, zipcode, source, logFileName, isZip_NotSelected) : false;
  }
}

async function raiseTicket(subject, error_details, log_info) {
  console.log('Sending email');
  let alertMsg = await generateTicketMessage(error_details, log_info);
  // sendEmailAlert.authoriseAndSendAlert(subject, alertMsg);
}

async function generateTicketMessage(details, log_info) {
  let startTime = moment(details.start_time).format('DD-MM-YYYY hh:mm:ss a');
  let duration = moment(new Date(details.start_time)).fromNow(true);
  let log_line = typeof (log_info.link) == "string" ? `Check the logs in ${log_info.file} stored at ${log_info.link}` : '';
  let msg = `The crawler for CC pair "${details.cc_pair}" started at "${startTime}" and got stuck after "${duration}".\n
  The number of products crawled before stuck: ${details.crawl_count}\n
  Error stack: ${details.ticket_message}\n
  ${log_line}`;
  return msg;
}

async function uploadLogsToS3(zipCode, source, logfilename, logger) {
  let year = moment().format('YYYY'),
    month = moment().format('MM'),
    day = moment().format('DD');
  let file_link;
  var filePath = `./${logfilename}`;
  var fileStream = fs.createReadStream(filePath);
  fileStream.on('error', function (err) {
    // console.log('File Error', err);
  });
  var uploadParams = {
    Bucket: 'bungee.competitiveintelligence.reports',
    Key: `logs/${source}GroceryProducts/year=${year}/month=${month}/day=${day}/zipcode=${zipCode}/${logfilename}`,
    Body: fileStream
  };
  s3.upload(uploadParams, function (err, data) {
    if (err) {
      logger.error(`Error - ${err}`);
      return null;
    } else {
      let loc = data.key.split('/');
      loc.pop();
      let path = loc.join('/');
      return file_link = `https://s3.console.aws.amazon.com/s3/buckets/${data.Bucket}/${path}/?region=us-east-1&tab=overview`; //aws console link for Developers
    }
  });
  console.log('waiting for log file upload');
  await sleep(10 * 1000); // Waiting for the file to be uploaded to S3
  console.log(file_link);
  return file_link;
}

//To crawl only between certain times - Used by Clicklist
function isValidCrawlTime(a = 16, b = 1) {
  //Ensures that the crawler is only crawling between 4pm UTC -> 1am UTC (10 hours window)
  //This is equal to  9am -> 6pm PST (As of April 18 - For daylight saving purposes)
  return (moment().utc().format('HH') >= a || moment().utc().format('HH') < b);
}

async function uploadScreenshot(buffer, source, filename, zipcode) {
  return new Promise((resolve, reject) => {
    let year = moment().format('YYYY'),
      month = moment().format('MM'),
      day = moment().format('DD'),
      hour = moment().format('HH');
    const uploadParams = {
      Bucket: 'bungee.screenshots',
      Key: `source=${source}/year=${year}/month=${month}/day=${day}/zipcode=${zipcode}/${filename}.jpeg`,
      Body: buffer

    };
    s3.upload(uploadParams, async function (err, data) {
      if (err) {
        console.log("Error", err);
      }
      resolve((data || {}).Location)
    });

  })

}

async function compareWebAndGPC(scraped, dynamoData, logger) {
  try {
    if (dynamoData && (dynamoData.audited_by != '-' || dynamoData.audited != '0')) {
      logger.info(`Record updated through FBL. Referesh skipped for UPC: ${dynamoData.upc} Source_store: ${dynamoData.source_store}`);
      return true; //return true to prevent refresh of the record.
    }

    let keyattributes_web = {
      category: scraped.category || '-',
      subcategory: scraped.subcategory || '-',
      sub_subcategory: scraped.sub_subcategory || '-',
      size: scraped.size || '-',
      uom: scraped.uom || '-',
      pack_size: scraped.pack_size || '-',
      size_alt: scraped.size_alt || '-',
      uom_alt: scraped.uom_alt || '-',
      pack_size_alt: scraped.pack_size_alt || '-'
    }
    let keyattributes_gpc = {
      category: dynamoData.category || '-',
      subcategory: dynamoData.subcategory || '-',
      sub_subcategory: dynamoData.sub_subcategory || '-',
      size: dynamoData.size || '-',
      uom: dynamoData.uom || '-',
      pack_size: dynamoData.pack_size || '-',
      size_alt: dynamoData.size_alt || '-',
      uom_alt: dynamoData.uom_alt || '-',
      pack_size_alt: dynamoData.pack_size_alt || '-'
    }
    let isEqual = JSON.stringify(keyattributes_web) === JSON.stringify(keyattributes_gpc);
    return isEqual;
  } catch (err) {
    logger.error(`-compareWebAndGPC: ${err.stack}`);
    return false;
  }
}


async function saveImageToS3(url, source_store, filename) {
  try {
    if (url && url.length > 0 && url != '-') {
      if (source_store == 'walmartpetrx_walmartpetrx') {
        if (url.includes('.jpg')) {
          url = url.split('.jpg')[0] + '.jpg';
        }
      }
      await rp.get({
          uri: url,
          timeout: 120000,
          encoding: null
        }).then(async function (res) {
          await uploadProductImage(res, source_store, filename, url)
        })
        .catch(function (err) {});
    }
  } catch (err) {}
}

async function uploadProductImage(buffer, source_store, filename, url) {
  return new Promise(async resolve => {
    try {
      let imagePNG = await Jimp.read(buffer);
      let bufferS3;
      imagePNG = imagePNG.getBuffer(Jimp.MIME_PNG, function (err, buffer) {
        bufferS3 = buffer;
      });

      const uploadParams = {
        Bucket: 'bungee.images',
        Key: `${source_store}/${filename}_${source_store}.png`,
        Body: bufferS3
      };
      s3.upload(uploadParams, async function (err, data) {
        if (err) {
          console.log("uploadProductImage Error", err);
        }
        resolve((data || {}).Location)
      });

    } catch (err) {
      if (!url.includes('gif'))
        //console.log(filename + ' conversion error ' + url + '=>' + err)
        resolve('')
    }
  })
}

function convertNumber(value) {
  try {
    if(Number(parseFloat(value)) >= 0 && Number(parseFloat(value).toFixed(2)) > 0) {
      return Number(parseFloat(value)).toFixed(2);
    } else if (Number(parseFloat(value)) >= 0) {
      return Number(parseFloat(value)).toFixed(4);
    } else {
      return null;
    }
  } catch (e) {}
}

function convertBoolean(value) {
  try {
    value = String(value).toLowerCase()
    if (value == 'false' || value == 'true') {
      return (value == 'true');
    } else {
      return '';
    }
  } catch (e) {}
}

function uploadDOM(source, pageHTML, filename) {
  try {
    return;
    return new Promise((resolve, reject) => {
      let year = moment().format('YYYY'),
        month = moment().format('MM'),
        day = moment().format('DD'),
        hour = moment().format('HH');
      const uploadParams = {
        Bucket: 'bungee.doms',
        Key: `source=${source}/year=${year}/month=${month}/day=${day}/${filename}.html`,
        Body: pageHTML

      };
      s3.upload(uploadParams, async function (err, data) {
        if (err) {
          console.log("uploadDOM failed: ", err);
        }
        resolve(`s3://${(data || {}).Bucket}/${(data || {}).key}`)
      });

    });
  } catch (err) {
    console.log(`uploadDOM failed: ${err.stack}`);
  }
}

function uploadZippedDOM(source, store, filename, year, month, day) {
  try {
    return new Promise((resolve, reject) => {
      // let year = moment().format('YYYY'),
      //   month = moment().format('MM'),
      //   day = moment().format('DD'),
      //   hour = moment().format('HH');
      let filePath = `./S3Uploads/${filename}.zip`;
      let fileStream = fs.createReadStream(filePath);
      fileStream.on('error', function (err) {
        console.log('File Error', err);
      });
      const uploadParams = {
        Bucket: 'bungee.doms',
        Key: `source=${source}_${store}/year=${year}/month=${month}/day=${day}/${filename}.zip`,
        Body: fileStream
      };
      s3.upload(uploadParams, async function (err, data) {
        if (err) {
          console.log("uploadZippedDOM failed: ", err);
        }
        resolve(`s3://${data.Bucket}/${data.key}`)
      });
    });
  } catch (err) {
    console.log(`uploadZippedDOM failed: ${err.stack}`);
  }
}

async function solveCaptchaPx(page, retry = 0) {
  return new Promise(async (resolve, reject) => {
      try {
          await page.mouse.click(1,1);
          let rect = await page.evaluate(() => {
              var elm = document.querySelector('#px-captcha');
              if (elm) {
                  return JSON.stringify(elm.getBoundingClientRect());
              } else {
                  return null;
              }
          });
          if (rect) {
              let center = calcCenter(JSON.parse(rect));
              await page.mouse.move(center.x, center.y);
              await page.mouse.down();
              await sleep(15 * 1000); // wait for getting the captcha solved
              await page.mouse.up();
              await sleep(10 * 1000); // wait for getting the page refreshed automatically
              if (page.url().includes('block') || page.url().includes('blocked')) {
                throw new Error('Still Blocked');
              } else {
                await sleep(15 * 1000);
              }
          }
          resolve(page);
      } catch (err) {
          console.log('Unabled to solve captcha, Retrying...', err);
          if (retry < 3) resolve(await solveCaptchaPx(page, ++retry));
          resolve(page);
      }
  });
}

function zipDOM(zipcode) {
  return new Promise((resolve, reject) => {
    let source = 'doms/';
    let out = `./S3Uploads/${zipcode}.zip`;
    const archive = archiver('zip', {
      zlib: {
        level: 9
      }
    });
    const stream = fs.createWriteStream(out);
    archive
      .directory(source, false)
      .on('error', err => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve(archive.pointer()));
    archive.finalize();
  })
}

const diacriticsMap = [];

// for (let i = 0; i < diacritics.length; i++) {
//   const letters = diacritics[i].letters;
//   for (let j = 0; j < letters.length; j++) {
//     diacriticsMap[letters[j]] = diacritics[i].base;
//   }
// }

function replaceSpecialChars(refinedText) {
  try {
    return refinedText.replace(/[^\u0000-\u007E]/g, function (a) {
      return diacriticsMap[a] || a;
    });
  } catch (err) {
    return refinedText;
  }
}
let autoscroll = async function (page) {
  console.log('Scrolling page!');
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 2200;
      var distance = 200;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
}

async function getSelectorsFromS3(scriptName) {
  let selector = {}
  let s3Selector = await s3Ops.getSelectors(scriptName);
  try {
    for (let key in s3Selector.selectors) {
      selector[key] = eval(s3Selector.selectors[key])
    }
  } catch (error) {
    console.log("error ", error);
  }
  return selector;
}

async function elasticLogger(message_obj,indexName) {
  // if (process.env.NODE_ENV != 'dev') {
  let year = moment().format('YYYY'),
    month = moment().format('MM'),
    day = moment().format('DD');
  if(!indexName) indexName = `walmart_smt_stage_2_${year}.${month}.${day}`;
  let index_name = (process.env.NODE_ENV != 'dev') ? indexName : indexName;
  try {
    // await es_client.index({
    //   index: index_name,
    //   body: message_obj
    // });
    // await es_client.indices.refresh({
    //   index: index_name
    // });
    await new_es_client_test.index({
      index: index_name,
      body: message_obj
    });
    await new_es_client_test.indices.refresh({
      index: index_name
    });
  } catch (err) {
    console.log('Error while pushing records to Elasticsearch: ' + err.message);
  }finally{
    return;
  }
  // }
}

/** 
 * @param {*} upc 12 or 13 digit upc for checksum caluation as per https://www.gs1.org/services/how-calculate-check-digit-manually
 * @param {*} logger for logging errors
 * @returns upc_with_checksum
 */
async function calculateCheckSumForUPC(upc, logger) {
  if (!upc || (upc || '').length < 12)
    return null;
  let upc_with_checksum = upc;
  let multiplier = {
    '13': [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3],
    '12': [1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3],
  }
  let sum = 0;
  try {
    for (let i = 0; i < upc.length; i++) {
      sum += (multiplier[upc.length][i] * upc[i]);
    }
    let check_digit = sum % 10 == 0 ? 0 : 10 - (sum % 10);
    upc_with_checksum = upc + '' + check_digit + '';

  } catch (error) {
    logger.error(`-calculateCheckSumForUPC: ${error.stack}`);
  }
  return upc_with_checksum;
}

function clean_pack_size(pack,logger) {
  try{
    let pattern =  /^\b[a-zA-Z_]+\b$/;
    if (pack && pattern.test(pack)) {
          return pack?.trim();
    }
    if (pack) {
      let new_pack = (convertNumber(pack?.split(' ')?.[0]) || '') + ' ' + pack.split(' ').slice(1).join(' ');
      return new_pack.trim();
    } else {
      return '';
    }
  } catch (err) {
    logger.error(`cleanPackSize: ${err.stack}`);
    return pack;
  }
  
}

//Puppeteer stop loading images and css fonts
async function stopLoadingImages(page) {
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
      request.abort();
    } else {
      request.continue();
    }
  });
}
function getNumber(x) {
  if (!x) return null
  x = x.toString();
  x = x.replace(',', ''); // this is to convert 1,800 to 1800  for proper extraction below
  if (x.length == 0) return null;
  let r = /[\d\.]+/;
  return Number(r.exec(x))
}


async function searchElastic(index,searchQuery){
  try{
    let result= await new_es_client.search({
        'index': index,
        'body': searchQuery
    })
    return result;
  }
  catch(err){
    console.log(err.stack);
    return {};
  }

}

async function getFilesFromS3(S3_BUCKET, link) {
  let files = [];
  let params = {
    Bucket: S3_BUCKET,
    Prefix: link
  };
  try {
    let data = await s3.listObjectsV2(params).promise();
    if (data.Contents.length > 0) {
      for (let i = 0; i < data.Contents.length; i++) {
        files.push(data.Contents[i].Key);
      }
    }
    return files;
  } catch (err) {
    console.log(err.stack);
    return files;
  }
  
}

async function getDataFromS3(S3_BUCKET, link) {
  let params = {
    Bucket: S3_BUCKET,
    Key: link
  };
  try {
    let data = await s3.getObject(params).promise();
    return data;
  } catch (err) {
    console.log(err.stack);
    return {};
  }
  
}


module.exports = {
  getFilesFromS3,
  getDataFromS3,
  stopLoadingImages,
  elasticLogger,
  IsJsonString,
  extractPrice,
  checkDuplicates,
  clearTags,
  decodeHtmlCharCodes,
  removeWhiteSpaces,
  filterText,
  addDymanoProps,
  checkDynamoResPropetries,
  winstonLogger,
  getFingerprint,
  killAllChrome,
  killInstance,
  killAWSInstance,
  calcCenter,
  validateInput,
  extractHostname,
  extractRootDomain,
  byteLength,
  sleep,
  getRandomInt,
  isValidCrawlTime,
  deleteFilesInDirectory,
  whiteListIP,
  removeWhiteListIP,
  formalateDataObjectForDynamo,
  stuckChecker,
  raiseTicket,
  uploadLogsToS3,
  uploadScreenshot,
  compareWebAndGPC,
  saveImageToS3,
  convertNumber,
  convertBoolean,
  uploadDOM,
  uploadZippedDOM,
  solveCaptchaPx,
  zipDOM,
  autoscroll,
  replaceSpecialChars,
  isEmptyObject,
  getSelectorsFromS3,
  calculateCheckSumForUPC,
  clean_pack_size,
  getNumber,
  // pricing_lb,
  searchElastic
}