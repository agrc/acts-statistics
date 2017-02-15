using System.Collections.Generic;
using Newtonsoft.Json;

namespace ACTS.Statistics.API.Models
{
    public class Response
    {
        [JsonProperty(PropertyName = "projectName")]
        public string ProjectName { get; set; }

        [JsonProperty(PropertyName = "projectType")]
        public string ProjectType { get; set; }

        
        [JsonProperty(PropertyName = "contractNumbers")]
        public IEnumerable<int> ContractNumbers { get; set; }

        [JsonProperty(PropertyName = "projectArea")]
        public string ProjectArea { get; set; }

        [JsonProperty(PropertyName = "amountOnContract")]
        public string AmountOnContract { get; set; }

        [JsonProperty(PropertyName = "amountOfContractPaid")]
        public string AmountOfContractPaid { get; set; }

        [JsonProperty(PropertyName = "contractTypes")]
        public IEnumerable<string> ContractTypes { get; set; }

        [JsonProperty(PropertyName = "contractStatus")]
        public string ContractStatus { get; set; }

        [JsonProperty(PropertyName = "practicesInstalled")]
        public IEnumerable<string> PracticesInstalled { get; set; }

        [JsonProperty(PropertyName = "affectedArea")]
        public string AffectedArea { get; set; }

        [JsonProperty(PropertyName = "projectDescription")]
        public string ProjectDescription { get; set; }

        [JsonProperty(PropertyName = "monitoringPlan")]
        public string MonitoringPlan { get; set; }

        [JsonProperty(PropertyName = "contributors")]
        public IEnumerable<string> Contributors { get; set; }

        [JsonProperty(PropertyName = "messages")]
        public string Message { get; set; }
    }
}