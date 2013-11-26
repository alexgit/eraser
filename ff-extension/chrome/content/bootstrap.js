var myExtension = {
    init: function() {
        if(gBrowser) {
          gBrowser.addEventListener('DOMContentLoaded', this.onPageLoad, false);
        }
    },
    onPageLoad: function(aEvent) {
        var doc = aEvent.originalTarget; // doc is document that triggered the event
        var win = doc.defaultView; // win is the window for the doc            

        eraser(doc, win);
        gBrowser.removeEventListener('DOMContentLoaded', this.onPageLoad, false);
    }
};

window.addEventListener('load', function load(event){
    window.removeEventListener('load', load, false);
    myExtension.init();
}, false);

