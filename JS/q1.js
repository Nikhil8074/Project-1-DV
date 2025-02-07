const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip");

        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        let currentChart = "line";
        let yearCounts = [];

        d3.csv("Project_1.csv").then(data => {
            yearCounts = d3.rollups(
                data,
                v => v.length,
                d => d.Year
            ).map(([year, count]) => ({
                year: +year,
                count: +count
            }));

            updateChart("year");
        });


        function updateChart(order) {
            // Wait for any existing transitions to complete
            const activeTransitions = d3.selectAll(".line, .point").transition();
            if (activeTransitions) {
                activeTransitions.duration(0).end();  // Immediately end any active transitions
            }

            const sortedData = [...yearCounts];

            if (order === "increasing") {
                sortedData.sort((a, b) => a.count - b.count);
            } else if (order === "decreasing") {
                sortedData.sort((a, b) => b.count - a.count);
            } else {
                sortedData.sort((a, b) => a.year - b.year);
            }

            yearCounts = sortedData;

            // Fade out existing elements before redrawing
            svg.selectAll("*")
                .transition()
                .duration(300)
                .style("opacity", 0)
                .end()
                .then(() => {
                    svg.selectAll("*").remove();
                    drawChart();
                });
        }

        function drawChart() {
            svg.selectAll("*").remove();

            const maxCount = d3.max(yearCounts, d => d.count);
            const yAxisMax = Math.ceil(maxCount * 1.1);

            const x = d3.scaleBand()
                .domain(yearCounts.map(d => d.year))
                .range([0, width])
                .padding(0.2);

            const y = d3.scaleLinear()
                .domain([0, yAxisMax])
                .range([height, 0]);

            svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).tickFormat(d3.format("d")))
                .style("opacity", 0)
                .transition()
                .duration(500)
                .style("opacity", 1);

            svg.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(y)
                    .ticks(10)
                    .tickFormat(d3.format("d")))
                .style("opacity", 0)
                .transition()
                .duration(500)
                .style("opacity", 1);

            if (currentChart === "line") {
                drawLineChart(x, y);
            } else {
                drawBarChart(x, y);
            }
        }

        function drawLineChart(x, y) {
            svg.selectAll(".bar").remove();

            const line = d3.line()
                .x(d => x(d.year) + x.bandwidth() / 2)
                .y(d => y(d.count))
                .curve(d3.curveMonotoneX);

            // Add gradient definition
            const gradient = svg.append("defs")
                .append("linearGradient")
                .attr("id", "line-gradient")
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", 0)
                .attr("y1", y(d3.min(yearCounts, d => d.count)))
                .attr("x2", 0)
                .attr("y2", y(d3.max(yearCounts, d => d.count)));

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", "#7062a3");

            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", "#9c91c9");

            // First, add and animate the points
            const points = svg.selectAll(".point")
                .data(yearCounts)
                .enter()
                .append("circle")
                .attr("class", "point")
                .attr("cx", d => x(d.year) + x.bandwidth() / 2)
                .attr("cy", height)
                .attr("r", 0)
                .attr("fill", "#7062a3");

            // Add point interactions
            points.on("mouseover", function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr("r", 8)
                    .attr("fill", "#9c91c9");

                tooltip
                    .style("opacity", 1)
                    .html(`Year: ${d.year}<br>Participants: ${d.count}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
                .on("mouseout", function () {
                    d3.select(this)
                        .transition()
                        .duration(300)
                        .attr("r", 5)
                        .attr("fill", "#7062a3");

                    tooltip.style("opacity", 0);
                });

            // Animate points
            points.transition()
                .delay((d, i) => i * 100)
                .duration(800)
                .attr("cy", d => y(d.count))
                .attr("r", 5)
                .ease(d3.easeBounceOut)
                .end()
                .then(() => {
                    // Only add the line after points are in position
                    const path = svg.append("path")
                        .datum(yearCounts)
                        .attr("class", "line")
                        .attr("fill", "none")
                        .attr("stroke", "url(#line-gradient)")
                        .attr("stroke-width", 3)
                        .attr("d", line)
                        .style("opacity", 0);

                    const pathLength = path.node().getTotalLength();

                    // Animate the line
                    path.attr("stroke-dasharray", pathLength)
                        .attr("stroke-dashoffset", pathLength)
                        .style("opacity", 1)
                        .transition()
                        .duration(1000)
                        .ease(d3.easeQuadOut)
                        .attr("stroke-dashoffset", 0);
                });
        }

        function drawBarChart(x, y) {
            svg.selectAll(".line, .point").remove();

            // Create bars with initial state
            const bars = svg.selectAll(".bar")
                .data(yearCounts);

            // Remove old bars with exit transition
            bars.exit()
                .transition()
                .duration(800)
                .attr("y", height)
                .attr("height", 0)
                .remove();

            // Add new bars
            const newBars = bars.enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.year))
                .attr("width", x.bandwidth())
                .attr("y", height)  // Start from bottom
                .attr("height", 0)  // Initial height of 0
                .attr("fill", "#7062a3");

            // Update all bars with transition
            bars.merge(newBars)
                .transition()
                .duration(1500)
                .delay((d, i) => i * 100)
                .ease(d3.easeBounceOut)
                .attr("x", d => x(d.year))
                .attr("width", x.bandwidth())
                .attr("y", d => y(d.count))
                .attr("height", d => height - y(d.count));

            // Add hover interactions with upward movement
            svg.selectAll(".bar")
                .on("mouseover", function (event, d) {
                    const currentHeight = height - y(d.count);
                    d3.select(this)
                        .transition()
                        .duration(600)
                        .attr("fill", "#9c91c9")
                    // Move the bar up by 10 pixels and extend its height
                    // .attr("y", d => y(d.count) - 10)
                    // .attr("height", currentHeight + 10);

                    tooltip
                        .style("opacity", 1)
                        .html(`Year: ${d.year}<br>Participants: ${d.count}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function (d) {
                    d3.select(this)
                        .transition()
                        .duration(600)
                        .attr("fill", "#7062a3")
                        // Reset the position and height
                        .attr("y", d => y(d.count))
                        .attr("height", d => height - y(d.count));

                    tooltip.style("opacity", 0);
                });
        }

        document.getElementById("toggleButton").addEventListener("click", () => {
            currentChart = currentChart === "line" ? "bar" : "line";
            document.getElementById("toggleButton").textContent =
                currentChart === "line" ? "Switch to Bar Chart" : "Switch to Line Chart";

            svg.selectAll("*")
                .transition()
                .duration(300)
                .style("opacity", 0)
                .end()
                .then(() => {
                    drawChart();
                });
        });

        document.getElementById("sortOrder").addEventListener("change", (event) => {
            updateChart(event.target.value);
        });