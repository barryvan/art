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
		font: '10px Helvetica',
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
	_q: 0.5,
	
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
			this.options.width = parentSize.x || this.options.width || 400;
			this.options.height = parentSize.y || this.options.height || 200;
		}
		
		this.art = new ART(this.options.width, this.options.height);
		if (parent) {
			parent.grab($(this.art));
		}
		
		if (!this.options.colors.length) {
			this.options.colors = [ // From LibreOffice. :)
				'#004586', '#ff420e', '#ffd320', '#597d1c', '#7e0021', '#83caff',
				'#314004', '#aecf00', '#4b1f6f', '#ff950e', '#c5000b', '#0084d1'
			];
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
		if (!Browser.ie8) $(this.art).getChildren().destroy();
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
			//case 'bottom': /* fall through */
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
			.inject(this.art);
		
		var label = new ART.Text(legend, this.options.font, 'left');
		label.fill('#000');
		label.moveTo(x + pointSize * 2, y);
		label.inject(this.art);
	},
	
	_subscribe: function(shape, type, handler, item, coords) {
		if (!type) return null;
		if (!handler) return null;
		if (typeOf(handler) !== 'function') return null;
		
		var extra = arguments.length > 5 ? Array.slice(arguments, 5) : undefined;
		
		return shape.subscribe(type, function(event) {
			handler.apply(item, [shape, coords, item, event].append(extra));
		}, item);
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
			labelHeight: 20,
			lineWidth: 1,
			labelRotation: 0
		},
		yAxis: {
			interval: 10,
			upper: null,
			lower: null,
			drawAxis: true,
			drawLabels: true,
			drawGridLines: true,
			gridColor: '#ccc',
			axisColor: '#000',
			labelWidth: 40,
			lineWidth: 1
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
		if (options.yAxis && (options.yAxis.upper === options.yAxis.lower)) {
			options.yAxis.upper += 1;
			options.yAxis.lower -= 1;
		}
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
				if (set.extra && set.extra.legend) {
					this._drawLegend(set.extra.legend, set.colour, i, set.extra);
				}
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
		if (this.options.yAxis.lower || this.options.yAxis.lower === 0) {
			datum = Math.max(datum, this.options.yAxis.lower);
		}
		if (this.options.yAxis.upper || this.options.yAxis.upper === 0) {
			datum = Math.min(datum, this.options.yAxis.upper);
		}
		return this._graphHeight - (datum + Math.abs(this._minYValue)) * this._yPixPerPoint + this._topOffset;
	},
	
	_renderXAxis: function() {
		if (!this.options.xAxis.drawAxis) return;
		
		// Don't need  + this._q here for some reason. :/
		
		var line = new ART.Path();
		line.moveTo(0, 0).lineTo(
			this._graphWidth,
			0
		);
		var lineShape = new ART.Shape(
			line,
			this._graphWidth ,
			this.options.yAxis.lineWidth || 1
		).stroke(this.options.xAxis.axisColor)
		 .moveTo(
				this._leftOffset + this._q,
				(this._graphHeight + this._topOffset).floor() + this._q
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
			this.options.yAxis.lineWidth || 1,
			this._graphHeight - this._q
		).stroke(this.options.yAxis.axisColor)
		 .moveTo(
				this._leftOffset + this._q,
				this._topOffset + this._q
			)
		 .inject(this.art);
	},
	
	_drawXLabels: function() {
		if ((!this.options.xAxis.drawLabels) || (!this.options.xAxis.labels.length)) return;
		
		var rotation = this.options.xAxis.labelRotation;
		
		var count = (this._graphWidth / this._yGridSize).round();
		// TODO: Don't use labels.length: instead, use longest set of data we have
		var multiplicator = this.options.xAxis.labels.length / count;
		var halfMult = multiplicator / 2;
		var j = 0;
		var text = '';
		for (var i = 0; i < count; i++) {
			j = (i * multiplicator).round();
			text = this.options.xAxis.labels[j];
			if (!text) continue;
			var datumX = (j + halfMult) * this._xPixPerPoint + this._leftOffset;
			var label = new ART.Text(text, this.options.font, 'center');
			label.fill('#000');
			label.moveTo(datumX, this.options.height - this._bottomOffset + (this.options.padding / 2));
			label.inject(this.art);
			if (rotation) {
				label.rotateTo(rotation);
			}
		}
	},
	
	_drawYLabels: function() {
		if (!this.options.yAxis.drawLabels) return;
		
		var count = this._graphHeight / this._xGridSize;
		var startAt = this._maxYDelta - Math.abs(this._minYValue);
		
		var adjust = this.options.font.toInt();
		adjust = isNaN(adjust) ? 7 : (adjust / 2); // Magic number 7. :)
		
		//var adjustment = Math.abs(this._minYValue / this.options.yAxis.interval);
		var i = count.round();
		while (i-- > 0) {
			// Ideally, we'd just be able to vertically align the text.
			var datumY = this._topOffset + (i * this._xGridSize) - adjust;
			var datum = '' + (startAt - (i * this.options.yAxis.interval)).round();
			var label = new ART.Text(datum, this.options.font, 'right');
			label.fill('#000'); // TODO
			label.moveTo(this._leftOffset - (this.options.padding / 2), datumY);
			label.inject(this.art);
		}
	},
	
	// Draw horizontal gridlines
	_renderXGrid: function() {
		if (!this.options.xAxis.drawGridLines) return;
		
		// Don't need  + this._q for some reason here... :/
		
		var lineWidth = this.options.xAxis.lineWidth || 1;
		
		var count = this._graphHeight / this._xGridSize;
		for (var i = 0; i < count; i++) {
			var line = new ART.Path();
			line.moveTo(0, 0).lineTo(this._graphWidth, 0);
			var lineShape = new ART.Shape(line, this._graphWidth, lineWidth)
				.stroke(this.options.xAxis.gridColor, lineWidth)
				.moveTo(this._leftOffset + this._q, (i * this._xGridSize + this._topOffset).floor() + this._q)
				.inject(this.art);
		}
	},
	
	// Draw vertical gridlines
	_renderYGrid: function() {
		if (!this.options.yAxis.drawGridLines) return;
		
		var lineWidth = this.options.yAxis.lineWidth || 1;
		
		var count = this._graphWidth / this._yGridSize + 1;
		for (var i = 1; i < count; i++) {
			var line = new ART.Path();
			line.moveTo(0, 0).lineTo(0, this._graphHeight - this._q);
			var lineShape = new ART.Shape(line, lineWidth, this._graphHeight - this._q) // TODO: make line width configurable
				.stroke(this.options.yAxis.gridColor, lineWidth)
				.moveTo((i * this._yGridSize + this._leftOffset).floor() + this._q, this._topOffset + this._q)
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
		this._maxXValue = Math.max(this._maxXValue, maxValue.x);
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
		newYSize = Math.max(newYSize, 1);
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
			if (!array[i]) continue;
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
		if (this.options.yAxis.upper || this.options.yAxis.upper === 0) {
			yMax = this.options.yAxis.upper;
		}
		return {
			x: xMax,
			y: yMax
		};
	},
	
	_min: function(array) {
		var yMin = 0, xMin = 0, xItem, yItem;
		for (var i = 0; i < array.length; i++) {
			if (!array[i]) continue;
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
		if (this.options.yAxis.lower || this.options.yAxis.lower === 0) {
			yMin = this.options.yAxis.lower;
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
			drawStarts: true,
			drawEnds: true,
			pointSize: 8,
			lineWidth: 2
		}
	},
	
	Binds: [
		'_mouseoverPoint',
		'_mouseoutPoint'
	],
	
	_mouseoverPoint: function(shape, coords, item, event, colour, drawPoint) {
		var c = new ART.Color(colour);
		c.alpha = 0.3;
		shape.fill(colour).stroke(c, this.options.data.pointSize / 2);
	},
	
	_mouseoutPoint: function(shape, coords, item, event, colour, drawPoint) {
		// TODO
		shape.fill(drawPoint ? colour : 'rgba(0,0,0,0)').stroke(drawPoint ? '#fff' : 'rgba(0,0,0,0)', this.options.data.pointSize / 2);
	},
	
	_renderSet: function(dataset, colour, extra) {
		var pointSize = this.options.data.pointSize;
		var halfPoint = (pointSize / 2);
		var lineWidth = this.options.data.lineWidth || 2;
		
		var shape = (extra && extra.shape) || ART.Dot;
		shape = (typeOf(shape) === 'class') ? shape : ART.Dot;
		
		var line = new ART.Path();
		var points = [];
		var item, datum, label, coords, point;
		var restart = true;
		var drawPoint = true;
		for (var i = 0; i < dataset.length; i++) {
			item = dataset[i];
			if ((!item) && (item !== 0)) {
				restart = true;
				continue;
			}
			datum = item.y || item.x || item;
			label = item.label || datum;
			coords = this.coordsOf(datum, i);
			
			drawPoint = this.options.data.drawPoints;
			drawPoint = drawPoint || (this.options.data.drawStarts && restart || (!i));
			drawPoint = drawPoint || (this.options.data.drawEnds && ((i === dataset.length - 1) || (dataset[i + 1] === null)));
			point = new shape(pointSize)
				.fill(drawPoint ? colour : 'rgba(0,0,0,0)')
				.stroke(drawPoint ? '#fff' : 'rgba(0,0,0,0)', pointSize / 3) // TODO
				.moveTo(coords.x - halfPoint, coords.y - halfPoint);
			
			var calcCoords = {
				x: coords.x,
				y: coords.y,
				w: 0,
				h: 0
			};
			
			this._subscribe(point, 'click', item.onClick, item, calcCoords, colour, drawPoint);
			this._subscribe(point, 'mouseover', item.onEnter, item, calcCoords, colour);
			this._subscribe(point, 'mouseout', item.onLeave, item, calcCoords, colour);
			
			this._subscribe(point, 'mouseover', this._mouseoverPoint, item, calcCoords, colour, drawPoint);
			this._subscribe(point, 'mouseout', this._mouseoutPoint, item, calcCoords, colour, drawPoint);
			
			points.push(point);
			if (restart || (!i)) { // Always restart when we're at the start.
				line.moveTo(coords.x, coords.y);
			} else {
				line.lineTo(coords.x, coords.y);
			}
			restart = false;
		}
		var lineShape = new ART.Shape(line, this.options.width + this.options.padding * 2, this.options.height + this.options.padding * 2)
			.stroke(colour, lineWidth)
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
			radius: 4,
			fancy: true
		}
	},
	
	Binds: [
		'_highlight'
	],
	
	_highlighter: null,
	
	_renderSet: function(dataset, colour, extra) {
		var halfGrid = this._yGridSize / 2;
		
		var item, datum, coords, bar, height, width, x, y, decoration, radius, shape, shapeSize;
		
		radius = this.options.data.radius || 0;
		shapeSize = 8; // TODO
		
		for (var i = 0; i < dataset.length; i++) {
			item = dataset[i];
			datum = item.y || item.x;
			if ((!datum) && (datum !== 0)) {
				datum = item;
			}
			coords = this.coordsOf(datum, i);
			height = (datum * this._yPixPerPoint).ceil(); // Make sure we're a whole pixel (+ floor)
			if (height <= 0) continue;
			width = (this._yGridSize - (this.options.data.spacing * 2)).ceil(); // Make sure we're a whole pixel (+ floor)
			x = (coords.x - halfGrid + this.options.data.spacing).floor() + this._q;
			y = coords.y.floor() + this._q;
			
			bar = new ART.Rectangle(width, height, [radius, radius, 0, 0])
				.fill(item.color || colour)
				.stroke('rgba(0,0,0,0.25)')
				.moveTo(x, y)
				.inject(this.art);
			
			if (item.lines) {
				for (var j = 0; j < item.lines.length; j++) {
					var line = item.lines[j];
					var lineColour = line.color || 'rgba(0,0,0,0.5)';
					var lineY = this.yCoordOf(line.y || line.x).floor() + this._q;
					var linePath = new ART.Path()
							.moveTo(x, lineY)
							.lineTo(x + width, lineY);
					var lineShape = new ART.Shape(linePath, x + width, line.width || 1) // TODO
							.stroke(lineColour, line.width || 1, 'butt')
							.inject(this.art);
				}
			}
			
			var calcCoords = {
				x: x,
				y: y,
				w: width,
				h: height
			};
			
			var highlighter = new ART.Rectangle(width + 4, height + 2, [radius, radius, 0, 0])
				.fill('rgba(0,0,0,0)')
				.stroke('rgba(0,0,0,0)')
				.moveTo(x - 2, y - 2)
				.inject(this.art);
			
			this._subscribe(highlighter, 'click', item.onClick, item, calcCoords);
			this._subscribe(highlighter, 'mouseover', item.onEnter, item, calcCoords);
			this._subscribe(highlighter, 'mouseout', item.onLeave, item, calcCoords);
			
			this._subscribe(highlighter, 'mouseover', this._highlight, item, calcCoords, item.color || colour);
			this._subscribe(highlighter, 'mouseout', this._lowlight, item, coords);
		}
	},
	
	_highlight: function(shape, coords, item, event, colour) {
		var fill = new ART.Color(colour);
		fill.alpha = 0.3;
		var stroke = new ART.Color(colour);
		stroke.alpha = 0.7;
		
		shape.fill(fill).stroke(stroke, 2);
	},
	
	_lowlight: function(shape, coords, highlighter) {
		shape.fill('rgba(0,0,0,0)').stroke('rgba(0,0,0,0)', 2);
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
});

