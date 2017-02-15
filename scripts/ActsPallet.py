'''
updateCentroids.py

Used to recreate ProjectArea_Points as centroids of ProjectArea feature class
in the Salinity database

This data is used in the ACTSStatisticsViewer web app
'''

import arcpy
from arcpy.da import UpdateCursor, SearchCursor
from os import makedirs
from os.path import basename
from os.path import dirname
from os.path import exists
from os.path import join
from forklift.models import Pallet


class ActsPallet(Pallet):

    PROJECTAREA = 'ProjectArea'
    CENTROIDS = 'ProjectArea_Points'
    PROJECTINFORMATION = 'ProjectInformation'
    CONTRACTINFORMATION = 'ContractInformation'
    COUNTY = 'COUNTY'

    def __init__(self):
        super(ActsPallet, self).__init__()

        self.destination_workspace = 'c:\\scheduled\\staging\\salinity.gdb'

        self.arcgis_services = [('ACTSStatisticsViewer', 'MapServer')]
        self.copy_data = [self.destination_workspace]

        self.fields = [('id', 'Guid'), ('y', 'TEXT'), ('t', 'TEXT'), ('n', 'TEXT'), ('c', 'TEXT')]
        self.destination_coordinate_system = 26912

    def build(self, configuration='Production'):
        db = 'ACTS_PROD.sde'

        if configuration == 'Staging':
            db = 'ACTS_STAGE.sde'

        self.source_workspace = join(self.garage, db)

        self.add_crate(self.PROJECTAREA,
        {'source_workspace': self.source_workspace,
         'destination_workspace': self.destination_workspace})

        #: these crates have a different primary key
        self.add_crates(
            [self.PROJECTINFORMATION, self.CONTRACTINFORMATION, self.COUNTY],
            {'source_workspace': self.source_workspace,
             'destination_workspace': self.destination_workspace,
             'source_primary_key': 'GUID'})

        self._create_workspace(self.destination_workspace)

        self.PROJECTAREA = join(self.destination_workspace, self.PROJECTAREA)
        self.CENTROIDS = join(self.destination_workspace, self.CENTROIDS)
        self.PROJECTINFORMATION = join(self.destination_workspace, self.PROJECTINFORMATION)
        self.CONTRACTINFORMATION = join(self.destination_workspace, self.CONTRACTINFORMATION)
        self.COUNTY = join(self.destination_workspace, self.COUNTY)

    def process(self):
        self.log.info('creating feature selection')
        project_area_fc = self._create_layer_with_approved_contracts()

        self.log.info('generating centroids from project polygons')
        if arcpy.Exists(self.CENTROIDS):
            arcpy.Delete_management(self.CENTROIDS)

        arcpy.FeatureToPoint_management(project_area_fc, self.CENTROIDS, 'INSIDE')
        self._update_point_fields()

        self._update_data_attributes()

        arcpy.Delete_management(project_area_fc)

        self.log.info('done.')

    def _create_workspace(self, workspace):
        if exists(workspace):
            return

        gdb_name = basename(workspace)
        workspace = workspace.replace(gdb_name, '')

        try:
            makedirs(dirname(workspace))
        except:
            pass

        arcpy.CreateFileGDB_management(workspace, gdb_name, 'CURRENT')

    def _create_layer_with_approved_contracts(self):
        self.log.info('selecting Contracts')

        layer = arcpy.MakeFeatureLayer_management(self.PROJECTAREA)

        projects = set((row[0] for row in SearchCursor(layer, ['Project_Fk'])))
        contracts = set((row[0] for row in SearchCursor(self.CONTRACTINFORMATION, ['Project_Fk'], 'ContractStatus in (3,7)')))

        guids = projects & contracts

        guids = ["'{}'".format(guid) for guid in guids]

        where_clause = 'Project_Fk in ({})'.format(','.join(guids))
        arcpy.SelectLayerByAttribute_management(layer, 'NEW_SELECTION', where_clause)

        return layer

    def _update_point_fields(self):
        arcpy.DeleteField_management(self.CENTROIDS, ['GUID', 'AREAACRES', 'UNITS', 'ORIG_FID'])

        for field in self.fields:
            arcpy.AddField_management(in_table=self.CENTROIDS, field_name=field[0], field_type=field[1])

    def _update_data_attributes(self):
        self.log.info('compacting data')

        with UpdateCursor(self.CENTROIDS, ('Project_FK', 'id', 'y', 't', 'n', 'c')) as project_points:
            for project in project_points:
                #: set id
                project[1] = project[0]

                where_clause = 'Project_FK = \'{}\''.format(project[0])

                with SearchCursor(self.COUNTY, ['Project_Fk', 'County'], where_clause) as county_numbers:
                    counties = set([])

                    for county in county_numbers:
                        counties.add(county[1])

                    #: set county
                    project[5] = ', '.join(counties)

                where_clause = 'GUID = \'{}\''.format(project[0])

                with SearchCursor(self.PROJECTINFORMATION, ('FundingYear', 'ProjectType', 'ProjectName'),
                                  where_clause) as project_informations:
                    for project_information in project_informations:
                        #: set funding year
                        project[2] = project_information[0]
                        #: set project type
                        project[3] = project_information[1]
                        #: set project name for non salinity projets
                        project[4] = project_information[2]

                # replace project name with contract numbers for salinity projects
                where_clause = 'Project_Fk = \'{}\''.format(project[0])
                if project[3] == 1:
                    with SearchCursor(self.CONTRACTINFORMATION, ('UDAFContractNum'), where_clause) as contracts:
                        cons = set()

                        for contract in contracts:
                            cons.add(contract[0])

                        project[4] = 'Contract {}'.format(', '.join(cons))

                project_points.updateRow(project)
