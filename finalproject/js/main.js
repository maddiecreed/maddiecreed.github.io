/**
 * Load data from CSV file asynchronously and render bar chart
 */
let data, scrollerVis;

d3.csv('data/data-vis-final-data.csv').then(_data => {
  data = _data;

  // Update text on the web page based on the loaded dataset
  d3.select('#assignment-count').text(data.length);
  
  // Count attributes for html text explanations
  const democratCount = data.filter(d => d.PARTY_R === '0').length;
  const republicanCount = data.filter(d => d.PARTY_R === '1').length;
  const stateCount = [...new Set(data.map(d => d.STATE))];
  const partyPercent = d3.rollups(
    data,
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
  const republicanYes = Math.round(partyPercent[0][1]["Yes"]);
  const democratNo = Math.round(partyPercent[1][1]["No"]);

  
  d3.select('#democrat-count').text(democratCount);
  d3.select('#republican-count').text(republicanCount);
  d3.select('#state-count').text(stateCount);
  d3.select('#republican-yes').text(republicanYes);
  d3.select('#democrat-no').text(democratNo);
  // Initialize visualization
  scrollerVis = new ScrollerVis({ parentElement: '#vis'}, data);
  
  // Show initial step
  scrollerVis.goToStep(0);
  
  // Create waypoints for scroll detection
  const waypoints = d3.selectAll('.step').each(function(d, stepIndex) {
    return new Waypoint({
      element: this,
      handler: function(direction) {
        if (direction === 'down') {
          scrollerVis.goToStep(stepIndex);
        } else {
          scrollerVis.goToStep(Math.max(0, stepIndex - 1));
        }
      },
      offset: '20%',
      triggerOnce: false,
      context: window
    });
  });
})
.catch(error => console.error(error));