seqta.ui.Graph.InfoWindow = new Class({
	Implements: Options,
	
	Binds: [
		'toElement',
		'enter',
		'leave',
		'_defaultLabeller'
	],
	
	options: {
		relativeTo: null,
		labeller: null,
		verticalAllowance: 80
	},
	
	_element: null,
	_hideTimer: null,
	
	initialize: function(options, parent) {
		this.setOptions(options);
		this.options.relativeTo = $(this.options.relativeTo || document.body);
		this.options.labeller = this.options.labeller || this._defaultLabeller;
		
		this._parent = parent || document.body;
		
		this._element = new Element('div', {
			'class': 'graphInfo',
			'styles': {
				'position': 'absolute'
			}
		}).fade('hide');
	},
	
	toElement: function() {
		return this._element;
	},
	
	enter: function(shape, coords, item, event) {
		clearTimeout(this._hideTimer);
		
		var label = this.options.labeller(item);
		if (!label) return;
		
		// Update the content prior to measuring
		this._element.set('html', label).inject(this._parent);
		
		var relative = this.options.relativeTo.getCoordinates();
		var elDims = this._element.getComputedSize();
		
		var left = relative.left + coords.x + ((coords.w - elDims.totalWidth) / 2);
		left = left.limit(relative.left, relative.right - elDims.totalWidth);
		
		var top = relative.top + coords.y - elDims.totalHeight;
		if (top < relative.top - this.options.verticalAllowance) {
			top = relative.bottom - elDims.totalHeight;
		}
		top = top.limit(relative.top - this.options.verticalAllowance, relative.bottom - elDims.totalHeight)
		
		this._element.setStyles({
			left: left,
			top: top
		}).fade('in');
	},
	
	leave: function(shape, coords, item, event) {
		this._hideTimer = (function() {
			this._element.fade('out');
			this._hideTimer = this._element.dispose.delay(500, this._element);
		}).delay(100, this);
	},
	
	_defaultLabeller: function(item) {
		return item.label || JSON.encode(item);
	}
})

/* Internet Explorer destructo-beam */
if (Browser.ie6 || Browser.ie7) {
	seqta.ui.Graph.Line = seqta.ui.Graph.VertBar = seqta.ui.Graph.Pie = new Class({
		disabled: true,
		initialize: function() {},
		toElement: function() {},
		draw: function() {},
		reset: function() {},
		clear: function() {}
	});
	seqta.ui.Graph.disabled = true;
}

})();
