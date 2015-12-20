var Flake = Flake || {};

Flake.makeTriangle = function(height, angle) {
    var base = 2 * (Math.tan(angle / 2) * height);

    return {
        display: function(x, y, ctx) {
                     ctx.fillStyle = '#aaaaaa';
                     ctx.beginPath(); 
                     ctx.moveTo(x, y);
                     ctx.lineTo(x, base + y); 
                     ctx.lineTo(height + x, 0.5 * base + y);
                     ctx.fill();
                 },
        getDimensions: function() {
                                  return { x: height, y: base };
                              },
        };
};

Flake.makeCuttable = function(triangle, translate) {
    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        dims = triangle.getDimensions();

    canvas.setAttribute('width', dims.x);
    canvas.setAttribute('height', dims.y);

    triangle.display(0, 0, ctx);

    ctx.translate(translate.x, translate.y);

    document.body.appendChild(canvas);

    return {
        cut: function(path) {
             var oldCompositeOperation = ctx.globalCompositeOperation,
                 i;
                 ctx.globalCompositeOperation = 'destination-out';

                 ctx.beginPath();
                 ctx.moveTo(path[0].x, path[0].y);
                 for (i = 1; i < path.length; i++) {
                    console.log(path[i].x);
                    ctx.lineTo(path[i].x, path[i].y); 
                 }

                 ctx.fillStyle = 'rgba(0, 0, 0, 1)';
                 ctx.fill();

                 ctx.globalCompositeOperation = oldCompositeOperation;
            },
        display: function(x, y, drawCtx) {
                     drawCtx.drawImage(canvas, x, y);
                 },
        contains: function(x, y) {
                      x += translate.x;
                      y += translate.y;
                      return ctx.getImageData(x, y, 1, 1).data[3] > 0;
                },
        cut2: function(x, y) {
                  var i, j,
                    d = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
                    o = [],
                    currentColumn = [];
                  return;

                  for (i = 0; i < canvas.width; i++) {
                      for (j = 0; j < canvas.height; j++) {
                          currentColumn.push([d[i * j * 4], d[i * j * 4 + 1], d[i * j * 4 + 2]]);
                      }
                      o.push(currentColumn);
                      currentColumn = [];
                  }
                  console.log(o);
              }
   };
};

Flake.startUI = function(canvas, cuttable) {
     
};

Flake.newCut = function() {
    var snips = [];
    return {
        canFinish: function() {
                       console.log(snips.length);
                       return snips.length > 1;
                   },
        getSnips: function() {
                      return snips.slice(); 
                  },
        add: function(cut) {
                      snips.push(cut);
                  },
        isStarted: function() {
                        console.log(snips);
                        return snips.length > 0;
                   }
    };
};

window.onload = function() {
    
    var canvas = document.getElementsByTagName('canvas')[0],
        ctx = canvas.getContext('2d'),
        width = canvas.width,
        height = canvas.height,
        
        triangle = Flake.makeTriangle(width * 0.9, 2 * Math.PI / 12),
        foldedX = width * 0.05,
        foldedY = height / 2 - triangle.getDimensions().y / 2,
        cuttable = Flake.makeCuttable(triangle, { x: -foldedX, y: -foldedY });

    function resetDisplay() {
        ctx.fillStyle = '#061d2b'; 
        ctx.fillRect(0, 0, width, height);
        cuttable.display(foldedX, foldedY, ctx);
    }

    function markCut(x, y) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    resetDisplay();

    var cut = Flake.newCut();

    canvas.addEventListener('mousedown', function(e) {
        console.log('mousedown');
        var x = 0, y = 0;
        do {
            x += e.offsetX;
            y += e.offsetY;
        } while (e = e.offsetParent);
       

        cuttable.cut2(x, y); 
        if (cuttable.contains(x, y)) {
            if (cut.isStarted()) {
                cut.add({ x: x, y: y });
                markCut(x, y);
            }
        } else {
            if (cut.canFinish()) {
                cut.add({ x: x, y: y });
                cuttable.cut(cut.getSnips());
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
};


