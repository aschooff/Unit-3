window.onload = function(){

    var w = 900; //width
    var h = 500; //height

    var container = d3.select("body") //get the <body> element from the DOM
    .append("svg") //put a new svg in the body
    .attr("width", w) //assign the width
    .attr("height", h) //assign the height
    .attr("class", "container") //always assign a class (as the block name) for styling and future selection
    .style("background-color", "rgba(0,0,0,0.2)");

    var innerRect = container.append("rect")
        .datum(400) //a single value is a DATUM
        .attr("width", function(d){ //rectangle width
            return d * 2; //400 * 2 = 800
        })
        .attr("height", function(d){ //rectangle height
            return d; //400
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#FFFFFF"); //fill color

    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

     var x = d3.scaleLinear() //create the scale
        .range([90, 810]) //output min and max
        .domain([0, 3.25]); //input min and max

     //find the minimum value of the array
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    //find the maximum value of the array
    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    //scale for circles center y coordinate
    var y = d3.scaleLinear()
        .range([450, 50]) //was 440, 95
        .domain([0, 700000]); //was minPop, maxPop

     //color scale generator 
    var color = d3.scaleLinear()
        .range([
            "#FDBE85",
            "#D94701"
        ])
        .domain([
            minPop, 
            maxPop
        ]);

    var circles = container.selectAll(".circles")
    .data(cityPop)
    .enter()
    .append("circle")
    .attr("class", "circles")
    .attr("id", function(d){
        return d.city;
    })
    .attr("r", function(d){
        var area = d.population * 0.01;
        return Math.sqrt(area/Math.PI);
    })
    .attr("cx", function(d, i){
        return x(i);
    })
    .attr("cy", function(d){
        return y(d.population);
    })
    .style("fill", function(d){
        return color(d.population);
    })
    .style("stroke", "#000");
 //black circle stroke

    var yAxis = d3.axisLeft(y);

    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);

    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");

    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.population);
        });

    //first line of label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        });

    var format = d3.format(",");

    //second line of label
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15") //vertical offset
        .text(function(d){
            return "Pop. " + d.population;
        });
};