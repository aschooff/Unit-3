
// main.js
(function(){
// global variable declaration
var attrArray = [
    "PCT_WHITE","PCT_BLACK","PCT_HISPANIC",
    "PCT_ASIAN","PCT_AMINDIAN","PCT_PISLAND","PCT_OTHER"
];
var expressed = "PCT_WHITE";
var csvDataGlobal;
let globalColorScale;

// Use Promise.all to parallelize asynchronous data loading
window.onload = setMap;

// Set up choropleth map
function setMap(){

    var width = window.innerWidth * 0.25,
        height = window.innerHeight * 0.8;

    // SVG container
    window.map = d3.select("#mapContainer")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // Get actual width and height of the map container
    var width = document.getElementById("mapContainer").clientWidth;
    var height = document.getElementById("mapContainer").clientHeight;

    // Define Albers equal-area conic projection centered on Janesville
    window.projection = d3.geoAlbers()
        .center([0, 42.6828])
        .rotate([89.0187, 0])
        .parallels([43, 62])
        .scale(150000)
        .translate([width / 2, height / 2]);

    window.path = d3.geoPath().projection(projection);

    // Load data asynchronously
    var promises = [
        d3.csv("data/CSVdemogData.csv"),
        d3.json("data/JanesvilleDemog2020L3.topojson")
    ];
    // Use Promise.all to wait for both files to load before proceeding
    Promise.all(promises).then(callback);
}

// Callback function after data loads
function callback(data){

    var csvData = data[0];
    var topo = data[1];

    // add percentage fields to each CSV row
    csvData.forEach(function(row){
        var persons  = parseFloat(row.PERSONS);
        var white    = parseFloat(row.WHITE);
        var black    = parseFloat(row.BLACK);
        var hispanic = parseFloat(row.HISPANIC);
        var asian    = parseFloat(row.ASIAN);
        var amindian = parseFloat(row.AMINDIAN);
        var pisland  = parseFloat(row.PISLAND);
        var other    = parseFloat(row.OTHER);

        row.PCT_WHITE    = white    / persons * 100;
        row.PCT_BLACK    = black    / persons * 100;
        row.PCT_HISPANIC = hispanic / persons * 100;
        row.PCT_ASIAN    = asian    / persons * 100;
        row.PCT_AMINDIAN = amindian / persons * 100;
        row.PCT_PISLAND  = pisland  / persons * 100;
        row.PCT_OTHER    = other    / persons * 100;
    });

    // store CSV globally
    csvDataGlobal = csvData;

    // convert topojson → geojson
    var WardsJanesville = processTopo(topo);

    // join CSV attributes into GeoJSON properties
    joinData(WardsJanesville, csvDataGlobal);

    // set default attribute that will be visualized
    expressed = "PCT_WHITE";

    // build the color scale
    globalColorScale = makeColorScale(csvDataGlobal);

    // create the legend, map, and chart
    createLegend(globalColorScale);
    drawMap(WardsJanesville, globalColorScale);
    setChart(csvDataGlobal, globalColorScale);
}

// Convert TopoJSON → GeoJSON
function processTopo(topo){
    return topojson.feature(
        topo,
        topo.objects.WI_20022010_El_FeaturesToJSO
    );
}

// Join CSV → GeoJSON
function joinData(geojson, csvData){
    // Iterate through CSV to assign each row's data to the corresponding geojson feature
    csvData.forEach(function(csvRow){
        var csvKey = csvRow.STR_WARDS;

        // Iterate through geojson features to find correct match for CSV data
        geojson.features.forEach(function(feature){
            var props = feature.properties;
            var geoKey = props.STR_WARDS;

            if (csvKey === geoKey){

                // copy raw census values from CSV
                props.PERSONS  = parseFloat(csvRow.PERSONS);
                props.WHITE    = parseFloat(csvRow.WHITE);
                props.BLACK    = parseFloat(csvRow.BLACK);
                props.HISPANIC = parseFloat(csvRow.HISPANIC);
                props.ASIAN    = parseFloat(csvRow.ASIAN);
                props.AMINDIAN = parseFloat(csvRow.AMINDIAN);
                props.PISLAND  = parseFloat(csvRow.PISLAND);
                props.OTHER    = parseFloat(csvRow.OTHER);

                // compute percentages of total population
                props.PCT_WHITE    = props.WHITE    / props.PERSONS * 100;
                props.PCT_BLACK    = props.BLACK    / props.PERSONS * 100;
                props.PCT_HISPANIC = props.HISPANIC / props.PERSONS * 100;
                props.PCT_ASIAN    = props.ASIAN    / props.PERSONS * 100;
                props.PCT_AMINDIAN = props.AMINDIAN / props.PERSONS * 100;
                props.PCT_PISLAND  = props.PISLAND  / props.PERSONS * 100;
                props.PCT_OTHER    = props.OTHER    / props.PERSONS * 100;
            }
        });
    });
    // Log the joined properties of the first feature to verify the join worked
    console.log("Joined properties:", geojson.features[0].properties);
}

// Create dropdown menu for attribute selection
function createDropdown() {

    // Create dropdown menu
    var dropdown = d3.select("#dropdownContainer")
        .append("select")
        .attr("id", "attributeSelect")
        .on("change", function() {
            expressed = this.value;

            // Update color scale based on new attribute
            globalColorScale = makeColorScale(csvDataGlobal);

            updateChoropleth();
            updateChart();
            createLegend(globalColorScale);
        });
    // Add options to dropdown
    dropdown.selectAll("option")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d.replace("PCT_", ""));
}

// Update choropleth colors based on new attribute
function updateChoropleth() {

    d3.selectAll(".ward")
        .transition()
        .duration(750)
        // Update fill color based on new attribute value
        .style("fill", function(d){
            var val = d.properties[expressed];
            return (!isNaN(val)) ? globalColorScale(val) : "#ccc";
        });

}

// Update bar chart based on new attribute
function updateChart() {
    // Get actual width and height of the chart container
    const container = document.getElementById("chartContainer");
    const containerWidth  = container.clientWidth;
    const containerHeight = container.clientHeight;
    // Define margins for the chart
    const margin = { top: 50, right: 10, bottom: 30, left: 10 };

    const chartWidth  = containerWidth  - margin.left - margin.right;
    const chartHeight = containerHeight - margin.top  - margin.bottom;

    //y-scale
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(csvDataGlobal, d => d[expressed])])
        .range([chartHeight, 0]);

    // Sort data by the new expressed attribute
    const sortedData = [...csvDataGlobal].sort((a, b) => a[expressed] - b[expressed]);

    // Update x-scale with new sorting
    const xScale = d3.scaleBand()
        .domain(sortedData.map(d => d.STR_WARDS))
        .range([0, chartWidth])
        .paddingInner(0.1)
        .paddingOuter(0.05);

    // Update bars
    d3.selectAll(".bars")
        .data(sortedData, d => d.STR_WARDS)
        .attr("class", d => "bars ward-" + d.STR_WARDS)
        .transition()
        .duration(750)
        .attr("x", d => xScale(d.STR_WARDS))
        .attr("width", xScale.bandwidth())
        .attr("y", d => yScale(d[expressed]))
        .attr("height", d => chartHeight - yScale(d[expressed]))   // FIXED
        .style("fill", d => globalColorScale(d[expressed]));

    // Update labels
    d3.selectAll(".numbers")
        .data(sortedData, d => d.STR_WARDS)
        .attr("class", d => "numbers label-" + d.STR_WARDS)

        .transition()
        .duration(750)
        .attr("x", d => xScale(d.STR_WARDS) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d[expressed]) - 5)
        .text(d => d[expressed].toFixed(2));

    // Update title
    d3.select(".chartTitle")
        .text("Percent of Population Identifying as " + expressed.replace("PCT_", "") + " by Ward");
}

