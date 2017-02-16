## ACTS Statistics viewer

[Website](http://grantreporting.udaf.utah.gov/Public)

_the following instructions assume that the main UDAF website is already published_

#### Website Build Steps

1. `npm install`
1. `bower install`
1. `grunt build-[stage|prod]`
1. `grunt prepare-for-deploy`


#### Website Deploy Steps
1. Copy the zipped files into the UDAF file structure in svn and web deploy from Visual Studio.

#### Api Deploy Steps

1. Update `connections.config` from the `connections.template.config` sample.
1. Publish the API to http://geoedit.utah.gov/ACTS
