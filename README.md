# Snyk Jar Files scanner
[![Known Vulnerabilities](https://snyk.io/test/github/aarlaud-snyk/snyk-jar-scan/badge.svg)](https://snyk.io/test/github/aarlaud-snyk/snyk-jar-scan)

Simple CLI tool to check for coordinates in jar files and test with Snyk APIs.

## Installation
npm install -g

## Usage
### snyk-jar \<jarfolder\> -o \<organizationID\> -t \<APIkey\>
or if orgID and API Key set as Env variables SNYK_ORG_ID and SNYK_API_KEY
### snyk-jar \<jarfolder\>

Will generate HTML Report and open it in browser

### Prerequisites
- SNYK API Key (![SNYK Account](https://snyk.io/account))
- SNYK Org ID
