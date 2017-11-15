
var fs = require('fs');
var fsExtra = require('fs-extra');
var rimraf = require('rimraf');
var sha1File = require('sha1-file');

var json2xml = require('json2xml');

var tempFolderName = 'snyk-tempfolder';
var signatureList = [];

var exports = module.exports = {};

exports.listJarsAndCopyPoms = (fileList) => {
  return new Promise((resolve,reject) => {
    var loopDone = false;
    var stackRead = [];
    //var jarList = [];
    //var pomList = [];


    fileList.forEach((result, index) => {

      if(path.extname(result) == ".jar"){
        if(fileList.includes(path.dirname(result) + '/' +path.basename(result, '.jar')+'.pom')){
          var pomDir = __dirname + '/'+tempFolderName+'/' + path.basename(result,'.jar');
          fs.mkdirSync(pomDir);
          fsExtra.copySync(path.dirname(result) + '/'+ path.basename(result, ".jar")+'.pom', pomDir+'/pom.xml');
        } else if(fileList.includes(result+'.sha1')){
          var signature = fs.readFileSync(result+'.sha1', 'utf-8');
          signatureList.push(signature);
        } else{
          extractPomAndSha(result)
          .then(() => {
            // console.log(signatureList);
            //console.log("pom and sha1 extracted");
            resolve(signatureList);
          })
          .catch((err) => {
            reject(err);
          });
        }
        // jarList.push(result);
        stackRead.push(result);


      }

      if(index == fileList.length-1){

        loopDone = true;

      }

    });
  });
}

var unzip = require('unzip-stream');
var fs = require('fs');
var path = require('path');


exports.listAllFiles = (path) => {
  return new Promise((resolve, reject) => {

    walk(path, function(err, results){
      if(err){
        //console.log(err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  })

}

const extractPomAndSha = (result) => {
    return new Promise((resolve,reject) => {
      var skipFlag = false;
      fs.createReadStream(result)
        .pipe(unzip.Parse())
        .on('entry', function (entry) {
          var fileName = path.basename(entry.path);
          var extName = path.extname(entry.path);
          var type = entry.type; // 'Directory' or 'File'
          var size = entry.size;

          if (type == 'File' && (fileName === "pom.xml" || extName === '.pom')) {
            skipFlag = true;
            //console.log("Found pom file for "+ entry.path);
            entry.on('data', (data) => {
              let pomDir = __dirname + '/'+tempFolderName+'/' + path.basename(result,'.jar');
              if (!fs.existsSync(pomDir)){
                  fs.mkdirSync(pomDir);
              }
              fs.writeFile(pomDir + '/pom.xml',
              data.toString(),
              (err, data) => {
                if(err){
                  console.log(err);
                }
              });
            })
          } else if (type == 'File' && extName === ".sha1") {
            skipFlag = true;
            //console.log("Found sha1 file for "+ entry.path);
            entry.on('data', (data) => {
              signatureList.push(data.toString());
            })
          } else if(type == 'File' && path.extname(entry.path) == ".jar"){
            skipFlag = true;
            console.log("Found "+ entry.path + " - Checking for pom or sha1 files");
            let pomDir = __dirname + '/'+tempFolderName+'/' + path.basename(result,'.jar');
            if (!fs.existsSync(pomDir)){
                fs.mkdirSync(pomDir);
            }
            var wstream = fs.createWriteStream(pomDir + '/'+entry.path);
            entry.on('data', (data) => {
              var buffer = data;
              wstream.write(buffer);
            })
            .on('finish', function(){
                wstream.end();
                extractPomAndSha(pomDir + '/'+entry.path)
                .then(() => {
                  resolve();
                });
            })
            .on('error', function(err){
              reject(err);
            });


          } else {

              entry.autodrain();
          }


        })
        .on('close', function(){
          if(!skipFlag){
            console.log("Couldn't find anything, computing sha1 signature for jar file "+ result);
            signatureList.push(sha1File(result));
          }
          resolve();
        })
        .on('error', function(err){
          reject(err);

        });
    });

}

// exports.listAllPoms = (path) => {
//   return new Promise((resolve,reject) => {
//
//   });
// }

exports.computeAndListJarSha1Sum = (jarList) => {
      shaSignatureList = [];
      for(i=0;i<jarList.length;i++){
        shaSignatureList.push([jarList[i],sha1File(jarList[i])]);
      }
      return shaSignatureList;

}

exports.combineCoordinatesIntoPom = (coordinateList) => {
  return new Promise((resolve,reject) => {
      var json = JSON.parse(pomTemplateJson);
      var depList = [];
      for(i=0;i<coordinateList.length;i++){
        if(coordinateList[i][0] != "not found"){
          depList.push({'dependency': {
            'groupId': coordinateList[i][0],
            'artifactId': coordinateList[i][1],
            'version': coordinateList[i][2]
          }});
        }
      }
      json['project']['dependencies'] = depList;
      let customPomPath = __dirname + '/'+tempFolderName+'/snyk-generated-pom.xml';
      fs.writeFile(customPomPath, json2xml(json), (err) => {
        if(err){
          reject(err)
        } else {
          resolve(customPomPath);
        }

      });
  });

}

var pomTemplateJson = '{"project": {"modelVersion": "1.0.0","groupId": "com.snyk.jar_scanner_filesystem","artifactId": "jar_scanner_filesystem","version": "1","properties": { "mavenVersion": "2.1" },"dependencies": {    }  }}';

var walk = (dir, done) => {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};
