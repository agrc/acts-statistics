using System.Net.Http.Formatting;
using Newtonsoft.Json;

namespace ACTS.Statistics.API
{
    public class FormatterConfig
    {
        public static void RegisterFormatters(MediaTypeFormatterCollection formatters)
        {
            formatters.Remove(formatters.XmlFormatter);

            var json = formatters.JsonFormatter;
            json.SerializerSettings.NullValueHandling = NullValueHandling.Ignore;
        }
    }
}