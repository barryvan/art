/*
---
name: seqta.ui.Graph
description: "Graphing capabilities; built on ART"
authors: ["[Barry van Oudtshoorn](http://barryvan.com.au)"]
requires: [ART, ART.Base, ART.Font, ART.Path, ART.Shapes]
provides: [seqta.ui.Graph, seqta.ui.LineGraph]
...
*/

(function() {

// Establish namespace if necessary
this.seqta = this.seqta || {};
seqta.ui = seqta.ui || {};

seqta.ui.Graph = new Class({
	
});

seqta.ui.Graph.Base = new Class({
	Implements: Options,
	
	options: {
		padding: 20,
		width: 400,
		height: 200,
		font: '10pt Calibri',
		background: '#fff',
		borderRadius: 8,
		legend: {
			drawLegend: true,
			placement: 'bottom', // ('top', 'right', 'bottom', 'left')
			size: 20 // Width for right/left; height for top/bottom
		},
		colors: []
	},
	
	art: null,
	
	_colourIndex: -1,
	
	Binds: [
	
	],
	
	_leftOffset: 0,
	_rightOffset: 0,
	_topOffset: 0,
	_bottomOffset: 0,
	
	_graphWidth: 0,
	_graphHeight: 0,
	
	_datasets: [],
	
	initialize: function(options, parent) {
		this.setOptions(options);
		
		if (parent) {
			var parentSize = parent.getSize();
			this.options.width = parentSize.x;
			this.options.height = parentSize.y;
		}
		
		this.art = new ART(this.options.width, this.options.height);
		if (parent) {
			parent.grab($(this.art));
		}
		
		if (!this.options.colors.length) {
			this.options.colors = [ // From LibreOffice. :)
				'#004586', '#ff420e', '#ffd320', '#597d1c', '#7e0021', '#83caff',
				'#314004', '#aecf00', '#4b1f6f', '#ff950e', '#c5000b', '#0084d1'
			]
		}
	},
	
	toElement: function() {
		return $(this.art);
	},
	
	reset: function() {
		this.clear();
	},
	
	clear: function() {
		//this.art.empty();
		// TODO: Check that this works with VML.
		$(this.art).getChildren().destroy();
	},
	
	draw: function() {
		this._drawBackground();
	},
	
	_drawBackground: function() {
		var background = new ART.Rectangle(
			this.options.width,
			this.options.height,
			this.options.borderRadius
		);
		background.fill(this.options.background);
		background.inject(this.art);
	},
	
	_drawLegend: function(legend, colour, index, extra) {
		if (!legend) return;
		if (!this.options.legend.drawLegend) return;
		var x, y;
		
		var pointSize = (this.options.data && this.options.data.pointSize) || 8;
		
		switch (this.options.legend.placement) {
			case 'top':
				x = this.options.padding + (index * 80) + pointSize * 2; // TODO!
				y = this.options.padding;
				break;
			case 'right':
				x = this.options.width - this._rightOffset + this.options.padding;
				y = this.options.padding + (index * pointSize * 2);
				break;
			case 'left':
				x = this.options.padding;
				y = this.options.padding + (index * pointSize * 2);
				break;
			case 'bottom': /* fall through */
			default:
				x = this.options.padding + (index * 80) + pointSize * 2;
				y = this.options.height - this.options.padding;
				break;
		}
		
		var shape = (extra && extra.shape) || ART.Dot;
		shape = (typeOf(shape) === 'class') ? shape : ART.Dot;
		
		var point = new shape(pointSize)
			.fill(colour)
			.stroke(colour, pointSize / 3)
			.moveTo(x, y)
			.inject(this.art)
		
		var label = new ART.Text(legend, this.options.font, 'left');
		label.fill('#000');
		label.moveTo(x + pointSize * 2, y);
		label.inject(this.art);
	}
});

seqta.ui.Graph.XYGraph = new Class({
	Extends: seqta.ui.Graph.Base,
	
	options: {
		xAxis: {
			labels: [],
			drawAxis: true,
			drawLabels: true,
			drawGridLines: true,
			gridColor: '#ccc',
			axisColor: '#000',
			labelHeight: 20
		},
		yAxis: {
			interval: 10,
			// max: null, // TODO
			drawAxis: true,
			drawLabels: true,
			drawGridLines: true,
			gridColor: '#ccc',
			axisColor: '#000',
			labelWidth: 40
		},
		data: {
			showLabels: true,
			contain: true
		}
	},
	
	_yPixPerPoint: -1,
	_xPixPerPoint: -1,
	_yGridSize: 10,
	_xGridSize: 10,
	_maxYDelta: 0,
	_maxYValue: 0,
	_minYValue: 0,
	_maxXDelta: 0,
	_maxXValue: 0,
	_minXValue: 0,
	
	Binds: [],
	
	initialize: function(options, parent) {
		this.parent(options, parent);
	},
	
	reset: function() {
		this.parent();
		this._datasets = [];
		this._yPixPerPoint = -1;
		this._xPixPerPoint = -1;
	},
	
	// Extra can be, eg., a shape for line charts.
	draw: function(dataset, colour, extra) {
		colour = colour ? colour : this.options.colors[this._colourIndex = (this._colourIndex + 1) % this.options.colors.length];
		this._datasets.push({
			data: dataset,
			colour: colour,
			extra: extra
		});
		if (this._updateSizes(dataset)) {
			this.clear();
			this._drawBackground();
			this._renderXGrid();
			this._renderYGrid();
			this._renderXAxis();
			this._renderYAxis();
			this._drawXLabels();
			this._drawYLabels();
			for (var i = 0; i < this._datasets.length; i++) {
				var set = this._datasets[i];
				this._renderSet(set.data, set.colour, set.extra);
				this._drawLegend(set.extra.legend, set.colour, i, set.extra);
			}
		} else {
			this._renderSet(dataset, colour, extra);
			this._drawLegend(extra.legend, colour, this._datasets.length - 1, extra);
		}
	},
	
	coordsOf: function(x, y) {
		return {
			x: xCoordOf(x),
			y: yCoordOf(y)
		};
	},
	
	xCoordOf: function(datum) {
		return this._graphWidth - (datum + Math.abs(this._minXValue)) * this._xPixPerPoint + this._leftOffset;
	},
	
	yCoordOf: function(datum) {
		return this._graphHeight - (datum + Math.abs(this._minYValue)) * this._yPixPerPoint + this._topOffset;
	},
	
	_renderXAxis: function() {
		if (!this.options.xAxis.drawAxis) return;
		
		var line = new ART.Path();
		line.moveTo(0, 0).lineTo(
			this._graphWidth,
			0
		);
		var lineShape = new ART.Shape(
			line,
			this._graphWidth,
			1 // TODO: Make line width configurable
		).stroke(this.options.xAxis.axisColor)
		 .moveTo(
				this._leftOffset,
				this._graphHeight + this._topOffset
			)
		 .inject(this.art);
	},
	
	_renderYAxis: function() {
		if (!this.options.yAxis.drawAxis) return;
		
		var line = new ART.Path();
		line.moveTo(0,0).lineTo(
			0,
			this._graphHeight
		);
		var lineShape = new ART.Shape(
			line,
			1, // TODO: Make line width configurable
			this._graphHeight
		).stroke(this.options.yAxis.axisColor)
		 .moveTo(
				this._leftOffset,
				this._topOffset
			)
		 .inject(this.art);
	},
	
	_drawXLabels: function() {
		if ((!this.options.xAxis.drawLabels) || (!this.options.xAxis.labels.length)) return;
		
		for (var i = 0; i < this.options.xAxis.labels.length; i++) {
			var datumX = (i + .5) * this._xPixPerPoint + this._leftOffset;
			var label = new ART.Text(this.options.xAxis.labels[i], this.options.font, 'center');
			label.fill('#000');
			label.moveTo(datumX, this.options.height - this._bottomOffset + (this.options.padding / 2));
			label.inject(this.art);
		}
	},
	
	_drawYLabels: function() {
		if (!this.options.yAxis.drawLabels) return;
		
		var count = this._graphHeight / this._xGridSize;
		var startAt = this._maxYDelta - Math.abs(this._minYValue);
		
		//var adjustment = Math.abs(this._minYValue / this.options.yAxis.interval);
		var i = count.round();
		while (i-- > 0) {
			// Tweak the layout by .7 so that things line up nicely...
			// Ideally, we'd be able to just align the text vertically. :/
			var datumY = this._topOffset + (i * this._xGridSize) - 7;
			var datum = (startAt - (i * this.options.yAxis.interval)).round();
			var label = new ART.Text(datum, this.options.font, 'right');
			label.fill('#000');
			label.moveTo(this._leftOffset - (this.options.padding / 2), datumY);
			label.inject(this.art);
		}
	},
	
	// Draw horizontal gridlines
	_renderXGrid: function() {
		if (!this.options.xAxis.drawGridLines) return;
		
		var count = this._graphHeight / this._xGridSize;
		for (var i = 0; i < count; i++) {
			var line = new ART.Path();
			line.moveTo(0, 0).lineTo(this._graphWidth, 0);
			var lineShape = new ART.Shape(line, this._graphWidth, 1) // TODO: Make line width configurable
				.stroke(this.options.xAxis.gridColor)
				.moveTo(this._leftOffset, i * this._xGridSize + this._topOffset)
				.inject(this.art);
		}
	},
	
	// Draw vertical gridlines
	_renderYGrid: function() {
		if (!this.options.yAxis.drawGridLines) return;
		
		var count = this._graphWidth / this._yGridSize + 1;
		for (var i = 1; i < count; i++) {
			var line = new ART.Path();
			line.moveTo(0, 0).lineTo(0, this._graphHeight);
			var lineShape = new ART.Shape(line, 1, this._graphHeight) // TODO: make line width configurable
				.stroke(this.options.yAxis.gridColor)
				.moveTo(i * this._yGridSize + this._leftOffset, this._topOffset)
				.inject(this.art);
		}
	},
	
	/* Return true if either changes. */
	_updateSizes: function(dataset) {
		var result = false;
		var count = dataset.length;
		
		var maxValue = this._max(dataset);
		var minValue = this._min(dataset);
		
		this._maxYValue = Math.max(this._maxYValue, maxValue.y);
		this._minYValue = Math.min(this._minYValue, minValue.y);
		this._maxXValue = Math.max(this._maxXvalue, maxValue.x);
		this._minXValue = Math.min(this._minXValue, minValue.x);
		
		this._maxYDelta = Math.max(this._maxYDelta, Math.abs(this._maxYValue) + Math.abs(this._minYValue));
		this._maxXDelta = Math.max(this._maxXDelta, Math.abs(this._maxXValue) + Math.abs(this._minXValue));
		
		this._leftOffset = this._rightOffset = this._topOffset = this._bottomOffset = this.options.padding;
		this._leftOffset += (this.options.yAxis.drawLabels) ? this.options.yAxis.labelWidth : 0;
		this._bottomOffset += (this.options.xAxis.drawLabels && this.options.xAxis.labels.length) ? this.options.xAxis.labelHeight : 0;
		
		if (this.options.legend.drawLegend) {
			switch (this.options.legend.placement) {
				case 'top':
					this._topOffset += this.options.legend.size;
					break;
				case 'right':
					this._rightOffset += this.options.legend.size;
					break;
				case 'left':
					this._leftOffset += this.options.legend.size;
					break;
				case 'bottom': /* fall through */
				default:
					this._bottomOffset += this.options.legend.size;
					break;
			}
		}
		
		this._graphWidth = this.options.width - this._leftOffset - this._rightOffset;
		this._graphHeight = this.options.height - this._topOffset - this._bottomOffset;
		
		var newYPix = (this._graphHeight / this._maxYDelta);
		var newXPix = (this._graphWidth / count);
		
		if (this._yPixPerPoint > 0) {
			newYPix = Math.min(newYPix, this._yPixPerPoint);
		}
		if (this._xPixPerPoint > 0) {
			newXPix = Math.min(newXPix, this._xPixPerPoint);
		}
		
		var newYSize = newXPix;
		while (newYSize < 10) { // TODO: Make this configurable?
			newYSize = newYSize * 2;
		}
		var newXSize = this.options.yAxis.interval * newYPix;
		
		result = result || (newYPix != this._yPixPerPoint) || (newXPix != this._xPixPerPoint);
		result = result || (newYSize != this._yGridSize) || (newXSize != this._xGridSize);
		
		this._yPixPerPoint = newYPix;
		this._xPixPerPoint = newXPix;
		this._yGridSize = newYSize;
		this._xGridSize = newXSize;
		
		return result;
	},
	
	_max: function(array) {
		var xMax = 0, yMax = 0, xItem, yItem;
		for (var i = 0; i < array.length; i++) {
			xItem = (array[i].x || array[i].y || array[i]);
			yItem = (array[i].y || array[i].x || array[i]);
			if (xItem > xMax) xMax = xItem;
			if (yItem > yMax) yMax = yItem;
		}
		if (this.options.data.contain) {
			if (this.options.xAxis.interval) {
				xMax += this.options.xAxis.interval;
			}
			if (this.options.yAxis.interval) {
				yMax += this.options.yAxis.interval;
			}
		}
		return {
			x: xMax,
			y: yMax
		};
	},
	
	_min: function(array) {
		var yMin = 0, xMin = 0, xItem, yItem;
		for (var i = 0; i < array.length; i++) {
			xItem = (array[i].x || array[i].y || array[i]);
			yItem = (array[i].y || array[i].x || array[i]);
			if (xItem < xMin) xMin = xItem;
			if (yItem < yMin) yMin = yItem;
		}
		if (this.options.data.contain) {
			if (this.options.xAxis.interval) {
				xMin -= this.options.xAxis.interval;
			}
			if (this.options.yAxis.interval) {
				yMin -= this.options.yAxis.interval;
			}
		}
		return {
			x: xMin,
			y: yMin
		};
	}
});

seqta.ui.Graph.XGraph = new Class({
	Extends: seqta.ui.Graph.XYGraph,
	
	coordsOf: function(datum, index) {
		return {
			x: (index + .5) * this._xPixPerPoint + this._leftOffset,
			y: this.yCoordOf(datum)
		}
	}
});

seqta.ui.Graph.Line = new Class({
	Extends: seqta.ui.Graph.XGraph,
	
	options: {
		data: {
			drawPoints: true,
			pointSize: 8
		}
	},
	
	Binds: [],
	
	_mouseoverPoint: function(point, colour) {
		point.stroke(colour, this.options.data.pointSize / 3);
	},
	
	_mouseoutPoint: function(point) {
		point.stroke('#fff', this.options.data.pointSize / 3);
	},
	
	_renderSet: function(dataset, colour, extra) {
		var pointSize = this.options.data.pointSize;
		var halfPoint = (pointSize / 2);
		
		var shape = extra.shape || ART.Dot;
		shape = (typeOf(extra.shape) === 'class') ? extra.shape : ART.Dot;
		
		var line = new ART.Path();
		var points = [];
		var item, datum, label, coords, point;
		for (var i = 0; i < dataset.length; i++) {
			item = dataset[i];
			datum = item.y || item.x || item;
			label = item.label || datum;
			coords = this.coordsOf(datum, i);
			
			if (this.options.data.drawPoints) {
				point = new shape(pointSize)
					.fill(colour)
					.stroke('#fff', pointSize / 3)
					.moveTo(coords.x - halfPoint, coords.y - halfPoint);
				point.subscribe('mouseover', this._mouseoverPoint.pass([point, colour], this));
				point.subscribe('mouseout', this._mouseoutPoint.pass(point, this));
				if (item.onClick) {
					point.subscribe('click', item.onClick, item);
				}
				if (this.options.data.showLabels) {
					point.indicate('pointer', label);
				}
				points.push(point);
			}
			if (!i) {
				line.moveTo(coords.x, coords.y);
			} else {
				line.lineTo(coords.x, coords.y);
			}
		}
		var lineShape = new ART.Shape(line, this.options.width + this.options.padding * 2, this.options.height + this.options.padding * 2)
			.stroke(colour, 2) // TODO configurable
			.inject(this.art);
		for (var i = 0; i < points.length; i++) {
			points[i].inject(this.art);
		}
	}
});

seqta.ui.Graph.VertBar = new Class({
	Extends: seqta.ui.Graph.XGraph,
	
	options: {
		data: {
			spacing: 4,
			radius: 2
		}
	},
	
	Binds: [],
	
	_renderSet: function(dataset, colour) {
		var halfGrid = this._yGridSize / 2;
		var item, datum, label, coords, bar;
		for (var i = 0; i < dataset.length; i++) {
			item = dataset[i];
			datum = item.y || item.x || item;
			label = item.label || datum;
			coords = this.coordsOf(datum, i);
			
			bar = new ART.Rectangle(this._yGridSize - (this.options.data.spacing * 2), datum * this._yPixPerPoint, this.options.data.radius)
				//.stroke(#fff, 2)
				.fill(colour)
				.inject(this.art);
			bar.moveTo(coords.x - halfGrid + this.options.data.spacing, coords.y);
			if (item.onClick) {
				bar.subscribe('click', item.onClick, item);
			}
			if (this.options.data.showLabels) {
				bar.indicate('pointer', label);
			}
			bar.inject(this.art);
		}
	}
});

seqta.ui.Graph.Pie = new Class({
	Extends: seqta.ui.Graph.Base,
	
	options: {
		data: {
			pointSize: 8,
			showLabels: true
		}
	},
	
	Binds: [],
	
	_total: 0,
	
	draw: function(dataset, colours) {
		colours = (colours && colours.length) ? colours : this.options.colors;
		this._updateSizes();
		this._updateTotal(dataset);
		this.clear();
		this._drawBackground();
		this._renderSet(dataset, colours);
		this._drawLegend(dataset, colours);
	},
	
	_renderSet: function(dataset, colours) {
		var item, datum, offset = 0, shape, length, colour, label, text;
		var factor = 360 / this._total;
		var size = Math.min(this._graphWidth, this._graphHeight) / 2;
		var group = new ART.Group();
		var pill;
		for (var i = 0; i < dataset.length; i++) {
			colour = colours[i % colours.length];
			item = dataset[i];
			datum = Math.abs(item.x || item.y || item);
			label = item.label || datum;
			length = factor * datum;
			
			shape = new ART.Wedge(0, size, offset, offset + length);
			shape.fill(colour);
			shape.stroke('#fff', 2); // TODO customisable
			shape.inject(group);
			
			shape.subscribe('mouseover', this._highlight.pass([shape, colour]));
			shape.subscribe('mouseout', this._lowlight.pass([shape, colour]));
			if (item.onClick) {
				shape.subscribe('click', item.onClick, item);
			}
			if (this.options.data.showLabels) {
				shape.indicate('pointer', label);
			}
			
			offset += length;
		}
		var x = (this._graphWidth - size * 2) / 2;
		var y = (this._graphHeight - size * 2) / 2;
		
		group.moveTo(this._leftOffset + x, this._topOffset + y)
		group.inject(this.art);
	},
	
	_highlight: function(shape, colour) {
		// Move it to the top of the stack
		var parent = shape.element.parentNode;
		shape.eject();
		shape.inject(parent);
		shape.stroke(colour, 8); // TODO customisable
	},
	
	_lowlight: function(shape, colour) {
		shape.stroke('#fff', 2); // TODO customisable
	},
	
	_updateSizes: function() {
		this._leftOffset = this._rightOffset = this._topOffset = this._bottomOffset = this.options.padding;
		
		if (this.options.legend.drawLegend) {
			switch (this.options.legend.placement) {
				case 'top':
					this._topOffset += this.options.legend.size;
					break;
				case 'right':
					this._rightOffset += this.options.legend.size;
					break;
				case 'left':
					this._leftOffset += this.options.legend.size;
					break;
				case 'bottom': /* fall through */
				default:
					this._bottomOffset += this.options.legend.size;
					break;
			}
		}
		
		this._graphWidth = this.options.width - this._leftOffset - this._rightOffset;
		this._graphHeight = this.options.height - this._topOffset - this._bottomOffset;
	},
	
	_updateTotal: function(dataset) {
		this._total = 0;
		var item;
		for (var i = 0; i < dataset.length; i++) {
			item = dataset[i];
			this._total += Math.abs(item.x || item.y || item);
		}
	},
	
	_drawLegend: function(dataset, colours) {
		var item, label, colour;
		for (var i = 0; i < dataset.length; i++) {
			item = dataset[i];
			label = item.label || Math.abs(item.x || item.y || item);
			colour = colours[i % colours.length];
			this.parent(label, colour, i);
		}
	}
})

})();