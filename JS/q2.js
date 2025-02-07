// Load and process the data
let lastSortMode='Year';
d3.csv('Project_1.csv').then(data => {
    // Filter out unwanted years
    const excludedYears = ['2016', '2014', '2013', '2012', '2011', '2010', 
                         '2009', '2008', '2007', '2006', '2005', '2004', '2003'];
    
    const filteredData = data.filter(d => !excludedYears.includes(d.Year));
    
    // Get unique years and categories
    const years = [...new Set(filteredData.map(d => d.Year))].sort((a, b) => b - a);
    const categories = [...new Set(filteredData.map(d => d.Category))].sort();
    
    // Populate year select
    const yearSelect = document.getElementById('yearSelect');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    // Category mappings
    const categoryMap = {
        'Mf': 'Male fast',
        'Ff': 'Female fast',
        'Xf': 'Mixed fast',
        'Jmf': 'Junior Male fast',
        'Jff': 'Junior Female fast',
        'Me': 'Male entertaining',
        'Fe': 'Female entertaining',
        'Xe': 'Mixed entertaining',
        'Jx': 'Junior Mixed'
    };

    // Populate category select with full forms
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = ''; // Clear existing options
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${category} (${categoryMap[category] || category})`;
        if (category === 'Mf') {
            option.selected = true;
        }
        categorySelect.appendChild(option);
    });
    
    // Initial renders
    createPieChart(filteredData, years[0]);
    createBarChart(filteredData, 'Mf', 'year'); // Set initial bar chart to Mf
    
    // Event listeners
    yearSelect.addEventListener('change', (e) => {
        createPieChart(filteredData, e.target.value);
    });

    categorySelect.addEventListener('change', (e) => {
        if (e.target.value) {
            createBarChart(filteredData, e.target.value, lastSortMode);
        }
    });

    // Add event listeners for sort buttons
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
}).catch(error => {
    console.error('Error loading CSV:', error);
    document.getElementById('pieChart').innerHTML = 'Error loading data';
});

function createPieChart(data, selectedYear) {
    // Clear previous chart
    d3.select('#pieChart').selectAll('*').remove();
    d3.select('#legend').selectAll('*').remove();

    // Filter data for selected year
    const yearData = data.filter(d => d.Year === selectedYear);
    
    // Count categories
    const categoryCounts = d3.rollup(
        yearData,
        v => v.length,
        d => d.Category
    );

    // Convert to array for D3
    const pieData = Array.from(categoryCounts, ([key, value]) => ({
        category: key,
        value: value
    }));

    // Set up dimensions
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    // Create SVG
    const svg = d3.select('#pieChart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create pie layout
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    // Define arcs
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius - 40);

    const outerArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    // Create tooltip
    const tooltip = d3.select('.tooltip');

    // Function to handle tooltip positioning
    const updateTooltipPosition = (event) => {
        tooltip
            .style('left', (event.clientX) + 'px')
            .style('top', (event.clientY - 10) + 'px');
    };

    // Add slices
    const slices = svg.selectAll('path')
        .data(pie(pieData))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.category))
        .attr('stroke', 'white')
        .style('stroke-width', '2px')
        .attr('class', 'pie-slice')
        .each(function(d) {  // Store initial state
            this._current = { startAngle: Math.PI, endAngle: Math.PI };  // Start from center
        })
        .transition()  // Animate opening like a flower
        .duration(1000)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate(
                { startAngle: Math.PI, endAngle: Math.PI },  // Start closed
                d  // Final state
            );
            return function(t) { return arc(interpolate(t)); };
        })
        .on("end", function() {  // Once animation is done, show text
            d3.selectAll('.pie-label')
                .transition()
                .duration(500)
                .style("opacity", 1);
        });

        svg.selectAll('.pie-slice')
            .on('mousemove', function(event, d) {
            const percent = ((d.data.value / d3.sum(pieData, d => d.value)) * 100).toFixed(1);
            tooltip
                .style('display', 'block')
                .html(`${d.data.category}<br>${d.data.value} teams (${percent}%)`);
            
            updateTooltipPosition(event);
            
            d3.select(this)
                .transition()
                .duration(200)
                .attr('transform', 'scale(1.05)');
        })
        .on('mouseout', function() {
            tooltip.style('display', 'none');
            d3.select(this)
                .transition()
                .duration(200)
                .attr('transform', 'scale(1)');
        })
        .on('click', function(event, d) {
            // Update the bar chart with the selected category
            const categorySelect = document.getElementById('categorySelect');
            categorySelect.value = d.data.category;
            createBarChart(data, d.data.category,'Year');

            // Highlight the year in the bar chart
            highlightBar(selectedYear);
        });

    // Function to compute label position
    function midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

    // Calculate total for percentages
    const total = d3.sum(pieData, d => d.value);

    // Add labels
    const labelGroup = svg.selectAll('.labelGroup')
        .data(pie(pieData))
        .enter()
        .append('g')
        .attr('class', 'labelGroup');

    labelGroup.each(function(d) {
        const group = d3.select(this);
        const percent = (d.data.value / total) * 100;
        const isSmall = percent <= 5;

        if (isSmall && percent > 0) {
            // Outside label for small slices
            const pos = outerArc.centroid(d);
            const midangle = midAngle(d);
            pos[0] = radius * (midangle < Math.PI ? 0.9 : -0.9);
            console.log(selectedYear);
            if(selectedYear=== '2019' )
            {
                const shiftUp = 12;  // Shift one slice up
                const shiftDown = -12; // Shift another slice down

                // Identify small slices
                const isSmall1 = (d.endAngle - d.startAngle) < 0.15;

                // Use index-based logic to alternate shifts
                if (isSmall1) {
                    const index = pieData.findIndex(p => p.category === d.data.category);
                    pos[1] += index % 2 === 0 ? shiftUp : shiftDown;
                }
            }
            // Add leader line
            const points = [
                arc.centroid(d),
                outerArc.centroid(d),
                pos
            ];
            
            group.append('polyline')
                .attr('class', 'leader-line')
                .attr('points', points.join(' '));

            // Add label
            group.append('text')
                .attr('class', 'pie-label')
                .attr('transform', `translate(${pos})`)
                .attr('text-anchor', midangle < Math.PI ? 'start' : 'end')
                .attr('dy', '0.35em')
                .attr('font-size', percent < 5 ? '12px' : '10px')
                .style("opacity", 0)
                .text(`${percent.toFixed(1)}%`);
        } else {                                                                                                                            
            // Inside label for large slices
            group.append('text')
                .attr('class', 'pie-label')
                .attr('transform', `translate(${arc.centroid(d)})`)
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('font-size', '14px')
                .style("opacity", 0)                                                                                                                                                                            
                .text(`${percent.toFixed(1)}%`);
        }
    });

    // Create legend
    const legendData = [
        { abbreviation: 'Mf', full: 'Male fast' },
        { abbreviation: 'Ff', full: 'Female fast' },
        { abbreviation: 'Xf', full: 'Mixed fast' },
        { abbreviation: 'Jmf', full: 'Junior Male fast' },
        { abbreviation: 'Jff', full: 'Junior Female fast' },
        { abbreviation: 'Me', full: 'Male entertaining' },
        { abbreviation: 'Fe', full: 'Female entertaining' },
        { abbreviation: 'Xe', full: 'Mixed entertaining' },
        { abbreviation: 'Jx', full: 'Junior Mixed' }
    ];

    const categoryMap = Object.fromEntries(legendData.map(d => [d.abbreviation, d.full]));

    const legend = d3.select('#legend')
        .selectAll('.legend-item')
        .data(pieData)
        .enter()
        .append('div')
        .attr('class', 'legend-item');

    legend.append('div')
        .attr('class', 'legend-color')
        .style('background-color', d => color(d.category));

    legend.append('span')
        .html(d => {
            const abbreviation = categoryMap[d.category] || d.category;
            return `<strong>${d.category}</strong>: ${abbreviation}`;
        });
}
function highlightPieSlice(category) {
    d3.selectAll('.pie-slice')
        .style('opacity', 0.3)
        .filter(d => d.data.category === category)
        .style('opacity', 1);
    
    setTimeout(() => {
        d3.selectAll('.pie-slice')
            .style('opacity', 1);
    }, 3000);
}

function createBarChart(data, selectedCategory, sortType='Year') {
    // Clear previous chart
    d3.select('#barChart').selectAll('*').remove();

    // Filter and process data
    const categoryData = d3.rollup(
        data,
        v => v.length,
        d => d.Year,
        d => d.Category
    );

    // Convert to array format for plotting
    let chartData = Array.from(categoryData, ([year, categories]) => ({
        year: year,
        value: categories.get(selectedCategory) || 0
    }));

    if(sortType == 'Year') {
        chartData.sort((a, b) =>Number( b.year )-  Number(a.year));
    } else if(sortType == 'asc') {
        chartData.sort((a, b) => a.value - b.value);
    } else if(sortType == 'desc') {
        chartData.sort((a, b) => b.value - a.value);
    }


    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 1200 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select('#barChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const x = d3.scaleBand()
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .range([height, 0]);

    // Set domains
    x.domain(chartData.map(d => d.year));
    y.domain([0, d3.max(chartData, d => d.value)]);


    
    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'middle');

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y));
    
    const bars = svg.selectAll('.bar')
        .data(chartData, d => d.year);
    bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.year) + x.bandwidth() * 0.2) // Start at current x position
        .attr('width', x.bandwidth() * 0.65)
        .attr('y', height) // Start at bottom
        .attr('height', 0)
        .transition()
        .duration(800)
        .attr('x', d => x(d.year) + x.bandwidth() * 0.3) // Move bars side by side
        .attr('y', d => y(d.value)) // Rise up
        .attr('width', x.bandwidth() * 0.4)
        .attr('height', d => height - y(d.value));

    // EXIT: Remove old bars smoothly
    bars.exit()
        .transition()
        .duration(500)
        .attr('y', height) // Move to bottom before removing
        .attr('height', 0)
        .remove();
    svg.select(".x-axis")
        .transition()
        .duration(500)
        .call(d3.axisBottom(x));
    svg.selectAll('.bar')
        .on('mouseover', function(event, d) {
            d3.select(this).style('fill', '#9084bd');
            
            const tooltip = d3.select('.tooltip');
            tooltip.style('display', 'block')
                .html(`Year: ${d.year}<br>Teams: ${d.value}`)
                .style('left', (event.pageX ) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this).style('fill', '#7062a3');
            d3.select('.tooltip').style('display', 'none');
        })
        .on('click', function(event, d) {
            // Update the pie chart with the selected year
            const yearSelect = document.getElementById('yearSelect');
            yearSelect.value = d.year;
            createPieChart(data, d.year);

            // Highlight the category in the pie chart
            highlightPieSlice(selectedCategory);
        });
    const legendData = [
        { abbreviation: 'Mf', full: 'Male fast' },
        { abbreviation: 'Ff', full: 'Female fast' },
        { abbreviation: 'Xf', full: 'Mixed fast' },
        { abbreviation: 'Jmf', full: 'Junior Male fast' },
        { abbreviation: 'Jff', full: 'Junior Female fast' },
        { abbreviation: 'Me', full: 'Male entertaining' },
        { abbreviation: 'Fe', full: 'Female entertaining' },
        { abbreviation: 'Xe', full: 'Mixed entertaining' },
        { abbreviation: 'Jx', full: 'Junior Mixed' }
    ];

    const categoryMap = Object.fromEntries(legendData.map(d => [d.abbreviation, d.full]));
        
    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2.5)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text(`${selectedCategory} (${categoryMap[selectedCategory]}) Participation Over Years`);

    // Add X axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 5)
        .attr('text-anchor', 'middle')
        .text('Year');

    // Add Y axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Number of Teams');
}

function highlightBar(year) {
    d3.selectAll('.bar')
        .style('opacity', 0.3)
        .filter(d => d.year === year)
        .style('opacity', 1);
    
    setTimeout(() => {
        d3.selectAll('.bar')
            .style('opacity', 1);
    }, 3000);
}