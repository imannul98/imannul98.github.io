// based on https://pudding.cool/process/introducing-scrollama/
// using d3 for convenience
let main = d3.select("main");
let scrolly = main.select("#scrolly");
let svg = scrolly.select("svg");
let article = scrolly.select("article");
let step = article.selectAll(".step");

// initialize the scrollama
let scroller = scrollama();

function clearSvg() {
    svg.selectAll("*").remove();
}

function loadData() {
    return new Promise((resolve, reject) => {
        d3.csv("state_crime.csv")
            .then(csvData => {
                // Filter data for Georgia
                const georgiaData = csvData.filter(d => d.State === "Georgia");
                const processedData = d3.rollup(georgiaData, 
                    v => d3.mean(v, d => +d['Data.Rates.Property.All']), 
                    d => d.Year
                );
                // Convert the rollup map to an array suitable for drawing
                const dataArray = Array.from(processedData, ([year, value]) => ({year, value}));
                resolve(dataArray);
            })
            .catch(error => reject(error));
    });
}

function loadData1() {
    return new Promise((resolve, reject) => {
        d3.csv("state_crime.csv")
            .then(csvData => {
                // Filter data for Georgia
                const georgiaData = csvData.filter(d => d.State === "Georgia");
                const processedData = d3.rollup(georgiaData, 
                    v => d3.mean(v, d => +d['Data.Rates.Violent.All']), 
                    d => d.Year
                );
                // Convert the rollup map to an array suitable for drawing
                const dataArray = Array.from(processedData, ([year, value]) => ({year, value}));
                resolve(dataArray);
            })
            .catch(error => reject(error));
    });
}

function loadDataScatter() {
    return new Promise((resolve, reject) => {
        d3.csv("state_crime.csv", d => {
            // Convert numerical data and filter by year within the parsing function
            if (d.Year == 2019 && d.State !== 'United States') {  // Assuming the Year column is a string
                return {
                    State: d.State,
                    PropertyRate: +d['Data.Rates.Property.All'],
                    ViolentRate: +d['Data.Rates.Violent.All']
                };
            }
        }).then(data => {
            // The filter inside d3.csv might leave undefined entries; filter them out
            const filteredData = data.filter(d => d != null);
            resolve(filteredData);
        }).catch(error => {
            reject(error);
        });
    });
}