// Build color scale for the expressed attribute
function makeColorScale(csvData){

        // Define color classes
    var colorClasses = [
        "#f3eef7",
        "#d5b2fa",
        "#b069f6",
        "#9840dc",
        "#7129c4"
    ];
    // Create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    // Build array of all values of the expressed attribute
    var domainArray = [];
    csvData.forEach(function(row){
        var val = parseFloat(row[expressed]);
        if (!isNaN(val)) domainArray.push(val);
    });
    // Set color scale domain based on array of expressed values
    colorScale.domain(domainArray);
    return colorScale;
}

// Create legend based on color scale
function createLegend(colorScale) {

    // Clear existing legend
    d3.select("#legendContainer").selectAll("*").remove();

    const legendWidth = 360;
    const legendHeight = 100;

    // Create SVG for legend
    const legendSvg = d3.select("#legendContainer")
        .append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("class", "legend");

    const colors = colorScale.range();

    // Get the break values for the legend labels (5 breaks)
    const breaks = [colorScale.domain()[0], ...colorScale.quantiles()];

    // Draw color boxes (5 boxes)
    legendSvg.selectAll("rect")
        .data(colors)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * 70)
        .attr("y", 20)
        .attr("width", 70)
        .attr("height", 40)
        .style("fill", d => d);

    // Draw labels (5 labels)
    legendSvg.selectAll("text")
        .data(breaks)
        .enter()
        .append("text")
        .attr("x", (d, i) => i * 70)
        .attr("y", 15)
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#222")
        .text(d => d.toFixed(1) + "%");
}

