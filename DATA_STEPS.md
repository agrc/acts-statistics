Steps to set up the database for this app
=========================================

#### FeatureToPoint Tool
ProjectArea

ProjectArea_Points

Inside Checkbox checked

Build indices on:
PROJECTINFORMATION.GUID
PROJECTINFORMATION.ProjectType
ProjectArea_Points.Project_FK
CONTRACTINFORMATION.Project_FK
CONTRACTINFORMATION.ContractStatus

Deploy updateCentroid.py and point it to the newly created feature class.

Update mxd to point to correct database and re-publish
