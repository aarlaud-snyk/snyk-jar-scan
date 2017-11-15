var exports = module.exports = {};

const axios = require('axios');

exports.findAndDownloadCoordinates = (sha1List) => {
  return new Promise(async (resolve,reject) => {

    var coordinateList = [];
    for(i=0;i<sha1List.length;i++){
        // Adding 150ms between calls to be gentle on maven search
        await wait(150);
        axios.get('http://search.maven.org/solrsearch/select?q=1:%22'+sha1List[i]+'%22&rows=20&wt=json')
          .then(response => {
            if(response.data.response.numFound == 1){
              console.log("\nIdentified package coordinates");
              console.log([response.data.response.docs[0].g,response.data.response.docs[0].a,response.data.response.docs[0].v]);
              coordinateList.push([response.data.response.docs[0].g,response.data.response.docs[0].a,response.data.response.docs[0].v]);
            } else {
              console.log(response.data.responseHeader.params.q+" not found");
              coordinateList.push(["not found"]);
            }
            if(coordinateList.length == sha1List.length){
              resolve(coordinateList);
            }

          })
          .catch(error => {
            // TODO: Implement retry mechanism upon maven check failure.
            console.error("Error checking for coordinates using signature. Please try again.");
            console.error(error);
            reject(error);
          });


    }

  });
}

const wait = async (time) => {
  await new Promise(resolve => setTimeout(() => resolve(), time));
}
