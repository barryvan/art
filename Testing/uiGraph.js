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
	Implements: Options,
	
	options: {
		padding: 20,
		width: 400,
		height: 200,
		font: '10pt Calibri'
	},
	
	art: null,
	
	Binds: [
	
	],
	
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
	
	draw: function(dataset, colour) {
		// Stub
	}
});

seqta.ui.Graph.Line = new Class({
	Extends: seqta.ui.Graph,
	
	options: {
		background: '#fff',
		borderRadius: 8,
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
			//max: null, // TODO!
			drawAxis: true,
			drawLabels: true,
			drawGridLines: true,
			gridColor: '#ccc',
			axisColor: '#000',
			labelWidth: 40
		},
		data: {
			drawPoints: true,
			showLabels: true,
			pointSize: 10,
			contain: true
		}
	},
	
	_yPixPerPoint: -1,
	_xPixPerPoint: -1,
	_yGridSize: 10,
	_xGridSize: 10,
	_maxDelta: 0,
	_maxValue: 0,
	_minValue: 0,
	
	_leftOffset: 0,
	_rightOffset: 0,
	_topOffset: 0,
	_bottomOffset: 0,
	
	_graphWidth: 0,
	_graphHeight: 0,
	
	_datasets: [],
	
	Binds: [
		
	],
	
	initialize: function(options, parent) {
		this.parent(options, parent);
	},
	
	reset: function() {
		this.parent();
		this._datasets = [];
		this._yPixPerPoint = -1;
		this._xPixPerPoint = -1;
	},
	
	draw: function(dataset, colour, shape) {
		this._datasets.push({
			data: dataset,
			colour: colour,
			shape: shape
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
				this._renderSet(set.data, set.colour, set.shape);
			}
		} else {
			this._renderSet(dataset, colour, shape);
		}
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
	
	_mouseoverPoint: function(point, colour, item) {
		point.stroke(colour, this.options.data.pointSize / 3);
	},
	
	_mouseoutPoint: function(point, item) {
		point.stroke('#fff', this.options.data.pointSize / 3);
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
		var startAt = this._maxDelta - Math.abs(this._minValue);
		
		//var adjustment = Math.abs(this._minValue / this.options.yAxis.interval);
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
	
	_renderSet: function(dataset, colour, shape) {
		// TODO: Make points an instance of ART.Shape that can be specified when
		// drawing a set. Must take a single parameter: size.
		var pointSize = this.options.data.pointSize;
		var halfPoint = (pointSize / 2);
		
		shape = shape || ART.Dot;
		
		var line = new ART.Path();
		var points = [];
		for (var i = 0; i < dataset.length; i++) {
			var item = dataset[i];
			var datum = item.x || item;
			var label = item.label || datum;
			var datumX = (i + .5) * this._xPixPerPoint + this._leftOffset;
			var datumY = (this._graphHeight - (datum + Math.abs(this._minValue)) * this._yPixPerPoint + this._topOffset);
			
			if (this.options.data.drawPoints) {
				var point = new shape(pointSize)
					.fill(colour)
					.stroke('#fff', pointSize / 3)
					.moveTo(datumX - halfPoint, datumY - halfPoint);
				point.subscribe('mouseover', this._mouseoverPoint.pass([point, colour, item], this));
				point.subscribe('mouseout', this._mouseoutPoint.pass([point, item], this));
				if (item.onClick) {
					point.subscribe('click', item.onClick, item);
				}
				if (this.options.data.showLabels) {
					point.indicate('pointer', label);
				}
				points.push(point);
			}
			if (!i) {
				line.moveTo(datumX, datumY);
			} else {
				line.lineTo(datumX, datumY);
			}
		}
		var lineShape = new ART.Shape(line, this.options.width + this.options.padding * 2, this.options.height + this.options.padding * 2)
			.stroke(colour, 2) // TODO configurable
			.inject(this.art);
		for (var i = 0; i < points.length; i++) {
			points[i].inject(this.art);
		}
	},
	
	/* Return true if either changes. */
	_updateSizes: function(dataset) {
		var result = false;
		var count = dataset.length;
		
		this._maxValue = Math.max(this._maxValue, this._max(dataset));
		this._minValue = Math.min(this._minValue, this._min(dataset));
		this._maxDelta = Math.max(this._maxDelta, Math.abs(this._maxValue) + Math.abs(this._minValue));
		
		this._leftOffset = this._rightOffset = this._topOffset = this._bottomOffset = this.options.padding;
		this._leftOffset += (this.options.yAxis.drawLabels) ? this.options.yAxis.labelWidth : 0;
		this._bottomOffset += (this.options.xAxis.drawLabels && this.options.xAxis.labels.length) ? this.options.xAxis.labelHeight : 0;
		
		this._graphWidth = this.options.width - this._leftOffset - this._rightOffset;
		this._graphHeight = this.options.height - this._topOffset - this._bottomOffset;
		
		var newYPix = (this._graphHeight / this._maxDelta);
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
		
		console.log('[ pix.x] ', this._xPixPerPoint, ' => ', newXPix);
		console.log('[ pix.y] ', this._yPixPerPoint, ' => ', newYPix);
		console.log('[size.x] ', this._xGridSize, ' => ', newXSize);
		console.log('[size.y] ', this._yGridSize, ' => ', newYSize);
		
		result = result || (newYPix != this._yPixPerPoint) || (newXPix != this._xPixPerPoint);
		result = result || (newYSize != this._yGridSize) || (newXSize != this._xGridSize);
		
		this._yPixPerPoint = newYPix;
		this._xPixPerPoint = newXPix;
		this._yGridSize = newYSize;
		this._xGridSize = newXSize;
		
		return result;
	},
	
	_max: function(array) {
		var max = 0, item;
		for (var i = 0; i < array.length; i++) {
			item = (array[i].x || array[i]);
			if (item > max) max = item;
		}
		if (this.options.data.contain && this.options.yAxis.interval) {
			return max + this.options.yAxis.interval;
		}
		return max;
	},
	
	_min: function(array) {
		var min = 0, item;
		for (var i = 0; i < array.length; i++) {
			item = (array[i].x || array[i]);
			if (item < min) min = item;
		}
		if (this.options.data.contain && this.options.yAxis.interval) {
			return min - this.options.yAxis.interval;
		}
		return min;
	}
});

})();