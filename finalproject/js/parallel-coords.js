// ParallelCoordinates class with axes ordering based on normalized differences
class ParallelCoordinates {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 900,
            containerHeight: 500,
            margin: {top: 40, right: 100, bottom: 120, left: 60}
        };

        // Store the complete dataset
        this.allData = _data;
        
        // Initial filter for Republicans only
        this.selectedState = null;
        
        // Store dimension ranges for normalization
        this.dimensionRanges = {};
        
        this.initVis();
    }

    // Filter data based on the current state selection
    filterData() {
        console.log('All data:', this.allData);
        // Always filter for Republican (PARTY_R === "1")
        let filteredData = this.allData.filter(d => d.PARTY_R === "1");
        console.log('After Republican filter:', filteredData);
        
        // Apply state filter if a state is selected
        if (this.selectedState) {
            filteredData = filteredData.filter(d => d.STATE === this.selectedState);
            console.log('After state filter:', filteredData);
        }
        
        return filteredData;
    }

    computeIQR(values) {
        if (!values || values.length === 0) {
            return {q1: 0, median: 0, q3: 0, avg: 0};
        }
        
        const sorted = values.slice().sort(d3.ascending);
        const q1 = Math.round(d3.quantileSorted(sorted, 0.25));
        const median = Math.round(d3.quantileSorted(sorted, 0.5));
        const q3 = Math.round(d3.quantileSorted(sorted, 0.75));
        const avg = Math.round(d3.mean(values));
        return {q1, median, q3, avg};
    }

    initVis() {
        let vis = this;

        // Define dimensions for parallel coordinates
        vis.dimensions = ['PERCENT_RURAL', 'MEAN_INCOME', 'PERCENT_PRIVATE', 'PERCENT_21_W', 'PERCENT_21_B', 'PERCENT_21_H'];

        vis.dimLabels = {
            "PERCENT_RURAL": "Percent Rural Population (%)",
            "MEAN_INCOME": "Mean Income by Household ($)",
            "PERCENT_PRIVATE": "Percent of Students in Private School (%)",
            "PERCENT_21_W": "Percent White Population (%)",
            "PERCENT_21_B": "Percent Black Population (%)",
            "PERCENT_21_H": "Percent Hispanic Population (%)"
        };

        // Calculate inner chart size
        vis.config.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.config.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Create SVG
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element for the chart
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Calculate dimension ranges for the entire dataset (for normalization)
        this.calculateDimensionRanges();
        
        // Add x-coordinate scale for dimensions
        vis.pcXScale = d3.scalePoint()
            .domain(vis.dimensions)
            .range([0, vis.config.width - 120]);
        
        // Initialize scales based on all data
        this.updateScales();
        
        // Order dimensions by differences
        this.orderDimensionsByDifference();

        // Add legend for vote types
        this.addLegend();
        
        // Add axes for parallel coordinates
        this.addAxes();

        // Initial render
        vis.updateVis();

        this.setupDropdown();
    }

    // Calculate ranges for all dimensions for normalization
    calculateDimensionRanges() {
        const vis = this;
        
        // Process the entire dataset for range calculation
        const allProcessedData = vis.allData.map(d => {
            return {
                PERCENT_RURAL: +d.PERCENT_RURAL || 0,
                MEAN_INCOME: +d.MEAN_INCOME || 0,
                PERCENT_PRIVATE: +d.PERCENT_PRIVATE || 0,
                PERCENT_21_W: +d.PERCENT_21_W || 0,
                PERCENT_21_B: +d.PERCENT_21_B || 0,
                PERCENT_21_H: +d.PERCENT_21_H || 0,
                STATE: d.STATE,
                YES: d.YES
            };
        });
        
        // Calculate min-max ranges for each dimension
        vis.dimensions.forEach(dim => {
            const extent = d3.extent(allProcessedData, d => d[dim]);
            vis.dimensionRanges[dim] = {
                min: extent[0],
                max: extent[1],
                range: extent[1] - extent[0]
            };
        });
    }

    // Order dimensions based on normalized differences between yes/no votes
    orderDimensionsByDifference() {
        const vis = this;
        
        if (!vis.iqrByVote || !vis.iqrByVote["0"] || !vis.iqrByVote["1"]) {
            return; // Skip if statistics haven't been calculated yet
        }
        
        // Calculate normalized differences for each dimension
        const dimensionDifferences = vis.dimensions.map(dim => {
            const yesAvg = vis.iqrByVote["1"][dim].avg;
            const noAvg = vis.iqrByVote["0"][dim].avg;
            
            // Normalize the difference by the range of the dimension
            const normalizedDiff = Math.abs(yesAvg - noAvg) / vis.dimensionRanges[dim].range;
            
            return {
                dimension: dim,
                difference: normalizedDiff,
                rawDifference: Math.abs(yesAvg - noAvg)
            };
        });
        
        // Sort dimensions by normalized difference (ascending instead of descending)
        dimensionDifferences.sort((a, b) => a.difference - b.difference);
        
        // Update dimensions array with sorted order
        vis.dimensions = dimensionDifferences.map(d => d.dimension);
        
        // Update pcXScale with new dimension order
        if (vis.pcXScale) {
            vis.pcXScale.domain(vis.dimensions);
        }
        
        // Log the sorted dimensions and their differences
        console.log("Dimensions ordered by normalized difference:", dimensionDifferences);
    }

    setupDropdown() {
        const vis = this;
    
        const states = [...new Set(vis.allData.map(d => d.STATE))].sort();
    
        // Main group for dropdown
        const dropdown = vis.chart.append("g")
            .attr("class", "svg-dropdown")
            .attr("transform", `translate(${vis.config.width - 100}, 90)`);
    
        // Background rect
        dropdown.append("rect")
            .attr("width", 120)
            .attr("height", 24)
            .attr("fill", "#f9f9f9")
            .attr("stroke", "#ccc")
            .attr("rx", 4)
            .attr("ry", 4);
    
        // Label text
        const label = dropdown.append("text")
            .attr("x", 10)
            .attr("y", 16)
            .text("Select State")
            .attr("font-size", "12px")
            .style("cursor", "pointer");
    
        // Dropdown menu group (hidden by default)
        const menu = vis.chart.append("g")
            .attr("class", "svg-dropdown-menu")
            .attr("transform", `translate(${vis.config.width - 100}, 115)`)
            .style("display", "none");
    
        // Add "All States" option first
        menu.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 120)
            .attr("height", 24)
            .attr("fill", "#ffffff")
            .attr("stroke", "#ccc")
            .style("cursor", "pointer")
            .on("click", function() {
                vis.setSelectedState(null);
                label.text("All States");
                menu.style("display", "none");
            });

        menu.append("text")
            .attr("x", 10)
            .attr("y", 16)
            .text("All States")
            .attr("font-size", "12px")
            .style("cursor", "pointer")
            .on("click", function() {
                vis.setSelectedState(null);
                label.text("All States");
                menu.style("display", "none");
            });
    
        states.forEach((state, i) => {
            menu.append("rect")
                .attr("x", 0)
                .attr("y", (i + 1) * 24)  // Offset by 1 to account for "All States" option
                .attr("width", 120)
                .attr("height", 24)
                .attr("fill", "#ffffff")
                .attr("stroke", "#ccc")
                .style("cursor", "pointer")
                .on("click", function() {
                    vis.setSelectedState(state);
                    label.text(state);
                    menu.style("display", "none");
                });
    
            menu.append("text")
                .attr("x", 10)
                .attr("y", (i + 1) * 24 + 16)  // Offset by 1 to account for "All States" option
                .text(state)
                .attr("font-size", "12px")
                .style("cursor", "pointer")
                .on("click", function() {
                    vis.setSelectedState(state);
                    label.text(state);
                    menu.style("display", "none");
                });
        });
    
        // Toggle visibility on label click
        label.on("click", () => {
            const visible = menu.style("display") === "inline";
            menu.style("display", visible ? "none" : "inline");
        });
    
        // Optional: close on outside click
        d3.select("body").on("click", (event) => {
            const clickedInsideDropdown = event.target.closest(".svg-dropdown") || event.target.closest(".svg-dropdown-menu");
            if (!clickedInsideDropdown) {
                menu.style("display", "none");
            }
        }, true);
    }

    // Update scales based on current filtered data
    updateScales() {
        const vis = this;
        
        // Get filtered data
        const filteredData = vis.filterData();
        console.log('Filtered data:', filteredData);
        
        // Process the filtered data
        vis.processedData = filteredData.map(d => {
            return {
                PERCENT_RURAL: +d.PERCENT_RURAL || 0,
                MEAN_INCOME: +d.MEAN_INCOME || 0,
                PERCENT_PRIVATE: +d.PERCENT_PRIVATE || 0,
                PERCENT_21_W: +d.PERCENT_21_W || 0,
                PERCENT_21_B: +d.PERCENT_21_B || 0,
                PERCENT_21_H: +d.PERCENT_21_H || 0,
                STATE: d.STATE,
                YES: d.YES
            };
        });
        console.log('Processed data:', vis.processedData);
        
        // Create scales based on current data
        vis.pcScales = {};
        vis.dimensions.forEach(dim => {
            const values = vis.processedData.map(d => +d[dim]).filter(v => !isNaN(v));
            console.log(`Values for ${dim}:`, values);
            
            if (values.length === 0) {
                // Fallback if no valid values — use [0, 1] to avoid crashing
                vis.pcScales[dim] = d3.scaleLinear().domain([0, 1]).range([vis.config.height, 0]);
            } else {
                vis.pcScales[dim] = d3.scaleLinear()
                    .domain(d3.extent(values))
                    .range([vis.config.height, 0]);
            }
        });
        
        // Calculate statistics based on current filtered data
        vis.calculateStatistics();
        
        // After calculating statistics, update dimension ordering
        vis.orderDimensionsByDifference();
        
        // Update pcXScale with new dimension order
        vis.pcXScale.domain(vis.dimensions);
    }
    
    // Calculate statistics for the current filtered data
    calculateStatistics() {
        const vis = this;
        
        // Group data by vote (YES/NO)
        const groupedByVote = d3.group(vis.processedData, d => d.YES);
        
        // Calculate statistics for each group
        vis.iqrByVote = {};
        
        for (const [voteGroup, groupData] of groupedByVote) {
            vis.iqrByVote[voteGroup] = {};
            vis.dimensions.forEach(dim => {
                vis.iqrByVote[voteGroup][dim] = vis.computeIQR(groupData.map(d => d[dim]));
            });
        }
        
        // Ensure both vote groups exist in statistics
        if (!vis.iqrByVote["0"]) {
            vis.iqrByVote["0"] = {};
            vis.dimensions.forEach(dim => {
                vis.iqrByVote["0"][dim] = {q1: 0, median: 0, q3: 0, avg: 0};
            });
        }
        
        if (!vis.iqrByVote["1"]) {
            vis.iqrByVote["1"] = {};
            vis.dimensions.forEach(dim => {
                vis.iqrByVote["1"][dim] = {q1: 0, median: 0, q3: 0, avg: 0};
            });
        }
    }

    addLegend() {
        const vis = this;
        
        // Add legend for vote types
        const legend = vis.chart.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${vis.config.width - 100}, 20)`);

        // Average Yes vote legend item
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 20)
            .attr('y2', 0)
            .style('stroke', '#4dac26')
            .style('stroke-width', 2);

        legend.append('text')
            .attr('x', 25)
            .attr('y', 4)
            .text('Average Yes Vote')
            .style('font-size', '12px');

        // Average No vote legend item
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 20)
            .attr('x2', 20)
            .attr('y2', 20)
            .style('stroke', '#d01c8b')
            .style('stroke-width', 2);

        legend.append('text')
            .attr('x', 25)
            .attr('y', 24)
            .text('Average No Vote')
            .style('font-size', '12px');

        // Median Yes vote legend item
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 40)
            .attr('x2', 20)
            .attr('y2', 40)
            .style('stroke', '#4dac26')
            .style('stroke-width', 2)
            .attr("stroke-dasharray", "5,2");

        legend.append('text')
            .attr('x', 25)
            .attr('y', 44)
            .text('Median Yes Vote')
            .style('font-size', '12px');

        // Median No vote legend item
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 60)
            .attr('x2', 20)
            .attr('y2', 60)
            .style('stroke', '#d01c8b')
            .style('stroke-width', 2)
            .attr("stroke-dasharray", "5,2");

        legend.append('text')
            .attr('x', 25)
            .attr('y', 64)
            .text('Median No Vote')
            .style('font-size', '12px');
        
        // Add title for the legend
        legend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .text('Legend')
            .style('font-size', '14px')
            .style('font-weight', 'bold');
    }
    
    addAxes() {
        const vis = this;
        
        // Remove any existing axes
        vis.chart.selectAll('.pc-axis').remove();
        
        // Add axes for parallel coordinates in the newly ordered dimension
        vis.dimensions.forEach((dim, i) => {
            const axis = d3.axisLeft(vis.pcScales[dim]);
            const axisGroup = vis.chart.append('g')
                .attr('class', 'pc-axis')
                .attr('transform', `translate(${vis.pcXScale(dim)},0)`)
                .call(axis);

            // Add label with wrapping
            const label = axisGroup.append('text')
                .attr('class', 'axis-label')
                .attr('x', 0)
                .attr('y', (vis.config.height) + 30)
                .attr('text-anchor', 'middle')
                .attr('fill', 'black')
                .style('font-size', '12px')
                .style('font-weight', 'bold');

            // Split the label text into words and create tspans
            const words = vis.dimLabels[dim].split(/\s+/);
            const lineHeight = 1.2;
            let line = [];
            let lineNumber = 0;
            let tspan = label.append('tspan')
                .attr('x', 0)
                .attr('dy', '0em');

            words.forEach(word => {
                line.push(word);
                tspan.text(line.join(' '));
                if (tspan.node().getComputedTextLength() > 80) {
                    line.pop();
                    tspan.text(line.join(' '));
                    line = [word];
                    tspan = label.append('tspan')
                        .attr('x', 0)
                        .attr('dy', `${lineHeight}em`)
                        .text(word);
                }
            });

            // Add tooltip functionality to the axis
            axisGroup
                .on("mouseover", function(event) {
                    // Calculate normalized difference
                    const yesAvg = vis.iqrByVote["1"][dim].avg;
                    const noAvg = vis.iqrByVote["0"][dim].avg;
                    const rawDiff = Math.abs(yesAvg - noAvg);
                    const normalizedDiff = rawDiff / vis.dimensionRanges[dim].range;
                    
                    // Create tooltip
                    const tooltip = d3.select("body").append("div")
                        .attr("class", "tooltip")
                        .style("position", "absolute")
                        .style("background-color", "white")
                        .style("border", "1px solid #ddd")
                        .style("padding", "10px")
                        .style("border-radius", "5px")
                        .style("pointer-events", "none")
                        .style("opacity", 0)
                        .style("z-index", "1000")
                        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)");

                    // Add content to tooltip
                    const tooltipContent = `<strong>${vis.dimLabels[dim]}</strong><br/><br/>` +
                                         `<strong>Yes Vote:</strong><br/>` +
                                         `Range: ${dim === 'MEAN_INCOME' ? 
                                             `$${vis.iqrByVote["1"][dim].q1.toLocaleString()} - $${vis.iqrByVote["1"][dim].q3.toLocaleString()}` :
                                             `${vis.iqrByVote["1"][dim].q1.toFixed(1)}% - ${vis.iqrByVote["1"][dim].q3.toFixed(1)}%`}<br/>` +
                                         `Median: ${dim === 'MEAN_INCOME' ? 
                                             `$${vis.iqrByVote["1"][dim].median.toLocaleString()}` :
                                             `${vis.iqrByVote["1"][dim].median.toFixed(1)}%`}<br/>` +
                                         `Average: ${dim === 'MEAN_INCOME' ? 
                                             `$${vis.iqrByVote["1"][dim].avg.toLocaleString()}` :
                                             `${vis.iqrByVote["1"][dim].avg.toFixed(1)}%`}<br/><br/>` +
                                         `<strong>No Vote:</strong><br/>` +
                                         `Range: ${dim === 'MEAN_INCOME' ? 
                                             `$${vis.iqrByVote["0"][dim].q1.toLocaleString()} - $${vis.iqrByVote["0"][dim].q3.toLocaleString()}` :
                                             `${vis.iqrByVote["0"][dim].q1.toFixed(1)}% - ${vis.iqrByVote["0"][dim].q3.toFixed(1)}%`}<br/>` +
                                         `Median: ${dim === 'MEAN_INCOME' ? 
                                             `$${vis.iqrByVote["0"][dim].median.toLocaleString()}` :
                                             `${vis.iqrByVote["0"][dim].median.toFixed(1)}%`}<br/>` +
                                         `Average: ${dim === 'MEAN_INCOME' ? 
                                             `$${vis.iqrByVote["0"][dim].avg.toLocaleString()}` :
                                             `${vis.iqrByVote["0"][dim].avg.toFixed(1)}%`}<br/><br/>` +
                                         `<strong>Difference:</strong><br/>` +
                                         `Raw: ${dim === 'MEAN_INCOME' ? 
                                             `$${rawDiff.toLocaleString()}` :
                                             `${rawDiff.toFixed(1)}%`}<br/>` +
                                         `Normalized: ${normalizedDiff.toFixed(3)}`;

                    tooltip.html(tooltipContent)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px")
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                })
                .on("mousemove", function(event) {
                    const tooltip = d3.select(".tooltip");
                    if (!tooltip.empty()) {
                        tooltip
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mouseout", function() {
                    d3.select(".tooltip").remove();
                });
        });
    }

    updateVis() {
        const vis = this;

        // Update scales and statistics based on current filtered data
        vis.updateScales();
        
        // Update axes with new scales and ordering
        vis.addAxes();

        // Clear previous paths
        vis.chart.selectAll(".iqr-area, .median-line, .avg-line").remove();

        // Add IQR bands
        ["1", "0"].forEach(voteGroup => {
            // Skip if no data for this vote group
            if (!vis.iqrByVote[voteGroup]) return;
            
            const q1Points = vis.dimensions.map(dim => [
                vis.pcXScale(dim),
                vis.pcScales[dim](vis.iqrByVote[voteGroup][dim].q1)
            ]);

            const q3Points = vis.dimensions.map(dim => [
                vis.pcXScale(dim),
                vis.pcScales[dim](vis.iqrByVote[voteGroup][dim].q3)
            ]).reverse();

            const areaPoints = q1Points.concat(q3Points);

            vis.chart.append("path")
                .attr("class", "iqr-area")
                .attr("d", d3.line()(areaPoints) + "Z")
                .attr("fill", voteGroup === "1" ? "#b8e186" : "#f1b6da")
                .attr("fill-opacity", 0.4)
                .attr("stroke", "none");
        });

        // Add median lines
        const medianLines = [
            { label: "yes", voteGroup: "1", color: "#4dac26" },
            { label: "no", voteGroup: "0", color: "#d01c8b" }
        ];

        vis.chart.selectAll(".median-line")
            .data(medianLines)
            .join("path")
            .attr("class", "median-line")
            .attr("d", d => {
                // Check if this vote group has data
                if (!vis.iqrByVote[d.voteGroup]) return "";
                
                const points = vis.dimensions.map(dim => [
                    vis.pcXScale(dim),
                    vis.pcScales[dim](vis.iqrByVote[d.voteGroup][dim].median)
                ]);
                return d3.line()(points);
            })
            .attr("stroke", d => d.color)
            .attr("stroke-width", 3)
            .attr("fill", "none")
            .attr("stroke-dasharray", "5,2")
            .attr("stroke-opacity", 0.7);

        // Add average lines
        const avgLines = [
            { label: "yes", voteGroup: "1", color: "#4dac26" },
            { label: "no", voteGroup: "0", color: "#d01c8b" }
        ];

        vis.chart.selectAll(".avg-line")
            .data(avgLines)
            .join("path")
            .attr("class", "avg-line")
            .attr("d", d => {
                // Check if this vote group has data
                if (!vis.iqrByVote[d.voteGroup]) return "";
                
                const points = vis.dimensions.map(dim => [
                    vis.pcXScale(dim),
                    vis.pcScales[dim](vis.iqrByVote[d.voteGroup][dim].avg)
                ]);
                return d3.line()(points);
            })
            .attr("stroke", d => d.color)
            .attr("stroke-width", 3)
            .attr("fill", "none");
            
        // Update title to show current state if selected
        this.updateTitle();
    }

    // UI interaction hook
    setSelectedState(state) {
        console.log("Setting state to:", state);
        this.selectedState = state;
        this.updateVis();
    }

    // Method to show/hide the visualization
    show() {
        this.svg.style("display", "block");
    }

    hide() {
        this.svg.style("display", "none");
    }

    // Method to highlight specific dimensions
    highlightDimensions(dimensions) {
        this.chart.selectAll('.pc-axis')
            .style('opacity', function() {
                const axisTransform = d3.select(this).attr('transform');
                const dimMatch = axisTransform.match(/translate\(([^,]+),/);
                if (dimMatch) {
                    const xPos = parseFloat(dimMatch[1]);
                    const dim = this.dimensions.find(d => 
                        Math.abs(this.pcXScale(d) - xPos) < 0.1
                    );
                    return dimensions.includes(dim) ? 1 : 0.3;
                }
                return 0.3;
            }.bind(this));
    }

    // Method to update the title
    updateTitle(newTitle) {
        // Remove existing title if any
        this.chart.selectAll(".vis-title").remove();
        
        // Set default title based on state selection
        if (!newTitle) {
            newTitle = this.selectedState ? 
                `Republican Districts in ${this.selectedState}` : 
                "All Republican Districts";
        }
        
        // Add new title
        this.chart.append("text")
            .attr("class", "vis-title")
            .attr("x", this.config.width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(newTitle);
    }
}