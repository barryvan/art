$(document.body).setStyle('background', '#444').empty()

var infoWindow = new seqta.ui.Graph.InfoWindow({
	
}, document.body);

$(infoWindow).setStyles({
	'background': '#ffd320 -moz-linear-gradient(top, rgba(255,255,255,0.5), rgba(255,255,255,0))',
	'borderRadius': '4px',
	'boxShadow': '0 2px 4px rgba(0,0,0,0.5)',
	'color': '#000',
	'padding': '8px',
	'width': '80px',
	'textShadow': '0 1px rgba(255,255,255,0.5)',
	'MozTransition': 'left 0.5s, top 0.5s'
});

var dataset = [];
var labels = [];

var velocity = Number.random(-1, 1);
var centre = 50;
var y = 0;

var timer = null;

for (var i = 0; i < 200;i ++) {
	labels[i] = i + 1;
	
	centre = centre + Number.random(-5, 5);
	centre = centre.limit(20, 80);
	velocity = velocity + Math.random() * (centre - y).limit(-1, 1);
	velocity = velocity.limit(-5, 5);
	y += velocity;
	
	dataset[i] = {
		y: y,
		color: (i == 9) ? '#ffd320' : null,
		label: 'Item ' + (i + 1) + ' has a value of ' + (y.round(2)),
		onClick: function() {
			
		},
		lines: [{
			color: 'rgba(131,202,255, 0.5)', // Average
			y: y + Number.random(-1, 1) * 5,
			width: 5
		}, {
			color: 'rgba(0, 0, 0, 0.25)', // Low score
			y: Number.random(0, y - 10),
			width: 3
		}, {
			color: 'rgba(0, 0, 0, 0.25)', // High score
			y: Number.random(y, 100),
			width: 3
		}],
		onEnter: infoWindow.enter,
		onLeave: infoWindow.leave
	};
}

var elGraph = new Element('div', {
	'styles': {
		'borderRadius': '8px',
		'boxShadow': '2px 2px 8px #000',
		'margin': '20px',
		'width': 600,
		height: 300
	}
}).inject(document.body);

//window.graph = new seqta.ui.Graph.VertBar({
window.graph = new seqta.ui.Graph.Line({
	width: 600,
	height: 300,
	legend: {
		drawLegend: false
	},
	data: {
		contain: false,
		drawPoints: false,
		drawStarts: false,
		drawEnds: false,
		radius: 0,
		pointSize: 10
	},
	xAxis: {
		labels: labels,
		labelHeight: 15
	},
	yAxis: {
		labelWidth: 30,
		lower: 0,
		upper: 100
	}
}, elGraph);

window.graph.draw(dataset);
