function eraser(document, window) {
  "use strict";
  
  function SiteMemory() {
    var localStorage = window.localStorage;
    var siteData = localStorage.getItem('siteMemory');
    if(!siteData) {
      siteData = '[]';
      localStorage.setItem('siteMemory', siteData);
    }

    var memory = JSON.parse(siteData);
        
    this.save = function() {
      localStorage.setItem('siteMemory', JSON.stringify(memory));
    };

    this.add = function(selector) {
      memory.push(selector);
      this.save();
    };

    this.remove = function(index) {
      memory.splice(index, 1);
      this.save();
    };

    this.hideRememberedForSite = function() {  
      for (var i = 0; i < memory.length; i++) {        
        var elementSelector = memory[i];              
        var element = document.querySelector(elementSelector);

        if(element) {          
          hide(element);
        }
      }
    };

    this.restore = function() {
      memory = [];
      this.save();
    };

    this.toString = function() {
      return memory.toString();
    };
  }

  function Rectangle(topLeft, topRight, bottomLeft, bottomRight) {
    if(arguments.length == 1) {
      var boundingRect = arguments[0].getBoundingClientRect();

      return new Rectangle(
        { x: boundingRect.left, y: boundingRect.top },
        { x: boundingRect.right, y: boundingRect.top },
        { x: boundingRect.left, y: boundingRect.bottom },
        { x: boundingRect.right, y: boundingRect.bottom }
      );
    }

    this.topLeft = topLeft;
    this.topRight = topRight;
    this.bottomLeft = bottomLeft;
    this.bottomRight = bottomRight;
  }        

  Rectangle.prototype.intersects = function(rectangle) {
    return !(this.topRight.x < rectangle.topLeft.x ||
            rectangle.topRight.x < this.topLeft.x ||
            this.bottomLeft.y < rectangle.topLeft.y ||
            rectangle.bottomLeft.y < this.topLeft.y);
  };

  Rectangle.prototype.contains = function(rectangle) {      
    return (rectangle.topLeft.x > this.topLeft.x && rectangle.topLeft.y > this.topLeft.y) &&
      (rectangle.topRight.x < this.topRight.x && rectangle.topRight.y > this.topRight.y) &&
      (rectangle.bottomLeft.x > this.bottomLeft.x && rectangle.bottomLeft.y < this.bottomLeft.y) &&
      (rectangle.bottomRight.x < this.bottomRight.x && rectangle.bottomRight.y < this.bottomRight.y);       
  };
  
  Rectangle.prototype.enclosedElements = function() {      
    var el = document.elementFromPoint(this.topLeft.x, this.topLeft.y);
    var topLevelElement = getTopLevelElement(el);
    return this.getContainedChildren(topLevelElement);
  };

  Rectangle.prototype.flipVertical = function() {
    var oldTopLeft = this.topLeft, oldTopRight = this.topRight;
    this.topLeft = this.bottomLeft;
    this.topRight = this.bottomRight;
    this.bottomLeft = oldTopLeft;
    this.bottomRight = oldTopRight;
  };

  Rectangle.prototype.flipHorizontal = function() {
    var oldTopLeft = this.topLeft, oldBottomLeft = this.bottomLeft;
    this.topLeft = this.topRight;
    this.bottomLeft = this.bottomRight;
    this.topRight = oldTopLeft;
    this.bottomRight = oldBottomLeft;
  };

  Rectangle.prototype.getContainedChildren = function(element, results) {
    if(!element.children || !element.children.length) {       
      return [];
    }

    results = results || [];
    var that = this;

    for (var i = 0; i < element.children.length; i++) {
      var child = element.children[i];
      var rectangle = new Rectangle(child);

      if(that.intersects(rectangle)) {
        if(that.contains(rectangle)) {            
          results.push(child);
        } else {
          results.concat(that.getContainedChildren(child, results));
        }
      }
    }
    
    return results;
  };
  
  function SelectionRectangle(x, y) {
    this.startX = x;
    this.startY = y;

    var div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.border = '1px solid red';
    div.style.zIndex = '9999999';
    div.style.left = x + 'px';
    div.style.top = y + window.scrollY + 'px';    
    div.style.display = 'block';
    
    document.body.appendChild(div);

    this.update = function(mouseMoveEvent) {
      var width = Math.abs(mouseMoveEvent.pageX - this.startX);
      var height = Math.abs(mouseMoveEvent.pageY - this.startY);

      var newLeft = mouseMoveEvent.pageX < this.startX ? (this.startX - width) : this.startX;
      var newTop = mouseMoveEvent.pageY < this.startY ? (this.startY - height) : this.startY;
      
      div.style.width = width + 'px';
      div.style.height = height + 'px';
      div.style.left = ++newLeft + 'px';
      div.style.top = ++newTop + 'px';
    }.bind(this);

    this.destroy = function() {
      div.parentNode.removeChild(div);      
    };
  }
      
  function TextSelectionToggle() {
    var css = document.createElement('style');    
    css.type = 'text/css';
    document.body.appendChild(css);

    this.enable = function() {
      css.innerHTML = 'body { -moz-user-select: text; -webkit-user-select: text; }';
    };

    this.disable = function() {
      css.innerHTML = 'body { -moz-user-select: none; -webkit-user-select: none; }'; 
    };
  }

  function getTopLevelElement(el) {
    var parent = el.parentNode;
    while(parent && parent !== document.body) {
      el = parent;
      parent = el.parentNode;
    }

    return el;
  }

  function getSelector(element) {
    var names = [];
    while (element.parentNode) {
      if (element.id) {
        names.unshift('#' + element.id);
        break;
      } else {
        if (element == element.ownerDocument.documentElement) {
          names.unshift(element.tagName);
        }
        else {
          for (var c = 1, e = element; e.previousElementSibling; e = e.previousElementSibling, c++) {
            names.unshift(element.tagName + ':nth-child(' + c + ')');
          }            
        }
        element = element.parentNode;
      }
    }
    return names.join(' > ');
  }

  function hideElements(elements, remember) {
    var hideFunc = remember ? rememberHide : hide;
    for(var i = 0; i < elements.length; i++) {
      hideFunc(elements[i]);
    }    
  }

  function hide(element) {    
    element.style.display = 'none';
  }

  function rememberHide(element) {    
    hide(element);     
    siteMemory.add(getSelector(element));
  }
  
  function highlightElement(element) {
    var oldBackground = element.style.backgroundColor;
    element.style.backgroundColor = 'rgba(255,0,0,0.5)';
    element.undoHighlight = function() { 
      element.style.backgroundColor = oldBackground; 
      return element;
    };
    return element;
  }

  function listenOnce(event, action) {
    window.addEventListener(event, function actionWrapper(e) {
      window.removeEventListener(event, actionWrapper, false);
      action(e);
    }, false);
  }

  function listen(event, action) {
    window.addEventListener(event, action, false);
  }  

  var textSelection = new TextSelectionToggle();  
  var startX, startY;  

  listen('mousedown', function(mousedown) {      
    if(!mousedown.ctrlKey) {
      return;
    }    

    startX = mousedown.clientX;
    startY = mousedown.clientY;    
          
    function getEnclosedElements(endX, endY) {          
      var rectangle = new Rectangle(
        { x: startX, y: startY },
        { x: endX, y: startY },
        { x: startX, y: endY },
        { x: endX, y: endY }
      );  

      if(endY < startY) {
        rectangle.flipVertical();
      }

      if(endX < startX) {
        rectangle.flipHorizontal();
      }       

      return rectangle.enclosedElements();      
    }

    var enclosedElements = [],      
      timeoutId = 0;

    function highlightOnMouseStopped(mousemove) {
      clearTimeout(timeoutId);

      enclosedElements.forEach(function(element) {
        element.undoHighlight();
      });

      timeoutId = setTimeout(function() {               
        enclosedElements = getEnclosedElements(mousemove.clientX, mousemove.clientY);
        enclosedElements.forEach(function(element) {
          highlightElement(element);
        });
      }, 100);
    }

    textSelection.disable();
    var selectionRectangle = new SelectionRectangle(mousedown.pageX, mousedown.pageY);

    listen('mousemove', selectionRectangle.update);
    listen('mousemove', highlightOnMouseStopped);

    listenOnce('mouseup', function (mouseup) {    
      clearTimeout(timeoutId);

      window.removeEventListener('mousemove', selectionRectangle.update, false);
      window.removeEventListener('mousemove', highlightOnMouseStopped, false);

      textSelection.enable();
      selectionRectangle.destroy();

      if(enclosedElements.length) {
        hideElements(enclosedElements, mouseup.shiftKey);
      }
    });
  });      

  listen('mouseup', function(mouseup) {    
    if(!mouseup.ctrlKey || startX != mouseup.clientX || startY != mouseup.clientY) {
      return;
    }    

    var selectedElement = document.elementFromPoint(mouseup.clientX - 1, mouseup.clientY - 1),
      stack = [selectedElement];

    highlightElement(selectedElement);

    function highlightOnWheel(e) {
      var scrollingUp = e.deltaY < 0;

      if(scrollingUp) {
        if(selectedElement.parentElement) {
          highlightElement(selectedElement.parentElement);
          stack.push(selectedElement);
          selectedElement = selectedElement.parentElement;
        }
      } else {
        if(stack.length > 1) {
          selectedElement.undoHighlight();
          selectedElement = stack.pop();
        }
      }

      e.preventDefault();
      return false;
    }

    function cancelOnEsc(e) {
      if(e.keyCode == '27') { // esc
        window.removeEventListener('keyup', cancelOnEsc, false);
        stack.forEach(function(element) {
          element.undoHighlight();
        });
        selectedElement.undoHighlight();
        selectedElement = null;
      }
    }

    listen('wheel', highlightOnWheel);
    listen('keyup', cancelOnEsc);
    listenOnce('mouseup', function(e) {
      window.removeEventListener('wheel', highlightOnWheel, false);
      window.removeEventListener('keyup', cancelOnEsc, false);

      if(selectedElement) {
        hideElements([selectedElement], e.shiftKey);
      }
    });    
  });
  
  var hotkeys = {
    '75' : function() { // ctrl + k
      siteMemory.restore();
      window.location.reload();  
    },
    '76' : function() { // ctrl + l
      alert(siteMemory.toString());  
    }
  };

  listen('keydown', function(e) {    
    if(e.ctrlKey) {
      var action = hotkeys[e.keyCode];
      if(action) {
        action.call();
        e.preventDefault();
        return false;  
      }
    }    
  });

  var siteMemory = new SiteMemory();
  siteMemory.hideRememberedForSite();
}