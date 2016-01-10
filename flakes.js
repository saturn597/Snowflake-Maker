var Flake = Flake || {};

Flake.distance = function(point1, point2) {
    // Given two "point" objects (each containing numerical "x" and "y" properties), return the
    // Euclidean distance between them.

    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
};

Flake.linesFromPoints = function(pts, close) {
    // Convert a set of "points" into a series of line segments
    // that have a handy intersection method.

    var i, lines = [];

    for (i = 0; i < pts.length - 1; i++) {
        lines.push(Flake.makeSegment(pts[i], pts[i + 1]));
    }

    if (close && pts.length > 2) {
        lines.push(Flake.makeSegment(pts[pts.length - 1], pts[0]));
    }

    return lines;
};

Flake.getIntersections = function(pts, segment, close) {
    // Given a line segment created by Flake.makeSegment, find all points where it intersects the exterior of our shape.
    //
    // Returns an array of objects, each of which contains the attributes "lineNumber" and "intersection."
    //
    // Attribute "lineNumber" indicates which of our lines was intersected. The attribute "intersection" is
    // an object containing x and y attributes to indicate the coordinates of the intersection.

    var i, intersection, intersections = [], lines = Flake.linesFromPoints(pts, close);
    for (i = 0; i < lines.length; i++) {
        intersection = segment.intersection(lines[i]);
        if (intersection) {
            intersections.push( { lineNumber: i, intersection: intersection } );
        }
    }
    return intersections;
};

