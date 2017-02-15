using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Configuration;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Http;
using ACTS.Statistics.API.Models;
using ACTS.Statistics.API.Models.Database;
using Dapper;
using WebAPI.OutputCache.TimeAttributes;

namespace ACTS.Statistics.API.Controllers
{
    public class ProjectController : ApiController
    {
        [CacheOutputUntilToday(23, 55)]
        public async Task<Response> Get(Guid id)
        {
            Response response;
            using (var connection = GetSqlConnection())
            {
                await connection.OpenAsync();

                var projects =
                    await connection.QueryAsync<Projects>("select projectname as 'name', projecttype as 'type' " +
                                                          "from projectinformation where guid = @id", new {id});

                var project = projects.FirstOrDefault();

                if (project == null)
                {
                    return new Response
                        {
                            Message = "Project not found."
                        };
                }

                var contracts =
                    await connection.QueryAsync<Contracts>("SELECT (CASE WHEN ISNUMERIC(udafcontractnum) = 1 " +
                                                           "THEN CAST(UDAFContractNum AS int) " +
                                                           "ELSE NULL END) AS Number, " +
                                                           "ContractType AS type, ContractStatus AS status " +
                                                           "FROM CONTRACTINFORMATION " +
                                                           "WHERE (Project_FK = @id)", new {id});

                var contractAmount = await connection.QueryAsync<decimal?>("select sum(contractamount) " +
                                                                           "from contractinformation " +
                                                                           "where project_fk = @id", new {id});

                var projectArea = await connection.QueryAsync<decimal?>("select amount from generalareaattributes " +
                                                                        "where featurename = 'ProjectArea' and project_fk = @id",
                                                                        new {id});

                //sum of all [Disbursements].AmountPaidOut
                //  WHERE [Disbursements].Contract_FK = [ContractInformation].GUID 
                // of the records in [ContractInformation] 
                // WHERE [ContractInformation].Project_FK = [ProjectInformation].GUID

                var amountPaid =
                    await connection.QueryAsync<decimal?>("SELECT SUM(DISBURSEMENTS.AmountPaidOut) AS amount " +
                                                          "FROM DISBURSEMENTS INNER JOIN CONTRACTINFORMATION " +
                                                          "ON DISBURSEMENTS.Contract_FK = CONTRACTINFORMATION.GUID " +
                                                          "WHERE (CONTRACTINFORMATION.Project_FK = @id)",
                                                          new {id});

                /*
                 * This value is taken from [LU_NRCSPaymentSchedule].Practice_Name WHERE the value in 
                 * [Itemized].PracticeComponent = [LU_NRCSPaymentSchedule].Component AND 
                 * [LU_NRCSPaymentSchedule].Component = ‘GIP’. Now there will be potentially a lot
                 * of possibilities for the returns of this query, so just take the first returned value 
                 * (They should all be the same, theoretically). The value after the “ – “ is from 
                 * [Itemized].PracticeComponent WHERE [Itemized].Practice_FK = [PracticeAttributes].GUID 
                 * (WHERE [PracticeAttributes].Project_FK = [ProjectInformation].GUID of the project 
                 * that was selected in the map using the identify tool).
                 */
                var practice =
                    await
                    connection.QueryAsync<Practices>(
                        "SELECT DISTINCT ITEMIZED.PracticeComponent AS component, LU_NRCSPAYMENTSCHEDULE.Practice_Name AS name " +
                        "FROM ITEMIZED INNER JOIN " +
                        "PRACTICEATTRIBUTES ON ITEMIZED.Practice_FK = PRACTICEATTRIBUTES.GUID " +
                        //"INNER JOIN LU_COSTSHAREPROGRAM ON PRACTICEATTRIBUTES.CostShareProgram = LU_COSTSHAREPROGRAM.Code " +
                        "INNER JOIN LU_NRCSPAYMENTSCHEDULE ON ITEMIZED.PracticeComponent = LU_NRCSPAYMENTSCHEDULE.Component AND  " +
                        "LU_NRCSPAYMENTSCHEDULE.Practice_Code = PRACTICEATTRIBUTES.PracticeCode " +
                        //"AND LU_NRCSPAYMENTSCHEDULE.Cost_Share_Program = LU_COSTSHAREPROGRAM.Value " +
                        "WHERE (PRACTICEATTRIBUTES.Project_FK = @id)", new {id});

                var contractInMemory = contracts as IList<Contracts> ?? new List<Contracts>();
                var projectType = project.Type;

                response = new Response
                    {
                        ProjectName = project.Type == 1 ? "Basin States Salinity Control Program" : project.Name,
                        ContractNumbers = contractInMemory.Select(x => x.Number).OrderBy(x => x),
                        ProjectArea = string.Format("{0} {1}",
                                                    projectArea.FirstOrDefault().GetValueOrDefault(0).ToString("N"),
                                                    "acres"),
                        AmountOnContract = contractAmount.FirstOrDefault().GetValueOrDefault(0).ToString("c"),
                        AmountOfContractPaid = amountPaid.FirstOrDefault().GetValueOrDefault(0).ToString("c"),
                        ContractTypes = LookupContractType(contractInMemory.Select(x => x.Type).Distinct()),
                        ContractStatus = DetermineContractStatus(contractInMemory.Select(x => x.Status).Distinct()),
                        PracticesInstalled = practice.Select(x => x.ToString()),
                        ProjectType = LookupProjectType(projectType)
                    };

                if (new[] {2, 3, 4, 5}.Contains(projectType))
                {
                    var affectedArea =
                        await connection.QueryAsync<decimal?>("select amount from generalareaattributes " +
                                                              "where featurename = 'AffectedArea' and project_fk = @id",
                                                              new {id});

                    response.AffectedArea = string.Format("{0} {1}",
                                                          affectedArea.FirstOrDefault().GetValueOrDefault(0).ToString(
                                                              "N"), "acres");

                    var gipExplainations =
                        await
                        connection.QueryAsync<Gip>(
                            "select projectdescription as description, monitoringreport as plans " +
                            "from gipprojectapplication " +
                            "where project_fk = @id ", new {id});

                    var record = gipExplainations.FirstOrDefault();

                    if (record != null)
                    {
                        response.ProjectDescription = record.Description;
                        response.MonitoringPlan = record.Plans;
                    }

                    var contributors =
                        await
                        connection.QueryAsync<Contributor>(
                            "SELECT CONTRIBUTORS.ContributorName as name, SUM(Contributors.CostShareAmount) AS amount " +
                            "FROM CONTRIBUTORS " +
                            "INNER JOIN PRACTICEATTRIBUTES ON CONTRIBUTORS.Practices_FK = PRACTICEATTRIBUTES.GUID " +
                            "WHERE (CONTRIBUTORS.Project_FK  = @id) " +
                            "AND (PRACTICEATTRIBUTES.Status = 1) " +
                            "AND practiceattributes.status = 1 " + 
                            "GROUP BY CONTRIBUTORS.ContributorName", new { id });

                    response.Contributors = contributors.Select(x => x.ToString());
                }
            }


            return response;
        }