// Function to draw a line chart
function drawLineChart(lineChartSvg, data, color) {
    clearSvg();
    let margin = {top: 30, right: 30, bottom: 60, left: 60},
        width = +svg.style("width").replace("px", "") - margin.left - margin.right,
        height = +svg.style("height").replace("px", "") - margin.top - margin.bottom;

    let lineChart = lineChartSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    lineChart.insert("rect", ":first-child")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", '#fafafa');

    // Create the tooltip
    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Define the scales
    let xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d3.timeParse("%Y")(d.year)))
        .range([0, width]);

    let yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([height, 0]);

    lineChart.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2 +50)
        .style("font-size", "12px")
        .text("Total Average Crime Rate");

    // Append the X-axis
    lineChart.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(data.length).tickFormat(d3.timeFormat("%Y")))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", "1em")
        .attr("transform", "rotate(-45)");
    
    lineChart.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom * 0.7})`)
        .style("font-size", "12px")
        .text("Year");
        
    lineChart.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2) // Adjust this to move the title within or above the top margin
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Property Crime Rate in Georgia");

    // Append the Y-axis
    lineChart.append("g")
        .call(d3.axisLeft(yScale));

    // Define the line generator
    let line = d3.line()
        .x(d => xScale(d3.timeParse("%Y")(d.year)))
        .y(d => yScale(d.value));

    // Draw the line
    lineChart.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Append circles for interaction
    lineChart.selectAll(".data-point")
        .data(data)
        .enter().append("circle")
        .attr("class", "data-point")
        .attr("cx", d => xScale(d3.timeParse("%Y")(d.year)))
        .attr("cy", d => yScale(d.value))
        .attr("r", 5)
        .attr("fill", color)
        .attr("opacity",0)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Year: ${d.year}<br>Rate: ${d.value.toFixed(2)}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}


function drawScatterplot(svg, data) {
    // Setup dimensions and margins
    let margin = {top: 30, right: 30, bottom: 60, left: 60},
        width = +svg.style("width").replace("px", "") - margin.left - margin.right,
        height = +svg.style("height").replace("px", "") - margin.top - margin.bottom;

    // Clear previous SVG content if any
    clearSvg();

    // Create a group element for appending chart elements
    const chart = svg.append("g")
                     .attr("transform", `translate(${margin.left}, ${margin.top})`);

    chart.insert("rect", ":first-child")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", '#fafafa');

    // Create scales
    let xMax = d3.max(data.map(d => +d.PropertyRate))
    const x = d3.scaleLinear()
                .domain([0, xMax])
                .range([0, width]);

    x.domain(d3.extent(data, d => +d.PropertyRate))
        .range([0, width])
        .nice();
    
    let yMax = d3.max(data.map(d => +d.ViolentRate))
    let yMin = d3.min(data.map(d => +d.ViolentRate))

    const y = d3.scaleLinear()
                .domain([yMin, yMax])
                .range([height, 0]);
    y.domain(d3.extent(data, d => +d.ViolentRate))
        .range([height, 0])
        .nice();
    console.log("Property Rate Domain:", [0, xMax]);
    console.log("Violent Rate Domain:", [yMin, yMax]);

    let xAxisGroup = chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    let yAxisGroup = chart.append("g")
        .call(d3.axisLeft(y));

    xAxisGroup.append("text")
        .attr("class", "my-axis-label")
        .attr("x", width / 2)
        .attr("y", 40) 
        .style("text-anchor", "middle")
        .attr('fill', 'black')
        .text("Property Crime Rate");

    // Add Y axis
    yAxisGroup.append("text")
        .attr("class", "my-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr('fill', 'black')
        .attr('font-size', 10)
        .text("Violent Crime Rate");

    // Add dots
    chart.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr('class', 'myCircles')
        .attr("cx", d => x(+d.PropertyRate))
        .attr("cy", d => y(+d.ViolentRate))
        .attr("r", 4)
        .style("fill", "#69b3a2");

    // Add labels
    chart.selectAll("text.label")
     .data(data)
     .enter()
     .append("text")
     .attr("class", "label")
     .attr("x", d => x(d.PropertyRate))
     .attr("y", d => y(d.ViolentRate))
     .text(d => d.State)
     .style("font-size", "10px")
     .attr("dx", "5px") 
     .attr("dy", "-5px");
    chart.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top / 2) 
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Violent & Property Crime Rate of All States in 2019");

    console.log("Text elements created:", chart.selectAll("text.label").size());
}

function updateScatterplot() {
    d3.select('.scatterGroup')
        .transition()
        .duration(1000)
        .attr('transform', 'translate(' + 1000 + ',' + 0 + ')')

}


function highlightGeorgia(svg) {
    // Highlight the circle for Georgia
    svg.selectAll("circle")
       .transition()
       .duration(1000)
       .attr("r", d => d.State === "Georgia" ? 8 : 4)
       .style("fill", d => d.State === "Georgia" ? "#ff6347" : "grey")
       .style("opacity", d => d.State === "Georgia" ? 1 :0.5);
    console.log("Text labels count:", svg.selectAll("text-label").size());

    // Fade other labels and emphasize Georgia
    svg.selectAll("text.label")
   .transition()
   .duration(1000)
   .attr("opacity", d => {
       console.log("Label Transitioning:", d.State, d);
       return d.State === "Georgia" ? 1 : 0.2;
   })
   .style("font-size", d => d.State === "Georgia" ? "16px" : "10px");
}

function resetGeorgiaHighlight(svg) {
    // Reset styles for all circles
    svg.selectAll("circle")
       .transition()
       .duration(1000)
       .attr("r", 4)
       .style("fill", "#69b3a2");

    // Reset label styles
    svg.selectAll("text.label")
       .transition()
       .duration(1000)
       .attr("opacity", 1)
       .style("font-size", "12px");
}



// generic window resize listener event
function handleResize() {
    // 1. update height of step elements
    let stepH = Math.floor(window.innerHeight * 0.75);
    step.style("height", stepH + "px");
    /* ------------------- initialize your charts and groups here ------------------ */
    let svgHeight = window.innerHeight * 0.5;
    let svgMarginTop = (window.innerHeight - svgHeight) / 2;
    
    
    svg
        .style("height", svgHeight)
        .style("top", svgMarginTop);


    svg.append('text')
        .attr('id', 'title-index')
        .attr('transform', 'translate(' + 100 + ',' + 200 + ')')
        .style('font-size', 50)

    scroller.resize();
}

// scrollama event handlers
function handleStepEnter(response) {
    console.log(response);
    // response = { element, direction, index }

    // add color to current step only
    step.classed("is-active", function (d, i) {
        return i === response.index;
    });

    switch (response.index) {
        case 0:
            setTimeout(() => { // Timeout to allow clear transition to complete
                loadData().then(georgiaData => {
                    const georgiaColor = "#8da0cb"; // Example color
                    let lineChartSvg = d3.select("svg");
                    drawLineChart(lineChartSvg, georgiaData, georgiaColor);
                    drawLineChartWithHighlights(lineChartSvg,georgiaData,georgiaColor);
                }).catch(error => {
                    console.error("Failed to load or process the data:", error);
                });
            }, 500);
            break;
            case 1: // Assuming step 2 is for the scatterplot
            loadData1().then(georgiaData => {
                    const georgiaColor = "#8da0cb"; // Example color
                    let lineChartSvg1 = d3.select("svg");
                    drawLineChart1(lineChartSvg1, georgiaData, georgiaColor);
                    drawLineChartWithHighlights2(lineChartSvg1,georgiaData,georgiaColor);
                }).catch(error => {
                    console.error("Failed to load or process the data:", error);
                });
            break;
            case 2: // Assuming step 2 is for the scatterplot
                loadDataScatter().then(scatterData => {
                let scatterSvg = d3.select("svg");
                if (scatterSvg.empty()==false) {
                    resetGeorgiaHighlight(scatterSvg);
                }
                drawScatterplot(scatterSvg, scatterData);
            }).catch(error => {
                console.error("Failed to load or process the data:", error);
            });
            break;
        case 3: // Highlight Georgia in the scatterplot
            loadDataScatter().then(scatterData => {
                let scatterSvg = d3.select("svg");
                if (scatterSvg.empty()) {
                    drawScatterplot(scatterSvg, scatterData);
                }
                highlightGeorgia(scatterSvg);
            }).catch(error => {
                console.error("Failed to load or process the data:", error);
            });
            break;
        default:
            break;
    }
}

function init() {
    // 1. force a resize on load to ensure proper dimensions are sent to scrollama
    handleResize();

    // 2. setup the scroller passing options
    // 		this will also initialize trigger observations
    // 3. bind scrollama event handlers (this can be chained like below)
    scroller
        .setup({
            step: "#scrolly article .step",
            offset: 0.33,
            debug: false
        })
        .onStepEnter(handleStepEnter);


    // setup resize event
    window.addEventListener('resize', handleResize);
}




// kick things off
init();


function clearChartWithTransition() {
    let svg = d3.select('svg');
    // Transition out existing elements
    svg.selectAll('*')
        .transition()
        .duration(500) // 500ms transition
        .style('opacity', 0) // Fade out
        .remove(); // Then remove from DOM
}


function drawLineChartWithHighlights(lineChartSvg, data, color) {
    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Setup chart dimensions and margins
    let margin = {top: 30, right: 30, bottom: 60, left: 60},
        width = +lineChartSvg.style("width").replace("px", "") - margin.left - margin.right,
        height = +lineChartSvg.style("height").replace("px", "") - margin.top - margin.bottom;

    let lineChart = lineChartSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define scales
    let xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d3.timeParse("%Y")(d.year)))
        .range([0, width]);

    let yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([height, 0]);

    // Find the maximum data point
    const maxData = data.reduce((max, d) => d.value > max.value ? d : max, {value: -Infinity, year: -Infinity});
    const maxYear = maxData.year;
    console.log(maxYear)

    // Filter data to create two segments
    let dataBeforeMax = data.filter(d => d.year <= maxYear);
    let dataFromMax = data.filter(d => d.year >= maxYear);

    // Define the line generator
    let line = d3.line()
        .x(d => xScale(d3.timeParse("%Y")(d.year)))
        .y(d => yScale(d.value));

    // Draw line for the data
    let path = lineChart.append("path")
        .datum(dataBeforeMax)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Calculate the length of the path
    let totalLength = path.node().getTotalLength();

    // Animate the path
    path.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()  // Transition to make the line appear over time
        .duration(2000)  // Duration of the animation in milliseconds
        .attr("stroke-dashoffset", 0)
        .on("end", () => {
            // This function will be called when the transition is complete
            // Find the data point for 1989
            let data1989 = data.find(d => d.year === "1989");
            console.log(data1989)
            if (data1989) {
                // Append a text label at the data point for 1989
                let label=lineChart.append("text")
                    .attr("x", xScale(d3.timeParse("%Y")(data1989.year)))
                    .attr("y", yScale(data1989.value)) 
                    .attr("text-anchor", "middle") 
                    .style("fill", "black")
                    .style("font-size", "14px")

                label.append("tspan")
                    .attr("x", xScale(d3.timeParse("%Y")(data1989.year))) // Reset x position for tspan
                    .attr("dy", "20px") // Position above the point, adjust as needed
                    .text(`Year: ${data1989.year}`);
            
                // Append the rate as the second line
                label.append("tspan")
                    .attr("x", xScale(d3.timeParse("%Y")(data1989.year))) // Ensure alignment
                    .attr("dy", "20px") // Move to the next line, adjust positioning
                    .text(`Rate: ${data1989.value.toFixed(2)}`);
            }
        });

    // Optionally, add points along the line
    lineChart.selectAll(".data-point")
        .data(dataFromMax)
        .enter().append("circle")
        .attr("class", "data-point")
        .attr("cx", d => xScale(d3.timeParse("%Y")(d.year)))
        .attr("cy", d => yScale(d.value))
        .attr("r", 5)
        .attr("fill", color)
        .attr("opacity",0)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Year: ${d.year}<br>Rate: ${d.value.toFixed(2)}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

function drawLineChartWithHighlights2(lineChartSvg, data, color) {
    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Setup chart dimensions and margins
    let margin = {top: 30, right: 30, bottom: 60, left: 60},
        width = +lineChartSvg.style("width").replace("px", "") - margin.left - margin.right,
        height = +lineChartSvg.style("height").replace("px", "") - margin.top - margin.bottom;

    let lineChart1 = lineChartSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define scales
    let xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d3.timeParse("%Y")(d.year)))
        .range([0, width]);

    let yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([height, 0]);

    // Find the maximum data point
    const maxData = data.reduce((max, d) => d.value > max.value ? d : max, {value: -Infinity, year: -Infinity});
    const maxYear = maxData.year;
    console.log(maxYear)

    // Filter data to create two segments
    let dataBeforeMax = data.filter(d => d.year <= maxYear);
    let dataFromMax = data.filter(d => d.year >= maxYear);

    // Define the line generator
    let line = d3.line()
        .x(d => xScale(d3.timeParse("%Y")(d.year)))
        .y(d => yScale(d.value));

    // Draw line for the data
    let path = lineChart1.append("path")
        .datum(dataBeforeMax)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Calculate the length of the path
    let totalLength = path.node().getTotalLength();

    // Animate the path
    path.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()  // Transition to make the line appear over time
        .duration(2000)  // Duration of the animation in milliseconds
        .attr("stroke-dashoffset", 0)
        .on("end", () => {
            // This function will be called when the transition is complete
            // Find the data point for 1989
            let data1989 = data.find(d => d.year === "1990");
            console.log(data1989)
            if (data1989) {
                // Append a text label at the data point for 1989
                let label=lineChart1.append("text")
                    .attr("x", xScale(d3.timeParse("%Y")(data1989.year)))
                    .attr("y", yScale(data1989.value)) 
                    .attr("text-anchor", "middle") 
                    .style("fill", "black")
                    .style("font-size", "14px")

                label.append("tspan")
                    .attr("x", xScale(d3.timeParse("%Y")(data1989.year))) // Reset x position for tspan
                    .attr("dy", "20px") // Position above the point, adjust as needed
                    .text(`Year: ${data1989.year}`);
            
                // Append the rate as the second line
                label.append("tspan")
                    .attr("x", xScale(d3.timeParse("%Y")(data1989.year))) // Ensure alignment
                    .attr("dy", "20px") // Move to the next line, adjust positioning
                    .text(`Rate: ${data1989.value.toFixed(2)}`);
            }
        });

    // Optionally, add points along the line
    lineChart1.selectAll(".data-point")
        .data(dataFromMax)
        .enter().append("circle")
        .attr("class", "data-point")
        .attr("cx", d => xScale(d3.timeParse("%Y")(d.year)))
        .attr("cy", d => yScale(d.value))
        .attr("r", 5)
        .attr("fill", color)
        .attr("opacity",0)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Year: ${d.year}<br>Rate: ${d.value.toFixed(2)}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}


// Function to draw a line chart
function drawLineChart1(lineChartSvg, data, color) {
    clearSvg();
    let margin = {top: 30, right: 30, bottom: 60, left: 60},
        width = +svg.style("width").replace("px", "") - margin.left - margin.right,
        height = +svg.style("height").replace("px", "") - margin.top - margin.bottom;

    let lineChart1 = lineChartSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    lineChart1.insert("rect", ":first-child")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", '#fafafa');

    // Create the tooltip
    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Define the scales
    let xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d3.timeParse("%Y")(d.year)))
        .range([0, width]);

    let yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([height, 0]);

    lineChart1.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2 +50)
        .style("font-size", "12px")
        .text("Total Average Crime Rate");

    // Append the X-axis
    lineChart1.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(data.length).tickFormat(d3.timeFormat("%Y")))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", "1em")
        .attr("transform", "rotate(-45)");
    
    lineChart1.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom * 0.7})`)
        .style("font-size", "12px")
        .text("Year");
        
    lineChart1.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2) // Adjust this to move the title within or above the top margin
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Violent Crime Rate in Georgia");

    // Append the Y-axis
    lineChart1.append("g")
        .call(d3.axisLeft(yScale));

    // Define the line generator
    let line = d3.line()
        .x(d => xScale(d3.timeParse("%Y")(d.year)))
        .y(d => yScale(d.value));

    // Draw the line
    lineChart1.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Append circles for interaction
    lineChart1.selectAll(".data-point")
        .data(data)
        .enter().append("circle")
        .attr("class", "data-point")
        .attr("cx", d => xScale(d3.timeParse("%Y")(d.year)))
        .attr("cy", d => yScale(d.value))
        .attr("r", 5)
        .attr("fill", color)
        .attr("opacity",0)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Year: ${d.year}<br>Rate: ${d.value.toFixed(2)}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

