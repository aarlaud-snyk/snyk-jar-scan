var exports = module.exports = {};

const axios = require('axios');
var fs = require('fs');
var snykToHtml = require('./snyk-to-html.js');



var orgID = '';
var tokenAPI = '';

exports.setCredentials = (organizationID, APIkey) => {
  orgID = organizationID;
  tokenAPI = APIkey;
}


exports.snykTestCoordinates = (coordinateList) => {
  var config = {
    headers: {'Authorization': tokenAPI}
  };
  console.log(coordinateList[0]);
  axios.get('https://snyk.io/api/v1/test/maven/'+coordinateList[0][0]+'/'+coordinateList[0][1]+'/'+coordinateList[0][2]+'?org='+orgID, config)
    .then(response => {
      console.log(response.data);

    })
    .catch(error => {
      console.log(error);
    });

}

exports.snykTestPomFiles = (pomList) => {
  return new Promise((resolve,reject) => {
    var file = fs.readFileSync(pomList[0],'utf8');
    var files = [];

    for(i=1;i<pomList.length;i++){
      files.push({contents: fs.readFileSync(pomList[i],'utf8')})
    }

    var content = {
      encoding: "plain",
      files: {
        target: {
          contents: file
        },
        additional: files
      }
    }
    var data = JSON.stringify(content);

  axios({
    method: 'post',
    url: 'https://snyk.io/api/v1/test/maven/?org='+orgID,
    data: data,
    headers: {'Authorization': tokenAPI, 'Content-Type':'application/json'}
  }).then(function (response) {
      resolve(response.data)
    })
    .catch(function (error) {
      reject(error);
    });
  });
}


exports.generateHtmlReport = (jsonData) => {
  return new Promise((resolve, reject) => {
    resolve(snykToHtml.run(jsonData))
  });
}
