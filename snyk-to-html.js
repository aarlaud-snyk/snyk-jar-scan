#!/usr/bin/env node
var exports = module.exports = {};
var fs = require("fs");
var Handlebars = require("handlebars");
var marked = require('marked');
var moment = require('moment');

var output, template, source;

output = __dirname + '/report.html';
template = __dirname + '/template/test-report.hbs';

var htmlTemplate = fs.readFileSync(template, 'utf8');
var hbTemplate = Handlebars.compile(htmlTemplate);
var severityMap = {low: 0, medium: 1, high: 2};

function metadataForVuln(vuln) {
 return {
   id: vuln.id,
   title: vuln.title,
   name: vuln.package,
   info: vuln.info,
   severity: vuln.severity,
   severityValue: severityMap[vuln.severity],
   description: vuln.description,
 };
}

function groupVulns(vulns) {
  var result = {};
  if (!vulns || typeof vulns.length === 'undefined') {
    return result;
  }
  for (var i = 0; i < vulns.length; i++) {
    if (!result[vulns[i].id]) {
      result[vulns[i].id] = {};
      result[vulns[i].id].list = [];
      result[vulns[i].id].metadata = metadataForVuln(vulns[i]);
    }
    result[vulns[i].id].list.push(vulns[i]);
  }
  return result;
}

function generateTemplate(data) {
  data.vulnerabilities = groupVulns(data.vulnerabilities);
  return hbTemplate(data);
}

function onDataCallback(data, jsonFromVar = false) {
  return new Promise((resolve, reject) => {
    var template = generateTemplate(data);
    if (output) {
      fs.writeFile(output, template, function(err) {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          console.log('Vulnerability snapshot saved at ' + output);
          resolve(output);
        }
      });
    } else {
      console.log(template);
      if(jsonFromVar){
          resolve(template);
      }

    }
  });
}

const readInputFromVar = async (data) => {
//  console.log(data.issues.vulnerabilities);
  return await onDataCallback(data.issues, true);
}

// function run(data) {
//   log('fdgf');
//   if(data){
//     output = __dirname;
//     template = __dirname + '/template/test-report.hbs';
//     readInputFromVar(data);
//   } else {
//     console.error("error in run");
//   }
// }

exports.run = (data) => {
  if(data){
    return readInputFromVar(data);
  }
}

// handlebar helpers
Handlebars.registerHelper('markdown', function (source) {
  return marked(source);
});

Handlebars.registerHelper('moment', function (date, format) {
  return moment.utc(date).format(format);
});

Handlebars.registerHelper('isDoubleArray', function (data, options) {
  return Array.isArray(data[0]) ? options.fn(data) : options.inverse(data);
});

Handlebars.registerHelper('if_eq', function (a, b, opts) {
  return (a === b) ? opts.fn(this) : opts.inverse(this);
});

Handlebars.registerHelper('count', function (data) {
  return data && data.length;
});

Handlebars.registerHelper('dump', function (data, spacer) {
    return JSON.stringify(data, null, spacer || null);
});

Handlebars.registerHelper('if_any', function () { // important: not an arrow fn
  var args = [].slice.call(arguments);
  var opts = args.pop();

  return args.some(function(v) {return !!v;}) ?
    opts.fn(this) :
    opts.inverse(this);
});

Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
  switch (operator) {
    case '==': {
      return (v1 == v2) ? options.fn(this) // jshint ignore:line
                        : options.inverse(this);
    }
    case '===': {
      return (v1 === v2) ? options.fn(this) : options.inverse(this);
    }
    case '<': {
      return (v1 < v2) ? options.fn(this) : options.inverse(this);
    }
    case '<=': {
      return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    }
    case '>': {
      return (v1 > v2) ? options.fn(this) : options.inverse(this);
    }
    case '>=': {
      return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    }
    case '&&': {
      return (v1 && v2) ? options.fn(this) : options.inverse(this);
    }
    case '||': {
      return (v1 || v2) ? options.fn(this) : options.inverse(this);
    }
    default: {
      return options.inverse(this);
    }
  }
});