        private static string LookupProjectType(int type)
        {
            switch (type)
            {
                case 1:
                    return "Basin States Salinity Control Program";
                case 2:
                    return "Grazing Improvement Program (GIP)";
                case 3:
                    return "Invasive Species Mitigration (War on Cheatgrass)";
                case 4:
                    return "Combination of Different Programs";

                case 5:
                    return "Nonpoint Source Pollution (319)";
                default:
                    return null;
            }
        }

        private static string DetermineContractStatus(IEnumerable<int> statuses)
        {
            var both = new[] {3, 7};

            if (statuses.Intersect(both).Count() == 2)
                return "Approved, Completed";

            if (statuses.Contains(3))
                return "Approved";

            if (statuses.Contains(7))
                return "Completed";

            return null;
        }

        private static IEnumerable<string> LookupContractType(IEnumerable<int> types)
        {
            var collection = new Collection<string>();
            foreach (var type in types)
            {
                switch (type)
                {
                    case 1:
                    case 2:
                    case 3:
                        collection.Add("Salinity");
                        break;
                    case 4:
                        collection.Add("Grazing Improvement Program (GIP)");
                        break;
                    case 5:
                        collection.Add("War on Cheatgrass");
                        break;
                    case 6:
                        collection.Add("Invasive Species Mitigation (ISM)");
                        break;
                    default:
                        continue;
                }
            }

            return collection;
        }

        private static SqlConnection GetSqlConnection()
        {
            return new SqlConnection(ConfigurationManager.ConnectionStrings["production_copy"].ConnectionString);
        }
    }
}