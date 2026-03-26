//begin script when window loads
window.onload = setMap;

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on Janesville
    var projection = d3.geoAlbers()
        .center([0, 42.6828])          // latitude only
        .rotate([89.0187, 0])          // -longitude
        .parallels([43, 62])
        .scale(150000)
        .translate([width / 2, height / 2]);


    var path = d3.geoPath()
        .projection(projection);


    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/CSVdemogData.csv"),                    
                    d3.json("data/JanesvilleDemog2020L3.topojson")                 
                    ];    
    Promise.all(promises).then(callback);

    function callback(data){
        var csvData = data[0];
        var janesville = data[1];
        //translate janesville TopoJSON
        console.log(janesville);
        console.log(csvData);

        var WardsJanesville = topojson.feature(
        janesville,
        janesville.objects.WI_20022010_El_FeaturesToJSO
);


        var wards = map.selectAll(".ward")
            .data(WardsJanesville.features)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "ward " + d.properties.WARD;
            })
            .attr("d", path);
    };
};