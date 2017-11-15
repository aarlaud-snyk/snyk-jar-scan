#!/usr/bin/env node
const utils = require('./utils.js');
const snykUtils = require('./snyk_utils.js');
const mavenUtils = require('./maven_utils.js');
const program = require('commander');

const fs = require('fs');
const rimraf = require('rimraf');
const opn = require('opn');
const figlet = require('figlet');

program
  .version('0.0.1')
  .description('Snyk Jar Files filesystem scanner')
  .on('--help', function(){
    console.log('');
    console.log('    usage: scan <folder_path> [options]');
    console.log('                -o, --org [OrgID]', 'SNYK organization ID (found on snyk.io -> settings)');
    console.log('                -t, --token [APIToken]', 'SNYK API Token (found on https://snyk.io/account)');
    console.log('');
    console.log('    NOTE');
    console.log('    OrgID and API Key can be set in env variables SNYK_API_KEY and SNYK_ORG_ID.');
    console.log('');
  });

jarList = [];
pomList = [];
signatureList = [];

var tempFolderName = 'snyk-tempfolder';

program
  .command('scan <jarFolderPath>')
  .description('Scan a folder of jar files with Snyk')
  .option('-o, --org [OrgID]', 'SNYK organization ID (found on snyk.io -> settings)')
  .option('-t, --token [APIToken]', 'SNYK API Token (found on https://snyk.io/account)')
  .action((jarFolderPath, options) => {
    if((options.org && options.token) || (process.env.SNYK_ORG_ID && process.env.SNYK_API_KEY)){
        snykUtils.setCredentials(options.org || process.env.SNYK_ORG_ID, options.token || process.env.SNYK_API_KEY);
    } else {
      console.error("Provide organization ID and API Token");
      process.exit(1);
    }


    if (!fs.existsSync(__dirname + '/'+tempFolderName+'/')){
        fs.mkdirSync(__dirname + '/'+tempFolderName+'/');
    } else {
      rimraf.sync(__dirname + '/'+tempFolderName+'/');
      fs.mkdirSync(__dirname + '/'+tempFolderName+'/');
    }
    figlet.text('SNYK', {
    font: 'Star Wars',
    horizontalLayout: 'default',
    verticalLayout: 'default'
}, function(err, data) {
    if (err) {
        console.log('Something went wrong...');
        console.dir(err);
        return;
    }
    console.log(data)
});

    utils.listAllFiles(jarFolderPath)
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .then(utils.listJarsAndCopyPoms)
    //.then(utils.computeAndListJarSha1Sum)
    .then((list) => {
      signatureList = list;
      console.log("\nChecking package signature");
      console.log(signatureList);
      return signatureList;
    })
    .then(mavenUtils.findAndDownloadCoordinates)
    .then(utils.combineCoordinatesIntoPom)
    //.then(snykUtils.snykTestCoordinates)
    .then((customPomPath) => {
      return utils.listAllFiles(__dirname + '/'+tempFolderName+'/')
    })
    .then(snykUtils.snykTestPomFiles)
    .then(snykUtils.generateHtmlReport)
    .then((data) => {
      console.log('\nCleaning up');
      rimraf.sync(__dirname + '/'+tempFolderName+'/');
      opn(data,{wait:false}).then(() => {
        console.log("Stay Secure !");
        process.exit()
      });
    })

  });

  //.then(utils.combineCoordinatesIntoPom)

program.parse(process.argv);
if (program.args.length === 0) program.help();
