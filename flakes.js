var Flake = Flake || {};

Flake.distance = function(point1, point2) {
    // Given two "point" objects (each containing numerical "x" and "y" properties), return the
    // Euclidean distance between them.

    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));    
};

Flake.makeSegment = function(point1, point2) {
    // Return an object representing the line segment from point 1 to point 2
    // "Points' are objects containing an x and y coordinate

    // Store the line as coefficients of the equation ax + by = c.
    // Knowing those coefficients helps us calculate intersections.

    var a = point2.y - point1.y,
        b = point1.x - point2.x,
        c = a * point1.x + b * point1.y,

        minX = Math.min(point1.x, point2.x),
        maxX = Math.max(point1.x, point2.x),
        minY = Math.min(point1.y, point2.y),
        maxY = Math.max(point1.y, point2.y);

    return {

        getCoefficients: function() {
                             return { a: a, b: b, c: c };
                         },

        getPoints: function() {
                       // Return the points used to make this line (the "ends" of the line).
                       // Construct new point objects so callers won't be able to modify ours.
                       
                       return [ { x: point1.x, y: point1.y }, { x: point2.x, y: point2.y } ];
                   },

        inRange: function(pt) {
                     // Test whether an { x, y } pair has x and y values in between our two points.
                     // The "0.01" is to allow tolerance for floating point issues.

                     return minX <= pt.x + 0.01 && pt.x - 0.01 <= maxX && minY <= pt.y + 0.01 && pt.y - 0.01 <= maxY;
        },

        intersection: function(line) {
                          // Find the intersection of this line segment with the segment passed as "line".
                          // Returns null if they don't intersect .
                        
                          var coeffs = line.getCoefficients(), 
                            det = a * coeffs.b - coeffs.a * b,
                            result = null;

                          if (det !== 0) {
                              // If determinant is 0, lines are parallel, otherwise can calculate an intersection.
                              result = {
                                  x: (coeffs.b * c - b * coeffs.c) / det,
                                  y: (a * coeffs.c - coeffs.a * c) / det
                              };
                              if (!this.inRange(result) || !line.inRange(result)) {
                                  // Even if we were able to calculate an intersection, the line segments may not 
                                  // "reach" each other.
                                  result = null;
                              }
                          }

                          return result;
                      }
    };
};