// Update legend labels based on new color scale
function updateLegend(colorScale) {
    // Get the break values for the legend labels (5 breaks)
    var breaks = colorScale.quantiles();

    var legendSvg = d3.select(".legend");

    // Update labels
    legendSvg.selectAll("text")
        .data(breaks)
        .text(d => d.toFixed(1) + "%");
}

// Draw the map + apply choropleth fill
function drawMap(geojson, colorScale){
    // Add wards to map
    map.selectAll(".ward")
    .data(geojson.features)
    .enter()
    .append("path")
    .attr("class", d => "ward ward-" + d.properties.STR_WARDS)
    .attr("d", path)
    // Set fill color based on expressed attribute value
    .style("fill", function(d){
        var val = d.properties[expressed];
        return (val != null && !isNaN(val)) ? globalColorScale(val) : "#ccc";
    })
    .on("mouseover", function(event, d){
        highlight(d.properties);
    })
    .on("mouseout", function(event, d){
        dehighlight(d.properties);
    })
    .on("mousemove", function(event, d){
        d3.select(".infoLabel")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 30) + "px");
    });

}

// Set up bar chart
function setChart(csvData, colorScale) {
    createDropdown();
    // set dimensions for the chart
    const margin = { top: 50, right: 10, bottom: 30, left: 10 };

    const container = document.getElementById("chartContainer");
    const containerWidth  = container.clientWidth;
    const containerHeight = container.clientHeight;  
    // Calculate chart width and height based on container dimensions
    const chartWidth  = containerWidth  - margin.left - margin.right;
    const chartHeight = containerHeight - margin.top  - margin.bottom;
    // Define y-scale for the chart
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(csvData, d => d[expressed])])
        .range([chartHeight, 0]); 
    // Create SVG container for the chart
    const svg = d3.select("#chartContainer")
        .append("svg")
        .attr("width",  containerWidth)
        .attr("height", containerHeight);
    // Create group element for the chart and apply margins
    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // Calculate bar width based on number of data points and chart width
    const barWidth = chartWidth / csvData.length;
    // Sort data by the expressed attribute for proper bar ordering
    const bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        //.sort((a, b) => a[expressed] - b[expressed])
        .attr("class", d => "bars ward-" + d.STR_WARDS)
        .attr("width", barWidth - 1)
        .attr("x", (d, i) => i * barWidth)
        .attr("y", d => yScale(d[expressed]))
        .attr("height", d => chartHeight - yScale(d[expressed]))
        .style("fill", d => colorScale(d[expressed]))
        .on("mouseover", function(event, d){
             highlight(d);
        })
        .on("mouseout", function(event, d){
            dehighlight(d);
        })
        .on("mousemove", function(event, d){
            d3.select(".infoLabel")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px");
    });
    // Add labels on top of bars
    const numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        //.sort((a, b) => a[expressed] - b[expressed])
        .attr("class", d => "numbers " + d.STR_WARDS)
        .attr("text-anchor", "middle")
        .attr("x", (d, i) => i * barWidth + barWidth / 2)
        .attr("y", d => yScale(d[expressed]) - 5)
        .style("fill", "#222")
        .text(d => d[expressed].toFixed(1));
    // Add chart title
    chart.append("text")
        .attr("x", 20)
        .attr("y", -10)
        .attr("class", "chartTitle")
        .text("Percent of Population Identifying as " + expressed.replace("PCT_", "") + " by Ward");

        updateChart();
 }

// Highlight feature on hover
function highlight(props) {

    // Determine if props is from map (has .properties) or chart (no .properties)
    const p = props.properties ? props.properties : props;
    // Highlight the corresponding ward on the map
    d3.selectAll(".ward-" + p.STR_WARDS)
        .style("stroke", "yellow")
        .style("stroke-width", "3px")
        .style("paint-order", "stroke fill");

    //
    setLabel(p);
}

// Reset highlight on mouseout
function dehighlight(props) {
    // Determine if props is from map (has .properties) or chart (no .properties)
    const p = props.properties ? props.properties : props;
    // Reset the corresponding ward's styling on the map
    d3.selectAll(".ward-" + p.STR_WARDS)
        .style("stroke", "none")
        .style("stroke-width", "0px")
        .style("fill", function(d) {
            const val = d.properties[expressed];
            return !isNaN(val) ? globalColorScale(val) : "#ccc";
        });
    // Remove the info label
    d3.select(".infoLabel").remove();
}


// Set up info label content and position
function setLabel(props) {
    // Remove any existing label
    d3.select(".infoLabel").remove();  // remove old popup
    // Create label content based on the expressed attribute value
    var labelAttribute = expressed.replace("PCT_", "") + ": " + props[expressed].toFixed(1) + "%";
    // Add ward name to label content
    d3.select("body")
        .append("div")
        .attr("class", "infoLabel")
        .html("<b>Ward " + props.STR_WARDS + "</b><br>" + labelAttribute);
}

})();   // END IIFE