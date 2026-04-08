(function(){

// ----------------------------------------------------
// 1. PSEUDO‑GLOBAL VARIABLES
// ----------------------------------------------------
var attrArray = [
    "PERSONS","WHITE","BLACK","HISPANIC",
    "ASIAN","AMINDIAN","PISLAND","OTHER"
];

var expressed = attrArray[0];   // initial attribute


// ----------------------------------------------------
// 2. RUN SCRIPT WHEN WINDOW LOADS
// ----------------------------------------------------
window.onload = setMap;


// ----------------------------------------------------
// 3. MAIN MAP FUNCTION
// ----------------------------------------------------
function setMap(){

    var width = window.innerWidth * 0.475,
        height = window.innerHeight * 0.9;

    // SVG container
    window.map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // Projection
    window.projection = d3.geoAlbers()
        .center([0, 42.6828])
        .rotate([89.0187, 0])
        .parallels([43, 62])
        .scale(150000)
        .translate([width / 2, height / 2]);

    window.path = d3.geoPath().projection(projection);

    // Load data
    var promises = [
        d3.csv("data/CSVdemogData.csv"),
        d3.json("data/JanesvilleDemog2020L3.topojson")
    ];

    Promise.all(promises).then(callback);
}


// ----------------------------------------------------
// 4. CALLBACK FUNCTION
// ----------------------------------------------------
function callback(data){

    var csvData = data[0];
    var topo = data[1];

    var WardsJanesville = processTopo(topo);
    joinData(WardsJanesville, csvData);

    var colorScale = makeColorScale(csvData);

    drawMap(WardsJanesville, colorScale);
    setChart(csvData, colorScale);
}


// ----------------------------------------------------
// 5. SUPPORTING FUNCTIONS
// ----------------------------------------------------

// Convert TopoJSON → GeoJSON
function processTopo(topo){
    return topojson.feature(
        topo,
        topo.objects.WI_20022010_El_FeaturesToJSO
    );
}


// Join CSV → GeoJSON
function joinData(geojson, csvData){

    csvData.forEach(function(csvRow){
        var csvKey = csvRow.STR_WARDS;

        geojson.features.forEach(function(feature){
            var props = feature.properties;
            var geoKey = props.STR_WARDS;

            if (csvKey === geoKey){
                attrArray.forEach(function(attr){
                    props[attr] = parseFloat(csvRow[attr]);
                });
            }
        });
    });

    console.log("Joined properties:", geojson.features[0].properties);
}


// Build color scale for the expressed attribute
function makeColorScale(csvData){

    var colorClasses = [ //This scale will be changed later; these colors are just placeholders until I decide on a color scheme
        "#f7fbff",
        "#c6dbef",
        "#6baed6",
        "#3182bd",
        "#08519c"
    ];

    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    var domainArray = [];
    csvData.forEach(function(row){
        var val = parseFloat(row[expressed]);
        if (!isNaN(val)) domainArray.push(val);
    });

    colorScale.domain(domainArray);

    return colorScale;
}


// Draw the map + apply choropleth fill
function drawMap(geojson, colorScale){

    map.selectAll(".ward")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("class", d => "ward " + d.properties.STR_WARDS)
        .attr("d", path)
        .style("fill", function(d){
            var val = d.properties[expressed];
            return (val != null && !isNaN(val)) ? colorScale(val) : "#ccc";
        });
}


// ----------------------------------------------------
// 6. COORDINATED BAR CHART
// ----------------------------------------------------
function setChart(csvData, colorScale){

    var chartWidth = 790,
        chartHeight = window.innerHeight * 0.9

    // Create chart SVG
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    // Create bars (sorted, classed, colored)
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed] - b[expressed];
        })
        .attr("class", function(d){
            return "bars " + d.STR_WARDS; 
        })
        .attr("width", chartWidth / csvData.length - 2)
        .attr("height", function(d){
            return d[expressed] / 10; 
        })
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("y", function(d){
            return chartHeight - d[expressed] / 10;
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

        var numbers = chart.selectAll(".numbers")
    .data(csvData)
    .enter()
    .append("text")
    .sort(function(a, b){
        return a[expressed] - b[expressed];
    })
    .attr("class", function(d){
        return "numbers " + d.STR_WARDS;
    })
    .attr("text-anchor", "middle")
    .attr("x", function(d, i){
        var fraction = chartWidth / csvData.length;
        return i * fraction + (fraction - 1) / 2;
    })
    .attr("y", function(d){
        return chartHeight - (d[expressed] / 10) + 15; 
    })
    .text(function(d){
        return d[expressed];
    });

        var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of People Identifying as " + expressed[3] + " in each region");
}

})();   // END IIFE