Flake.makeTriangle = function(x, y, height, angle) {
    // A "triangle" is an object containing an array of points that describe some shape.
    // The shape will initially be a triangle. 
    // The initial triangle will be isosceles, with a height of "height" and the angle at the vertex
    // given by "angle", and with the vertex centered at (x, y).
    //
    // The shape is displayed by stepping through the array of points, drawing a line from each point
    // to the next. Then fill in the shape.
    //
    // This triangle can be "cut" to yield a new shape.

    var base = 2 * (Math.tan(angle / 2) * height),
        points = [{ x: x, y: y }, { x: height + x, y: base * 0.5 + y }, { x: height + x, y: -base * 0.5 + y}],

        pivot = { x: x, y: y },  // when "flipped" the shape will be flipped around this point

        currentState = { points: points.slice(), next: null, prev: null };

    function linesFromPoints(pts) {
        // Convert a set of "points" into a series of line segments
        // that have a handy intersection method.

        var i, lines = [];

        for (i = 0; i < pts.length - 1; i++) {
            lines.push(Flake.makeSegment(pts[i], pts[i + 1]));
        }
        lines.push(Flake.makeSegment(pts[pts.length - 1], pts[0]));

        return lines;
    }

    function pointsFromLines(lines) {
        // Converts a series of line segments into a series of points.
        
        return lines.map(function(line) { return line.getPoints()[0] });
    }

    function getIntersection(line) {
        // Given a line segment created by Flake.makeSegment, figure out where on the outside of our shape
        // the segment intersects.
    
        var i, intersection, lines = linesFromPoints(points);
        for (i = 0; i < lines.length; i++) {
            intersection = line.intersection(lines[i]);
            if (intersection) {
                return { lineNumber: i, intersection: intersection };
            }
        }
    }

    return {
        cut: function(cuts) {
                 // Cuts a piece from our current shape, yielding a new shape.
                 // The "cuts" parameter is just an array of { x, y } points describing the shape of the cut.
                 //
                 // The cuts must intersect the exterior of our shape (according to "getIntersection") between the first
                 // pair of points and between the last pair of points.
                 //
                 // To perform the cut, remove any points in our shape's points array that are between the two intersection points.
                 // And, with some adjustment, incorporate the points of the cut into our shape, putting them in between the two intersection 
                 // points. By incorporating the points of the cut into our shape, we get a new shape that follows the outline of the cut.
              
                 var distances, i, next, newPoints, newState;
                
                 // find the intersections on both ends of the "cut"
                 var intersections = [
                         Flake.makeSegment(cuts[0], cuts[1]), 
                         Flake.makeSegment(cuts[cuts.length - 2], cuts[cuts.length - 1])
                    ].map(getIntersection); 

                 if (!intersections[0] || !intersections[1]) {
                     console.log('Cuts must intersect the shape on both ends.');
                     return;
                 }

                 // We'll have to remove the parts of our shape that are between the two intersections, so figure out how many
                 // elements of the points array we need to remove.
                 var spliceStart = Math.min(intersections[0].lineNumber, intersections[1].lineNumber) + 1,
                 spliceLength = Math.abs(intersections[0].lineNumber - intersections[1].lineNumber);

                 // At first, part of the cut will extend outside of our shape. Remove that part of the cut, so that when we
                 // add the cut's points, we aren't extending the shape but only cutting it.
                 cuts[0] = intersections[0].intersection;
                 cuts[cuts.length - 1] = intersections[1].intersection;

                 // Make sure the cut flows in the right direction. Since the points in our shape have an order, we want the 
                 // beginning of the cut to be at an earlier point of the shape, and the end of the cut to be later.
                 // So reverse the cut if this isn't already the case.
                 // We know the cut is going the wrong direction if the line number of the first intersection is greater
                 // than that of the second. If the two line numbers are equal, then check whether the first point of the cut
                 // is closer to an earlier point of the shape. If not closer, reverse the order of the cut.
                 if (intersections[1].lineNumber < intersections[0].lineNumber) {
                     cuts.reverse();
                 } else if (intersections[0].lineNumber === intersections[1].lineNumber) {
                     next = intersections[0].lineNumber + 1;
                     if (next >= points.length) {
                         next = 0;
                     }
                     
                     distances = [
                            Flake.distance(cuts[0], points[intersections[0].lineNumber]),
                            Flake.distance(cuts[cuts.length - 1], points[intersections[0].lineNumber])
                         ];
                     
                     if (distances[0] > distances[1]) {
                         cuts.reverse();
                     }
                 }
   
                 // Update the points array to reflect the cut 
                 Array.prototype.splice.apply(points, [spliceStart, spliceLength].concat(cuts));
                 
                 // Store our current set of points, linking it to the previous "currentState"
                 newState = { prev: currentState, next: null, points: points.slice() };
                 currentState.next = newState;
                 currentState = newState;
             },

        display: function(ctx, color) {
                     // Display this shape in the given graphics context, in a the given color
                     
                     var oldFillStyle = ctx.fillStyle;
                     this.prepareStroke(ctx);
                     ctx.fillStyle = color;
                     ctx.fill();
                     ctx.fillStyle = oldFillStyle;
                 },

        verticalFlip: function() {
                          // Invert our shape vertically 
                          // It's flipped around the y value of our "pivot" variable
                          // This is helpful when turning the shape into a snowflake
                          
                          var i;
                          this.showPoints();
                          for (i = 0; i < points.length; i++) {
                              points[i].y = 2 * pivot.y - points[i].y;
                          }
              },

        getDimensions: function() {
                           // Get the dimensions of our original triangle (not necessarily
                           // the current bounds of the shape). 

                           return { x: height, y: base };
                       },

        prepareStroke: function(ctx) {
                           // Begin a path within the given canvas context and lay down
                           // lines following the path between the points in our shape,
                           // but without actually *drawing* the lines.

                           var i;
                           ctx.beginPath(); 
                           ctx.moveTo(points[0].x + x, points[0].y + y);
                           for (i = 1; i < points.length; i++) {
                               ctx.lineTo(points[i].x + x, points[i].y + y);
                           }
                           ctx.closePath();
                },

        redo: function() {
                  // Advance to the next state in our states list. This is what happens if
                  // a user clicks "redo." See also "undo."
                  
                  if (currentState.next) {
                      currentState = currentState.next;
                      points = currentState.points.slice();
                  }
              },

        showPoints: function() {
                        // For debugging convenience.
                        return JSON.stringify(points);
                    },

        translate: function(xMove, yMove) {
                       // Move the shape around. The shape will move up by the number of pixels 
                       // given by "yMove" and right by "xMove."
                       
                       var i;
                       pivot.x += xMove;
                       pivot.y += yMove;
                       for (i = 0; i < points.length; i++) {
                           points[i].x += xMove;
                           points[i].y += yMove;
                       }
                   },
        
        undo: function() {
                  // Undo the most recent cut by setting the points array to whatever it was before the
                  // cut.

                  if (currentState.prev) {
                      currentState = currentState.prev;
                      points = currentState.points.slice();
                  }
              }
    };
};

