class ScrollerVis {
  constructor(_config, _data) {
      this.config = {
          parentElement: _config.parentElement,
          containerWidth: 1800,
          containerHeight: 600,
          margin: {top: 40, right: 100, bottom: 120, left: 60},
          steps: ['step0', 'step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8']
      }
      this.data = _data;
      
      // Create container for visualizations
      this.container = d3.select(this.config.parentElement)
          .append('div')
          .attr('id', 'visualization-container')
          .style('width', '100%')
          .style('height', '100%')
          .style('position', 'relative');  // Add relative positioning
      
      // Create separate containers for each visualization
      this.stackedBarContainer = this.container
          .append('div')
          .attr('id', 'stacked-bar-container')
          .style('width', '100%')
          .style('height', '100%')
          .style('position', 'absolute')  // Add absolute positioning
          .style('top', '0')
          .style('left', '0');
          
      this.parallelCoordsContainer = this.container
          .append('div')
          .attr('id', 'parallel-coords-container')
          .style('width', '100%')
          .style('height', '100%')
          .style('position', 'absolute')  // Add absolute positioning
          .style('top', '0')
          .style('left', '0');
      
      // Initialize visualizations in their respective containers
      this.stackedBarChart = new StackedBarChart({
          parentElement: '#stacked-bar-container'
      }, this.data);

      this.parallelCoords = new ParallelCoordinates({
          parentElement: '#parallel-coords-container'
      }, this.data);

      this.parallelCoords2 = new ParallelCoordinates({
        parentElement: '#parallel-coords-container'
      }, this.data);

      // Hide all visualizations initially
      this.hideAll();
  }

  hideAll() {
      // Hide containers
      this.stackedBarContainer.style('display', 'none');
      this.parallelCoordsContainer.style('display', 'none');
      
      // Hide visualizations
      if (this.stackedBarChart) {
          this.stackedBarChart.hide();
      }
      if (this.parallelCoords) {
          this.parallelCoords.hide();
      }

      if (this.parallelCoords2) {
        this.parallelCoords2.hide();
    }
  }
  //total barchart
  step0() {
      console.log('Executing step 0: Showing total bar chart');
      this.hideAll();
      this.stackedBarContainer.style('display', 'block');
      this.stackedBarChart.show();
      this.stackedBarChart.resetHighlight();
  }

  //highlight total democrats
  step1() {
      console.log('Executing step 1: Highlighting total Democrats');
      this.hideAll();
      this.stackedBarContainer.style('display', 'block');
      this.stackedBarChart.show();
      this.stackedBarChart.resetHighlight();
      this.stackedBarChart.highlightTotal("0");
  }

  //highlight total republicans
  step2() {
    console.log('Executing step 2: Highlighting total Republicans');
    this.hideAll();
    this.stackedBarContainer.style('display', 'block');
    this.stackedBarChart.show();
    this.stackedBarChart.resetHighlight();
    this.stackedBarChart.highlightTotal("1");
  }

  step3() {
    console.log('Executing step 3: Highlighting Republican party details');
    this.hideAll();
    this.stackedBarContainer.style('display', 'block');
    this.stackedBarChart.show();
    this.stackedBarChart.resetHighlight();
    this.stackedBarChart.highlightParty("1");
  }
  
  step4() {
      console.log('Executing step 4: Showing parallel coordinates');
      this.hideAll();
      this.parallelCoordsContainer.style('display', 'block');
      this.parallelCoords.show();
      this.parallelCoords.setSelectedState(null);
  }

  step5() {
      console.log('Executing step 5: Showing parallel coord comparison');
      this.hideAll();
      this.parallelCoordsContainer.style('display', 'block');
      this.parallelCoords.show();
  }

  step6() {
      console.log('Executing step 6: Showing Republican demographics');
      this.hideAll();
      this.parallelCoordsContainer.style('display', 'block');
      this.parallelCoords.show();
      this.parallelCoords2.show();
      this.parallelCoords2.setSelectedState("GA");
      //this.parallelCoords.updateTitle("Republican Voter Demographics");
  }

  step7() {
      console.log('Executing step 7: Showing Independent demographics');
      this.hideAll();
      this.parallelCoordsContainer.style('display', 'block');
      this.parallelCoords.show();
      this.parallelCoords2.show();
      //this.parallelCoords.updateTitle("Independent Voter Demographics");
  }

  step8() {
      console.log('Executing step 8: Showing complete view');
      this.hideAll();
      this.parallelCoordsContainer.style('display', 'block');
      this.parallelCoords.show();
      this.parallelCoords2.show();
      //this.parallelCoords.updateTitle("Complete Voter Demographics");
  }

  goToStep(stepIndex) {
      console.log(`Going to step ${stepIndex}`);
      const vis = this;
      const step = vis.config.steps[stepIndex];
      vis[step]();
  }
}