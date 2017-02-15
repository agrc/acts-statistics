namespace ACTS.Statistics.API.Models.Database
{
    public class Contributor
    {
        public string Name { get; set; }
        public decimal Amount { get; set; }

        public override string ToString()
        {
            return string.Format("{0} {1}", LookupName(Name), Amount.ToString("c"));
        }

        public string LookupName(string name)
        {
            switch (name)
            {
                case "1":
                    return "Grantee";
                case "2":
                    return "GIP";
                case "3":
                    return "NRCS";
                case "4":
                    return "BLM";
                case "5":
                    return "SITLA";
                case "6":
                    return "FSA";
                case "7":
                    return "UPCD";
                case "8":
                    return "Salinity Program";
                case "9":
                    return "319 Program";
                case "10":
                    return "The Nature Conservancy";
                case "11":
                    return "ARDL";
                case "12":
                    return "Other";
                case "13":
                    return "US Forest Service";
                case "14":
                    return "UDAF";
                case "15":
                    return "State of Utah";
                case "16":
                    return "USFWS Partners for Fish and Wildlife";
                case "17":
                    return "WRI";
                case "18":
                    return "County";
                case "19":
                    return "City";
                default:
                    return null;
            }
        }
    }
}