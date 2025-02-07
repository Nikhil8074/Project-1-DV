const categoryNames = {
    "Mf": "Male Fast",
    "Ff": "Female Fast",
    "Me": "Male Entertaining",
    "Fe": "Female Entertaining",
    "Xe": "Mixed Entertaining",
    "Xf": "Mixed Fast",
    "Jmf": "Junior Male Fast",
    "Jx": "Junior Mixed",
    "Jff": "Junior Female Fast"
};

const margin = { top: 40, right: 20, bottom: 60, left: 60 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

const heatmapMargin = { top: 30, right: 120, bottom: 100, left: 50 };
const heatmapWidth = 960 - heatmapMargin.left - heatmapMargin.right;
const heatmapHeight = 500 - heatmapMargin.top - heatmapMargin.bottom;

const heatmapSvg = d3.select("#heatmap")
    .append("svg")
    .attr("width", heatmapWidth + heatmapMargin.left + heatmapMargin.right)
    .attr("height", heatmapHeight + heatmapMargin.top + heatmapMargin.bottom)
    .append("g")
    .attr("transform", `translate(${heatmapMargin.left},${heatmapMargin.top})`);

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

let currentData = [];
const sortYearButton = document.getElementById('sortYear');
const sortAscButton = document.getElementById('sortAsc');
const sortDescButton = document.getElementById('sortDesc');

// Set initial active button
sortYearButton.classList.add('active');

sortYearButton.addEventListener('click', () => {
    lastSortMode = 'Year';
    setActiveButton(sortYearButton);
    createBarChart(filteredData, categorySelect.value, 'year');
});

sortAscButton.addEventListener('click', () => {
    lastSortMode = 'asc';
    setActiveButton(sortAscButton);
    createBarChart(filteredData, categorySelect.value, 'asc');
});

sortDescButton.addEventListener('click', () => {
    lastSortMode = 'desc';
    setActiveButton(sortDescButton);
    createBarChart(filteredData, categorySelect.value, 'desc');
});

function setActiveButton(activeButton) {
    [sortYearButton, sortAscButton, sortDescButton].forEach(button => {
        button.classList.remove('active');
    });
    activeButton.classList.add('active');
}

function updateBarChart(data, animate = true) {
    const x = d3.scaleBand()
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .range([height, 0]);

    x.domain(data.map(d => d.year));
    y.domain([0, d3.max(data, d => d.time) * 1.1]);

    svg.selectAll(".axis").remove();

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle");

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(formatTime));

    const bars = svg.selectAll(".bar")
        .data(data, d => d.year);

    bars.exit().remove();

    const newBars = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.year))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0);

    if (animate) {
        svg.selectAll(".bar")
            .transition()
            .duration(1200)
            .attr("x", d => x(d.year))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.time))
            .attr("height", d => height - y(d.time));
    } else {
        svg.selectAll(".bar")
            .attr("x", d => x(d.year))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.time))
            .attr("height", d => height - y(d.time));
    }

    svg.selectAll(".bar")
        .on("mouseover", (event, d) => {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Year: ${d.year}<br/>Time: ${formatTime(d.time)}<br/>Team: ${d.team}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

function sortBars(order) {
    const sortedData = [...currentData];

    switch (order) {
        case 'asc':
            sortedData.sort((a, b) => a.time - b.time);
            break;
        case 'desc':
            sortedData.sort((a, b) => b.time - a.time);
            break;
        case 'year':
            sortedData.sort((a, b) => a.year - b.year);
            break;
    }

    updateBarChart(sortedData);
}

d3.csv("Project_1.csv").then(data => {
    const years = [2015, 2017, 2018, 2019, 2022, 2023, 2024];
    const categories = Object.keys(categoryNames);

    data.forEach(d => {
        const [minutes, seconds] = d.Time.split(':');
        d.Time = parseFloat(minutes) * 60 + parseFloat(seconds);
        d.Year = parseInt(d.Year);
    });

    const categorySelect = d3.select("#categorySelector")
        .on("change", updateChart);

    categorySelect.selectAll("option")
        .data(Object.entries(categoryNames))
        .enter()
        .append("option")
        .text(d => d[1])
        .attr("value", d => d[0]);

    function updateChart() {
        const selectedCategory = categorySelect.node().value;

        currentData = years.map(year => {
            const yearData = data.filter(d => d.Year === year && d.Category === selectedCategory);
            const bestTime = yearData.length > 0 ? d3.min(yearData, d => d.Time) : null;
            const bestTeam = yearData.find(d => d.Time === bestTime)?.Team_Name || "N/A";
            return { year, time: bestTime, team: bestTeam };
        }).filter(d => d.time !== null);

        updateBarChart(currentData, true);
    }

    const completeHeatmapData = [];
    categories.forEach(cat => {
        years.forEach(year => {
            const yearCatData = data.filter(d => d.Year === year && d.Category === cat);
            if (yearCatData.length > 0) {
                const bestTime = d3.min(yearCatData, d => d.Time);
                const bestTeam = yearCatData.find(d => d.Time === bestTime)?.Team_Name;
                completeHeatmapData.push({
                    category: cat,
                    year: year,
                    value: bestTime,
                    team: bestTeam,
                    exists: true
                });
            } else {
                completeHeatmapData.push({
                    category: cat,
                    year: year,
                    value: null,
                    team: "No Data",
                    exists: false
                });
            }
        });
    });

    const heatmapX = d3.scaleBand()
        .range([0, heatmapWidth])
        .domain(categories)
        .padding(0.05);

    const heatmapY = d3.scaleBand()
        .range([heatmapHeight, 0])
        .domain(years)
        .padding(0.05);

    const heatmapColorScale = d3.scaleSequential()
        .interpolator(d3.interpolateTurbo)
        .domain([
            d3.max(completeHeatmapData.filter(d => d.exists), d => d.value),
            d3.min(completeHeatmapData.filter(d => d.exists), d => d.value)
        ]);


    heatmapSvg.selectAll("rect")
        .data(completeHeatmapData)
        .enter()
        .append("rect")
        .attr("x", d => heatmapX(d.category))
        .attr("y", d => heatmapY(d.year))
        .attr("width", heatmapX.bandwidth())
        .attr("height", heatmapY.bandwidth())
        .style("fill", d => d.exists ? heatmapColorScale(d.value) : "#f0f0f0")
        .style("opacity", 0)
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget)
                .attr("stroke", "#7062a3")
                .attr("stroke-width", 2);

            tooltip
                .style("opacity", 0.9)
                .html(`Category: ${categoryNames[d.category]}<br/>Year: ${d.year}<br/>${d.exists ? `Time: ${formatTime(d.value)}<br/>Team: ${d.team}` : 'No Data Available'}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (event) => {
            d3.select(event.currentTarget)
                .attr("stroke", "none");

            tooltip.style("opacity", 0);
        })
        .transition()
        .delay((d, i) => i * 40)
        .duration(1000)
        .style("opacity", 1);

    heatmapSvg.append("g")
        .attr("transform", `translate(0,${heatmapHeight + 40})`)
        .call(d3.axisBottom(heatmapX).tickFormat(d => categoryNames[d]))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");

    heatmapSvg.append("g")
        .call(d3.axisLeft(heatmapY));

    const legendWidth = 20;
    const legendHeight = heatmapHeight;
    const legend = heatmapSvg.append("g")
        .attr("transform", `translate(${heatmapWidth + 40}, 0)`);

    const legendScale = d3.scaleLinear()
        .domain(heatmapColorScale.domain())
        .range([legendHeight, 0]);

    legend.selectAll("rect")
        .data(d3.range(legendHeight))
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", d => d)
        .attr("width", legendWidth)
        .attr("height", 1)
        .style("fill", d => heatmapColorScale(legendScale.invert(d)));

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(formatTime);

    legend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis);

    legend.append("rect")
        .attr("x", 0)
        .attr("y", -30)
        .attr("width", legendWidth)
        .attr("height", 20)
        .style("fill", "#f0f0f0")
        .style("stroke", "#ccc");

    legend.append("text")
        .attr("class", "legend-label")
        .attr("x", legendWidth + 5)
        .attr("y", -18)
        .style("font-size", "12px")
        .style("alignment-baseline", "middle")
        .style("width", "100px") 
        .text("No Data");
    updateChart();
});