Flake.getIntersection = function(pts, segment, close) {
    // Given a line segment created by Flake.makeSegment, find one point where it intersects the exterior of our shape.

    var result = Flake.getIntersections(pts, segment, close);
    if (result.length > 0) {
        return result[0];
    }
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
                          // Returns null if they don't intersect.

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

Flake.makeFolded = function(x, y, height, angle) {
    // A "folded" is an object containing an array of points that describe some shape. It is intended
    // to represent a piece of paper that has been folded as part of the process of making a "snowflake."
    //
    // The shape will initially be an isosceles triangle (consistent with a typical folded snowflake).
    //
    // The initial triangle will have a height of "height" and the angle at the vertex
    // given by "angle", and with the vertex centered at (x, y). (Vertex = the intersection of the two
    // equal sides).
    //
    // The typical angle for a folded snowflake will be pi / 6 radians (30 degrees).
    //
    // This shape can be "cut" to yield a new shape, using the cut method.
    //
    // We can display the "folded" shape using the "display" method. This works by stepping through the
    // array of points, drawing a line from each point to the next. Then fill in the shape.
    //
    // At any given time, the folded shape can also be displayed in "unfolded" form, as if we had finished cutting
    // unfolded it to see the snowflake we had made. This is done using the "displayUnfolded" method.

    var base = 2 * (Math.tan(angle / 2) * height),
        points = [{ x: x - height / 2, y: y }, { x: x + height / 2, y: base * 0.5 + y }, { x: x + height / 2, y: -base * 0.5 + y}],

        pivot = { x: x - height / 2, y: y },  // when "flipped" the shape will be flipped around this point
        originalVertex = { x: points[0].x, y: points[0].y },

        currentState = { points: points.slice(), next: null, prev: null };

   return {
        countIntersections: function(pts) {
                                var i, total = 0;
                                var lines = Flake.linesFromPoints(pts);

                                for (i = 0; i < lines.length; i++) {
                                    total += Flake.getIntersections(points, lines[i], true).length;
                                }

                                return total;
                           },

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
                 var cutLines = Flake.linesFromPoints(cuts),
                     intersections = [ cutLines[0], cutLines[cutLines.length - 1] ].map(function(seg) { return Flake.getIntersection(points, seg, close) });

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

        display: function(ctx, style) {
                     // Display this shape in the given graphics context, in the given style

                     var oldFillStyle = ctx.fillStyle;
                     this.prepareStroke(ctx);
                     ctx.fillStyle = style;
                     ctx.fill();
                     ctx.fillStyle = oldFillStyle;
                 },

        displayUnfolded: function(x, y, ctx, style, strokeWidth) {
                             // Display this shape in its "unfolded" form.
                             //
                             // To draw the snowflake unfolded, start by drawing the folded shape once. The vertex point marks
                             // the center of the unfolded snowflake.
                             //
                             // Now draw the folded shape again, but rotated around the vertex point by the vertex angle (so that, if it
                             // were still the original triangle, its edges would just line up with the first folded shape we drew).
                             // Also, flip the shape so that it's a mirror image of the original.
                             //
                             // Repeat this process until we have rotated in a complete circle, "flipping" the shape each time.
                             //
                             // Given a vertex angle of 30 degrees, this will result in a snowflake with 6-fold radial symmetry, like
                             // an actual snowflake.

                             var i;

                             // Calculate the number of times we'll have to draw the folded shape to make a complete circle.
                             var numSections = 2 * Math.PI / angle;

                             var oldStrokeStyle = ctx.strokeStyle,
                                 oldLineWidth = ctx.lineWidth;

                             ctx.strokeStyle = style;
                             ctx.lineWidth = strokeWidth;

                             // Temporarily move our coordinates so that the vertex is at (0, 0).
                             // Canvas rotations always center on the origin, so this is easier.
                             this.translate(-originalVertex.x, -originalVertex.y);

                             // We always center at the origin, but the caller asked us to center at (x, y).
                             // To make this work, move the whole canvas so that, for us, the origin is where
                             // (x, y) appears for the caller.
                             ctx.translate(x, y);

                             for (i = 0; i < numSections; i++) {
                                 this.display(ctx, style);

                                 // Adding a stroke ensures there is no blank space between sections
                                 ctx.lineWidth = strokeWidth;
                                 ctx.stroke();

                                 this.verticalFlip();
                                 ctx.rotate(angle);
                             }

                             // Put everything back where we found it.
                             this.translate(originalVertex.x, originalVertex.y);

                             ctx.translate(-x, -y);

                             ctx.strokeStyle = oldStrokeStyle;
                             ctx.lineWidth = oldLineWidth;
                         },

        getDimensions: function() {
                           // Get the bounds of our original triangle shape.
                           //
                           // This is the width and height of the smallest box that would contain
                           // that shape.
                           //
                           // This is not necessarily the bounds of the current shape.

                           return { x: height, y: base };
                       },

        prepareStroke: function(ctx) {
                           // Begin a path within the given canvas context and lay down
                           // lines following the path between the points in our shape,
                           // but without actually *drawing* the lines.

                           var i;
                           ctx.beginPath();
                           ctx.moveTo(points[0].x, points[0].y);
                           for (i = 1; i < points.length; i++) {
                               ctx.lineTo(points[i].x, points[i].y);
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
              },

        verticalFlip: function() {
                          // Invert our shape vertically
                          // It's flipped around the y value of our "pivot" variable
                          // This is helpful when turning the shape into a snowflake

                          var i;
                          for (i = 0; i < points.length; i++) {
                              points[i].y = 2 * pivot.y - points[i].y;
                          }
              }
    };
};

Flake.newCut = function() {
    // Return an object representing a new "cut." Each cut consists of zero or more
    // { x, y } point objects that describe the shape of the cut.

    var points = [];
    return {
        add: function(point) {
                 // Add a point to the cut
                 points.push(point);
             },
        canFinish: function() {
                       // Is cut a "complete" cut? Can't cut out only a single point
                       return points.length > 1;
                   },
        display: function(ctx, pointStyle, lineStyle) {
                     // Display the cut in the given context.
                     // Each point in our cut will be displayed using "pointStyle" and the lines
                     // in between using "lineStyle."

                     if (points.length === 0) {
                         return;
                     }

                     var prevSnip, i;
                     var oldStroke = ctx.strokeStyle;
                     var oldLine = ctx.lineStyle;
                     var topSnip = points[points.length - 1];

                     ctx.fillStyle = pointStyle;
                     ctx.strokeStyle = lineStyle;

                     ctx.beginPath();
                     ctx.moveTo(points[0].x, points[0].y);

                     for (i = 0; i < points.length; i++) {
                         ctx.fillRect(points[i].x - 1, points[i].y - 1, 2, 2);
                         ctx.lineTo(points[i].x, points[i].y);
                     }

                     ctx.stroke();
                 },
        getPoints: function() {
                       // Return a copy of the points describing the shape of the cut.
                       return points.slice();
                  },
        isStarted: function() {
                       // Have we started, i.e., added at least one point?
                       return points.length > 0;
                   },
        getLength: function() {
                       return points.length;
                },
        pop: function() {
                 points.pop();
             },
        validate: function(pt) {
                      // True if extending the cut to this point would yield a valid cut. False if not.
                      //
                      // Extending the cut to a point is valid iff the extension wouldn't cause the cut
                      // to cross itself.

                      var numLines = Flake.linesFromPoints(points, false).length;

                      if (numLines <= 1) {
                          return true;
                      }

                      var extension = Flake.makeSegment(points[points.length - 1], pt);
                      var intersections = Flake.getIntersections(points, extension, false);

                      return intersections.every(function(intersection) {
                          // The extension will probably intersect the existing cut
                          // at one point - the end of the existing cut, i.e., the segment
                          // that is currently the final line. Make sure the extension ONLY intersects
                          // there.
                          return intersection.lineNumber === numLines - 1;
                      });
                  }
    };
};

Flake.startUI= function() {
    var bgColor = '#061d2b',
        flakeColor = '#ffffff';

    var cutLineColor = '#ff0000',
        cutPointColor = '#00ff00';

    var canvas = document.getElementById('folded'),
        unfoldCanvas = document.getElementById('unfolded'),
        undoButton = document.getElementById('undo'),
        redoButton = document.getElementById('redo');

    var ctx = canvas.getContext('2d'),
        unfoldCtx = unfoldCanvas.getContext('2d');

    var folded = Flake.makeFolded(canvas.width / 2, canvas.height / 2, canvas.width * 0.9, 2 * Math.PI / 12),
        cut = Flake.newCut();

    // Scale the unfold canvas - it should have enough space to contain the folded flake, oriented any direction, twice (since the unfolded
    // snowflake will have a max width twice the folded snowflake's height), and add about 10% so it has some space on either side.
    var scaleFactor = Math.min(unfoldCanvas.width, unfoldCanvas.height) / Math.max(folded.getDimensions().x, folded.getDimensions().y) / 2 / 1.1;
    unfoldCtx.scale(scaleFactor, scaleFactor);

    // calculate the center of the new scaled canvas so we can center the snowflake there
    var unfoldCtr = { x: unfoldCanvas.width / 2 / scaleFactor, y: unfoldCanvas.height / 2 / scaleFactor };

    var fudgeStrokeWidth = 2 / scaleFactor;

    function redraw() {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        folded.display(ctx, flakeColor);

        unfoldCtx.fillStyle = bgColor;
        unfoldCtx.fillRect(-unfoldCanvas.width / scaleFactor, -unfoldCanvas.height / scaleFactor, unfoldCanvas.width / scaleFactor * 2, unfoldCanvas.height / scaleFactor * 2);

        // fudgeStrokeWidth makes sure the stroke around the snowflake is about 2 pixels wide when drawn on our scaled canvas
        folded.displayUnfolded(unfoldCtr.x, unfoldCtr.y, unfoldCtx, flakeColor, fudgeStrokeWidth);

        cut.display(ctx, cutPointColor, cutLineColor);
    }

    function foldedContains(pt) {
        folded.prepareStroke(ctx);
        return ctx.isPointInPath(pt.x, pt.y);
    }

    undoButton.onclick = function() {
        if (cut.isStarted()) {
            cut = Flake.newCut();
        } else {
            folded.undo();
        }
        redraw();
    };

    redoButton.onclick = function() {
        folded.redo();
        redraw();
    };

    redraw();

    canvas.addEventListener('mousedown', function(e) {
        var numInt;
        var point = { x: 0, y: 0 };
        do {
            point.x += e.offsetX;
            point.y += e.offsetY;
        } while (e = e.offsetParent);

        if (!cut.validate(point)) {
            return;
        }

        if (cut.getLength() < 2 && !foldedContains(point)) {
            cut = Flake.newCut();
            cut.add(point);
        } else if (cut.getLength() > 0) {
            // If we've already added points to the cut, we can tell what should happen
            // based on how many times it's crossed the boundaries of the folded shape.
            cut.add(point);
            numInt = folded.countIntersections(cut.getPoints());
            if (numInt < 1) {
                // The cut hasn't crossed INTO the folded - start a new cut.
                cut = Flake.newCut();
                cut.add(point);
            }
            if (numInt === 2) {
                // The cut crossed OUT of the folded - complete the cut.
                folded.cut(cut.getPoints());
                cut = Flake.newCut();
            }
            if (numInt > 2) {
                // Adding this point to the cut made it both pass out AND back in.
                // To keep the cutting algorithm sane, disallow this.
                cut.pop();
            }
        }

        redraw();
        return;
    });
};

window.onload = function() {
    Flake.startUI();
};

