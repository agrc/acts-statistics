namespace ACTS.Statistics.API.Models.Database
{
    public class Practices
    {
        public string Component { get; set; }
        public string Name { get; set; }

        public override string ToString()
        {
            return string.Format("{0} - {1}", Name, Component);
        }
    }
}