Flake.newCut = function() {
    // Return an object representing a new "cut." Each cut consists of zero or more "snips," 
    // or straight-line segments representing the shape of the cut.

    var snips = [];  
    return {
        canFinish: function() {
                       return snips.length > 1;
                   },
        getSnips: function() {
                      return snips.slice(); 
                  },
        add: function(cut) {
                      console.log(cut);
                      snips.push(cut);
                  },
        isStarted: function() {
                        return snips.length > 0;
                   },
        updateMark: function(ctx) {
                        var topSnip = snips[snips.length - 1], prevSnip;
                        ctx.fillStyle = '#ff0000';
                        ctx.fillRect(topSnip.x - 1, topSnip.y - 1, 2, 2);

                        if (snips.length > 1) {
                           prevSnip = snips[snips.length - 2]; 
                           ctx.beginPath();
                           ctx.moveTo(prevSnip.x, prevSnip.y);
                           ctx.lineTo(topSnip.x, topSnip.y);
                           ctx.stroke();
                        }
                    }
    };
};

window.onload = function() {
    
    var canvas = document.getElementsByTagName('canvas')[0],
        undoButton = document.getElementById('undo'),
        redoButton = document.getElementById('redo'),
        unfoldCanvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        width = canvas.width,
        height = canvas.height,
        
        triangle = Flake.makeTriangle(0, 0, width * 0.9, 2 * Math.PI / 12),
        foldedX = (width - triangle.getDimensions().x) / 2,
        foldedY = height / 2,
        
        cutHistory = [],
        cut = Flake.newCut();

    triangle.translate(foldedX, foldedY);

    function undo() {
        triangle.undo();
        resetDisplay();
    }
    undoButton.onclick = undo;

    function redo() {
        triangle.redo();
        resetDisplay();
    }
    redoButton.onclick = redo;

    // temp unfold stuff
    var unfoldCanvas = document.createElement('canvas'),
        unfoldContext = unfoldCanvas.getContext('2d');
    unfoldCanvas.setAttribute('width', width);
    unfoldCanvas.setAttribute('height', width);
    document.body.appendChild(unfoldCanvas);
    unfoldContext.scale(1/2, 1/2);
    unfoldContext.translate(width, width);
    
    // end temp unfold stuff
   
    function updateUnfold() {
        var i;

        unfoldContext.fillStyle = '#000000';
        unfoldContext.fillRect(-width * 2, -height * 2, width * 4, height * 4);
        triangle.translate(-foldedX, -foldedY);
        for (i = 0; i < 12; i++) {
            triangle.display(unfoldContext, '#ffffff');

            // Adding a stroke ensures there is no blank space between sections
            unfoldContext.lineWidth = 2;
            unfoldContext.strokeStyle = '#ffffff';
            unfoldContext.stroke();  

            triangle.verticalFlip();
            unfoldContext.rotate(2 * Math.PI / 12);
        }
        triangle.translate(foldedX, foldedY);
    } 

    function markCut(x, y) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    function resetDisplay() {
        ctx.fillStyle = '#061d2b'; 
        ctx.fillRect(0, 0, width, height);
        triangle.display(ctx, '#ffffff');
        updateUnfold();
    }

    function triangleContains(x, y) {
        triangle.prepareStroke(ctx);
        return ctx.isPointInPath(x, y);
    }

    resetDisplay();

    canvas.addEventListener('mousedown', function(e) {
        var x = 0, y = 0;
        do {
            x += e.offsetX;
            y += e.offsetY;
        } while (e = e.offsetParent);
        console.log(triangle.showPoints());
    
        console.log(triangleContains(x, y));
        if (triangleContains(x, y)) {
            if (cut.isStarted()) {
                cut.add({ x: x, y: y });
                markCut(x, y);
            }
        } else {
            if (cut.canFinish()) {
                cut.add({ x: x, y: y });
                cutHistory.push(cut.getSnips());
                console.log(JSON.stringify(cutHistory));
                triangle.cut(cut.getSnips());
                cut = Flake.newCut();
                resetDisplay();
            } else { 
                cut = Flake.newCut();
                resetDisplay();
                cut.add({ x: x, y: y });
                markCut(x, y);
            }
        }

    });


    // For testing
    return;
    cuts = [[{"x":644,"y":47},{"x":474,"y":59},{"x":641,"y":142}],[{"x":639,"y":29},{"x":401,"y":-50},{"x":639,"y":-100}]];
    for (var i = 0; i < cuts.length; i++) {
        triangle.cut(cuts[i]);
        console.log('cut made');
        triangle.showPoints();
    }
    resetDisplay();
    // end testing
};

