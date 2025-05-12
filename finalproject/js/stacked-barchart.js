class StackedBarChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 800,
            containerHeight: 500,
            margin: {top: 40, right: 100, bottom: 120, left: 60}
        }
        this.data = _data;
        this.initVis();
    }

    initVis() {
        let vis = this;

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

        // Process data for stacked bar chart
        const statePartyGrouped = d3.rollups(
            vis.data,
            v => {
                const yesCount = d3.sum(v, d => +d.YES);
                const noCount = v.length - yesCount;
                const total = v.length;
                return {
                    Yes: (yesCount / total * 100),
                    No: (noCount / total * 100)
                };
            },
            d => d.STATE,
            d => d.PARTY_R
        );

        // Calculate totals for each party
        const partyTotals = d3.rollups(
            vis.data,
            v => {
                const yesCount = d3.sum(v, d => +d.YES);
                const noCount = v.length - yesCount;
                const total = v.length;
                return {
                    Yes: (yesCount / total * 100),
                    No: (noCount / total * 100)
                };
            },
            d => d.PARTY_R
        );

        // Transform the data
        const data = [];
        statePartyGrouped.forEach(([state, partyData]) => {
            partyData.forEach(([party, values]) => {
                data.push({
                    group: `${state}-${party}`,
                    state: state,
                    party: party,
                    ...values
                });
            });
        });

          // Add total bars
        partyTotals.forEach(([party, values]) => {
            data.push({
                group: `Total-${party}`,
                state: "Total",
                party: party,
                ...values
            });
        });

        const subgroups = ["Yes", "No"];
        const groups = data.map(d => d.group);

        // Create scales
        vis.x = d3.scaleBand()
            .domain(groups)
            .range([0, vis.config.width])
            .padding(0.2);

        vis.y = d3.scaleLinear()
            .domain([0, 100])
            .range([vis.config.height, 0]);

        // Stack the data
        vis.stackedData = d3.stack()
            .keys(subgroups)(data);

        // Colors for Yes/No
        vis.color = d3.scaleOrdinal()
            .domain(subgroups)
            .range(["#8ecf8c", "#c799ce"]);

        // Create tooltip
        vis.tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "white")
            .style("border", "1px solid #ddd")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

        // Draw bars
        vis.bars = vis.chart.selectAll("g.layer")
            .data(vis.stackedData)
            .join("g")
            .attr("class", "layer")
            .attr("fill", d => vis.color(d.key))
            .selectAll("rect")
            .data(d => d)
            .join("rect")
            .attr("x", d => vis.x(d.data.group))
            .attr("y", d => vis.y(d[1]))
            .attr("height", d => vis.y(d[0]) - vis.y(d[1]))
            .attr("width", vis.x.bandwidth())
            .attr("stroke", d => {
                const [state, party] = d.data.group.split("-");
                return party === "1" ? "#e41a1c" : "#3773b8";
            })
            .attr("stroke-width", 3)
            .on("mouseover", function(event, d) {
                const [state, party] = d.data.group.split("-");
                const partyName = party === "1" ? "Republican" : "Democrat";
                
                vis.tooltip
                    .style("visibility", "visible")
                    .html(`
                        <strong>${state} ${partyName}</strong><br/>
                        Yes: ${Math.round(d.data.Yes)}%<br/>
                        No: ${Math.round(d.data.No)}%
                    `);
            })
            .on("mousemove", function(event) {
                vis.tooltip
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                vis.tooltip.style("visibility", "hidden");
            });

        // Add axes
        vis.chart.append("g")
            .attr("transform", `translate(0, ${vis.config.height})`)
            .call(d3.axisBottom(vis.x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .text(d => {
                const [state, party] = d.split("-");
                return `${state} ${party === "1" ? "Republican" : "Democrat"}`;
            });

        vis.chart.append("g")
            .call(d3.axisLeft(vis.y).ticks(5).tickFormat(d => d + "%"));

        // Add legend
        const legend = vis.chart.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 12)
            .attr("text-anchor", "start")
            .selectAll("g")
            .data(subgroups)
            .join("g")
            .attr("transform", (d, i) => `translate(${vis.config.width + 20},${i * 25})`);

        legend.append("rect")
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", vis.color);

        legend.append("text")
            .attr("x", 24)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(d => d);
    }

    // Method to highlight by party and state
    highlightParty(party) {
        this.chart.selectAll("rect")
            .attr("opacity", d => {
                if (!d || !d.data || !d.data.group) return 1; // or 0.3, as appropriate
                const [state, partyVal] = d.data.group.split("-");
                return (d.data.state !== "Total" && partyVal === party) ? 1 : 0.3;
            });
    }

    highlightTotal(party){
        this.chart.selectAll("rect")
            .attr("opacity", d => {
                if (!d || !d.data || !d.data.group) return 1; // or 0.3, as appropriate
                const [state, partyVal] = d.data.group.split("-");
                return (d.data.state === "Total" && partyVal === party) ? 1 : 0.3;
            });
    }

    resetHighlight() {
        this.chart.selectAll("rect")
            .attr("opacity", 1);
    }

    // Method to show/hide the visualization
    show() {
        this.svg
            .style("display", "block")
            .style("visibility", "visible");
        this.tooltip.style("display", "block");
    }

    hide() {
        this.svg
            .style("display", "none")
            .style("visibility", "hidden");
        this.tooltip
            .style("display", "none")
            .style("visibility", "hidden");
    }
}