'use strict'

var svg = d3.select("#svgview"),
    margin = {top: 20, right: 40, bottom: 40, left: 90},
    width = svg.attr("width") - margin.left - margin.right,
    height = svg.attr("height") - margin.top - margin.bottom;

// var x = d3.scaleLinear()
var x = d3.scalePoint()
    .range([30,width])

var globalData = {};

//https://bl.ocks.org/mbostock/3371592
var categories = ['DOS','Traffic Anomolay','Scan','Policy Breach','Brute Force' ]
var axisXTime = [0, 1, 2, 3, 4, 5, 6]
var y = d3.scalePoint()
    .domain(categories)
    .range([height/9, 8*height/9])

var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var tooltip = g.append("text")
    .attr("class", "tooltip")
    .style("opacity", 0)

var circle

var selected = null //0 displays all projects , 1 one project is selected

d3.json("graph.json",update)

function update(data) {
  globalData = data;

  var options = {
        data: data,
        maxNumberOfElements: 8,

        getValue: function(d){
                    if(d.sourceAddress.length > 30 ){
                      return d.sourceAddress.substr(0,12)+'..'
                    }else{
                      return d.sourceAddress
                    }
                  },

      	list: {
      		match: {
      			enabled: true
      		},
          onChooseEvent:function(){
            let d = $("#artsearch").getSelectedItemData()
            $("#artsearch").val('').blur()
            circle.on('click')(d,0)
          }
      	},
        theme: "ars"
  };

  $("#artsearch").easyAutocomplete(options);

  //calculates min and max for axis X
  let domainExtent = d3.extent(axisXTime);

  // Defines axis X domain
  // x.domain(domainExtent);
  x.domain(axisXTime);

  // Draw axis X line
  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).tickFormat(d3.format('0')).ticks());

  g.append("g")
      .attr("class", "axis axis--x")
      .call(d3.axisLeft(y))

  data.forEach(function(d){
    d.x = width /2
    d.y = height/2;
    d.collide = (d.suspicious) ? 10:6
  })

  var simulation = d3.forceSimulation(data)

  circle = g.selectAll("circle")
    .data(data)
    .enter()
      .append('circle')
      .attr('id',d => 'p'+d.id )
      .attr("r", d => d.collide - 1)
      .attr("class", d => d.category.replace(' ','_').replace('.','').toLowerCase())

  function updateSim(){

    circle
      .attr("cx" , d => d.x )
      .attr("cy" , d => d.y )
    simulation.nodes(circle.data())

    line.selectAll('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + d.collide + 6)

  }

  simulation.on('tick',updateSim)

  let line = g.append('g')
  tooltip.raise()

  clearUI(false)

  circle.on('click',function(d,index){
      if( d3.event != null ){
        d3.event.stopPropagation()
      }
      //

      //display location hash
      location.hash = d.id + '_' + encodeURIComponent(d.sourceAddress.substr(0,10))

      let node = d3.select(this)

      if(this != undefined && selected != null && selected.node() != node.node() && !node.classed('disabled')){

        circle.classed('selected',false)
        node.classed('selected',true)
        // updateInfo(d)
        selected = node

        return;

      }

      selected = node
      clearUI();

      circle.classed('disabled',true).classed('selected',false)

      let artworks = [{'sourceAddress':d.sourceAddress,'id':d.id}]
      let collide  = 10

      for(let node of globalData) {
        if(d.sourceAddress == node.sourceAddress || getSubnet(d.sourceAddress) == getSubnet(node.sourceAddress)) {
          let n = d3.select('#p'+node.id)
          let datum = n.datum()
          n.classed('disabled',false)
          if(d.sourceAddress == node.sourceAddress) {
            collide = 25
          } else {
            collide = 12
          }
          datum.collide = collide
          n.transition().duration(200).attr('r',collide)

          collide = Math.max(5,collide*0.75)

          artworks.push({ 'sourceAddress':datum.sourceAddress,'id':datum.id})
        }
      }

      d.collide = 30
      d3.select('#p'+d.id).transition().duration(200).attr('r',d.collide - 1.5).attr

      //https://bl.ocks.org/plmrry/b9db6d47dabaff6e59f565d9287c4064
      simulation.nodes(circle.data())
        .force("collide", d3.forceCollide(d => d.collide))
        .alpha(0.35 )
        .restart()

      //fill dataset
      let dataset = []
      for(let node of globalData) {
        if(d.tittle == node.sourceAddress || getSubnet(d.sourceAddress) == getSubnet(node.sourceAddress)) {
          let projData = d3.select('#p'+node.id).datum()
          dataset.push({'source':d,'target':projData})
        }
      }

      d3.select('#p'+d.id).classed('disabled',false).classed('selected',true)

      line.selectAll('text').remove()

      dataset = d3.selectAll('circle:not(.disabled').data()
      line.selectAll('text')
        .data(dataset)
        .enter()
          .append('text')
          .attr('x', d => d.x)
          .attr('y', d => d.y + 12)
          .attr('class','tooltip')
          .html( function(d){
                    if(d.sourceAddress.length > 15 ){
                      return d.sourceAddress.substr(0,12)+'..'
                    }else{
                      return d.sourceAddress
                    }})


      // update UI
      d3.select('#closest').html(artworks.map(d => `${d.sourceAddress}`).join(' - '))
      // updateInfo(d)

  })

  function clearUI(clearText = true){
    line.selectAll('text').remove()

    if(clearText){
      d3.select('#closest').text('')
      d3.select('#title').text('')
    }
    data.forEach(d =>
      d.collide = (d.suspicious) ? 7:4)

    g.selectAll('circle:not(.disabled)').attr('r',d => d.collide - 1 )

    if( g.selectAll('circle.disabled').size() > 0 ){

      simulation.nodes(circle.data())
        .force("collide", d3.forceCollide(d => d.collide))
        .alpha(0.35)
        .restart()

    }
    circle.classed('disabled selected',false)

    simulation
      .force("x", d3.forceX(d => x(d.time)).strength(.5))
      .force("y", d3.forceY(d => y(d.category)))
      .force("collide", d3.forceCollide(d => d.collide))
      .alpha(0.35 )
      .alphaDecay(0.01)

  }

  function getSubnet(address) {
    let parts = address.split('.');
    let octect = "o0.o1.x.x";
    for(var i = 0; i < 2; i++) {
      octect = octect.replace("o" + i, parts[i]);
    }
    return octect;
  }

  function updateInfo(d){

    // update UI
    let texturl = 'texts/' + d3.format('06')(d.id) + '.txt'
    d3.text(texturl, (error,data) => {

      let maxlength = 700
      let catalog_text = '<p>' + (data.length > maxlength) ? data.substr(0,maxlength) + '...' : data + '</p>'
      catalog_text    += '<p><a target="_blank" href="http://archive.aec.at/prix/#' + d.id + '">Ars Electronica link </a></p>'
      d3.select('#catalog_text').html(catalog_text)}
    )

    let imgurl = `images/${(''+d.id).padStart(6,'0')}.jpg`;
    d3.select('#artworkimage').attr('src',imgurl)

    d3.select('#title').text(d.sourceAddress)
  }

  if( location.hash.length != '' ){
    let id = location.hash.split('_')[0].substr(1)
    let node = d3.select('#p'+id)
    node.on('click')(node.datum(),0)
  }

  //disable cells on mouseclick on the svg
  svg.on('click',(d,index) =>
    {
      //https://stackoverflow.com/a/28155967
      history.replaceState({}, document.sourceAddress, ".");
      d3.event.stopPropagation()
      clearUI()
      selected = null
    }
  )

  circle.on('mouseover', d => {

       tooltip.transition()
         .duration(200)
         .style("opacity", .9);
       tooltip.html(d.sourceAddress)
         .attr('x',d.x)
         .attr('y',0)
       })

  circle.on("mouseout", function(d) {
       tooltip.transition()
         .duration(200)
         .style("opacity", 0);
       });

}
